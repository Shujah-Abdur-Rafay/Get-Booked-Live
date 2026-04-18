import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { offer_id, agent_rules } = await req.json();
    if (!offer_id || !agent_rules) {
      return new Response(JSON.stringify({ error: "offer_id and agent_rules required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: offer, error: offerErr } = await supabase
      .from("offers").select("*").eq("id", offer_id).single();
    if (offerErr || !offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure the caller is the offer recipient
    if (offer.recipient_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guarantee = Number(offer.guarantee);
    const rules = agent_rules;

    // Evaluate rules
    let decision: "auto_accept" | "auto_counter" | "manual_review" = "manual_review";
    const reasons: string[] = [];

    // Check auto-decline conditions
    if (rules.min_deposit_pct && rules.min_deposit_pct > 50) {
      reasons.push("Deposit policy not verifiable — flagged for review");
    }
    if (rules.min_venue_capacity && rules.min_venue_capacity > 0) {
      reasons.push(`Venue capacity check requested (min ${rules.min_venue_capacity})`);
    }

    // Check guarantee
    const meetsMinimum = guarantee >= (rules.min_guarantee || 0);
    const meetsTravel = !rules.require_travel || (offer.hospitality && offer.hospitality.toLowerCase().includes("travel"));
    const meetsHotel = !rules.require_hotel || (offer.hospitality && offer.hospitality.toLowerCase().includes("hotel"));

    if (meetsMinimum && meetsTravel && meetsHotel && reasons.length === 0) {
      decision = "auto_accept";
      reasons.push("All criteria met");
    } else if (!meetsMinimum && rules.counter_pct) {
      decision = "auto_counter";
      reasons.push(`Guarantee $${guarantee} below minimum $${rules.min_guarantee}`);
    } else {
      if (!meetsMinimum) reasons.push(`Guarantee $${guarantee} below minimum $${rules.min_guarantee}`);
      if (!meetsTravel) reasons.push("Travel coverage not confirmed");
      if (!meetsHotel) reasons.push("Hotel coverage not confirmed");
    }

    let counterMessage = "";
    let counterAmount = 0;

    if (decision === "auto_counter") {
      counterAmount = Math.ceil(guarantee * (1 + (rules.counter_pct || 20) / 100));
      if (counterAmount < (rules.min_guarantee || 0)) counterAmount = rules.min_guarantee;

      // Generate natural counter message with AI
      const { data: artistProfile } = await supabase
        .from("profiles").select("display_name").eq("user_id", offer.recipient_id).single();

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You write professional, friendly counter-offer messages for live music bookings. Keep it under 3 sentences. Sound human, not corporate." },
            { role: "user", content: `Artist "${artistProfile?.display_name || "the artist"}" received an offer of $${guarantee} for ${offer.venue_name} on ${offer.event_date}. Their minimum is $${rules.min_guarantee}. Generate a counter-offer message proposing $${counterAmount}. Be warm but firm.` },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        counterMessage = aiData.choices?.[0]?.message?.content || `We appreciate the offer! To make this work, we'd need the guarantee at $${counterAmount.toLocaleString()}.`;
      } else {
        counterMessage = `Thank you for the offer! After reviewing, we'd like to propose a guarantee of $${counterAmount.toLocaleString()} to cover costs and meet our requirements. Looking forward to making this show happen!`;
      }
    }

    return new Response(JSON.stringify({
      decision,
      reasons,
      counter_amount: counterAmount || null,
      counter_message: counterMessage || null,
      offer_summary: {
        guarantee,
        venue: offer.venue_name,
        date: offer.event_date,
        hospitality: offer.hospitality,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("booking-agent error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
