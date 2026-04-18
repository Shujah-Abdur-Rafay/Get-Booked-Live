import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is called by pg_cron — verify via dedicated CRON_SECRET (not the public anon key)
  const cronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all availability entries where flash bid deadline has passed and flash_bid_enabled is true
    const now = new Date().toISOString();
    const { data: expiredSlots, error: slotErr } = await supabase
      .from("artist_availability")
      .select("id, artist_id, date, flash_bid_min_price")
      .eq("flash_bid_enabled", true)
      .lte("flash_bid_deadline", now);

    if (slotErr) throw slotErr;
    if (!expiredSlots || expiredSlots.length === 0) {
      return new Response(JSON.stringify({ resolved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolved = 0;

    for (const slot of expiredSlots) {
      // Get all active bids for this slot, ordered by amount desc
      const { data: bids } = await supabase
        .from("flash_bids")
        .select("id, bidder_id, amount")
        .eq("availability_id", slot.id)
        .eq("status", "active")
        .order("amount", { ascending: false });

      // Disable flash bid on this slot regardless
      await supabase
        .from("artist_availability")
        .update({
          flash_bid_enabled: false,
          flash_bid_deadline: null,
        })
        .eq("id", slot.id);

      if (!bids || bids.length === 0) {
        resolved++;
        continue;
      }

      const winner = bids[0];
      const losers = bids.slice(1);

      // Mark winner bid as 'won'
      await supabase
        .from("flash_bids")
        .update({ status: "won" })
        .eq("id", winner.id);

      // Mark loser bids as 'lost'
      if (losers.length > 0) {
        await supabase
          .from("flash_bids")
          .update({ status: "lost" })
          .in("id", losers.map((b) => b.id));
      }

      // Get artist profile for display name
      const { data: artistProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", slot.artist_id)
        .single();

      const artistName = artistProfile?.display_name ?? "Artist";

      // Create an offer from the winning bidder to the artist
      const { error: offerErr } = await supabase.from("offers").insert({
        sender_id: winner.bidder_id,
        recipient_id: slot.artist_id,
        venue_name: "Flash Bid Booking",
        event_date: slot.date,
        guarantee: winner.amount,
        status: "pending",
        notes: `Auto-generated from Flash Bid. Winning bid: $${winner.amount.toLocaleString()}.`,
      });

      if (offerErr) {
        console.error("Failed to create offer for flash bid winner:", offerErr);
      }

      // Notify winner
      await supabase.from("notifications").insert({
        user_id: winner.bidder_id,
        title: "🎉 You won the Flash Bid!",
        message: `Your bid of $${winner.amount.toLocaleString()} for ${artistName} on ${slot.date} won! An offer has been created.`,
        type: "flash_bid",
        link: "/dashboard",
      });

      // Notify artist
      await supabase.from("notifications").insert({
        user_id: slot.artist_id,
        title: "⚡ Flash Bid resolved",
        message: `Your Flash Bid for ${slot.date} ended with a winning bid of $${winner.amount.toLocaleString()}. Check your offers.`,
        type: "flash_bid",
        link: "/dashboard",
      });

      // Find next available date for losing bidders
      const { data: nextAvail } = await supabase
        .from("artist_availability")
        .select("date")
        .eq("artist_id", slot.artist_id)
        .eq("is_available", true)
        .gt("date", slot.date)
        .order("date", { ascending: true })
        .limit(1);

      const nextDateMsg = nextAvail && nextAvail.length > 0
        ? ` Next available date: ${nextAvail[0].date}.`
        : "";

      // Notify losers
      for (const loser of losers) {
        await supabase.from("notifications").insert({
          user_id: loser.bidder_id,
          title: "Flash Bid ended",
          message: `Your bid of $${loser.amount.toLocaleString()} for ${artistName} on ${slot.date} was outbid. Winning bid: $${winner.amount.toLocaleString()}.${nextDateMsg}`,
          type: "flash_bid",
          link: "/directory",
        });
      }

      resolved++;
    }

    return new Response(JSON.stringify({ resolved, slots: expiredSlots.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("flash-bid-resolve error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
