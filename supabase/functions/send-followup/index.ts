import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Can be called by cron (x-cron-secret) or authenticated user
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    const isCron = cronSecret === Deno.env.get("CRON_SECRET");

    if (!isCron && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isCron) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader! } } }
      );
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(
        authHeader!.replace("Bearer ", "")
      );
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const marblismApiKey = Deno.env.get("MARBLISM_API_KEY");
    const marblismApiUrl = Deno.env.get("MARBLISM_API_URL");

    if (!marblismApiKey || !marblismApiUrl) {
      return new Response(JSON.stringify({ error: "Follow-up service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find offers pending > 48 hours with no response
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: staleOffers } = await supabase
      .from("offers")
      .select("id, recipient_id, sender_id, venue_name, event_date, guarantee, created_at")
      .eq("status", "pending")
      .lt("created_at", twoDaysAgo)
      .limit(20);

    if (!staleOffers || staleOffers.length === 0) {
      return new Response(JSON.stringify({ message: "No stale offers to follow up on", count: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let followUpCount = 0;

    for (const offer of staleOffers) {
      // Check if we already sent a follow-up for this offer
      const { data: existingTask } = await supabase
        .from("ai_tasks")
        .select("id")
        .eq("related_entity_type", "offer")
        .eq("related_entity_id", offer.id)
        .eq("task_type", "send_followup")
        .limit(1);

      if (existingTask && existingTask.length > 0) continue;

      // Fetch artist name
      const { data: artistProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", offer.recipient_id)
        .single();

      // Call Marblism to generate follow-up message
      const prompt = `Generate a friendly, professional follow-up message for an artist who hasn't responded to a booking offer.

Details:
- Artist: ${artistProfile?.display_name || "Artist"}
- Venue: ${offer.venue_name}
- Date: ${offer.event_date}
- Guarantee: $${offer.guarantee}
- Sent: ${new Date(offer.created_at).toLocaleDateString()}

Keep it brief (2-3 sentences), warm, and non-pushy. Return only the message text.`;

      try {
        const marblismResponse = await fetch(marblismApiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${marblismApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You write concise, friendly booking follow-up messages for a music marketplace." },
              { role: "user", content: prompt },
            ],
            stream: false,
          }),
        });

        if (!marblismResponse.ok) {
          console.error(`Marblism error for offer ${offer.id}:`, marblismResponse.status);
          continue;
        }

        const marblismData = await marblismResponse.json();
        const messageBody = marblismData.choices?.[0]?.message?.content || "";

        if (!messageBody) continue;

        // Create notification for the artist
        await supabase.from("notifications").insert({
          user_id: offer.recipient_id,
          type: "follow_up",
          title: "Reminder: You have a pending offer",
          message: messageBody,
          link: "/dashboard",
        });

        // Log AI task
        await supabase.from("ai_tasks").insert({
          related_entity_type: "offer",
          related_entity_id: offer.id,
          provider: "marblism",
          task_type: "send_followup",
          input_payload: { offer_id: offer.id, artist_name: artistProfile?.display_name },
          output_payload: { message: messageBody },
          status: "completed",
          completed_at: new Date().toISOString(),
        });

        // Log activity
        await supabase.from("activity_logs").insert({
          actor_type: "marblism",
          action_type: "followup_sent",
          entity_type: "offer",
          entity_id: offer.id,
          metadata: { recipient_id: offer.recipient_id },
        });

        followUpCount++;
      } catch (err) {
        console.error(`Error processing follow-up for offer ${offer.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ message: `Sent ${followUpCount} follow-ups`, count: followUpCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-followup error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
