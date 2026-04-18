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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const manusApiKey = Deno.env.get("MANUS_API_KEY");
    const manusApiUrl = Deno.env.get("MANUS_API_URL");

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { artist_id, event_city, event_date, venue_name, event_type, notes } = await req.json();

    if (!artist_id) {
      return new Response(JSON.stringify({ error: "artist_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch artist profile
    const { data: artist } = await supabase
      .from("profiles")
      .select("display_name, genre, city, state, rate_min, rate_max, bookscore, bio")
      .eq("user_id", artist_id)
      .single();

    // Fetch promoter profile
    const { data: promoter } = await supabase
      .from("profiles")
      .select("display_name, city, state, subscription_plan")
      .eq("user_id", user.id)
      .single();

    // Fetch recent market data — similar bookings
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("guarantee, venue_name, event_date")
      .order("created_at", { ascending: false })
      .limit(20);

    const avgGuarantee = recentBookings?.length
      ? Math.round(recentBookings.reduce((s, b) => s + (b.guarantee || 0), 0) / recentBookings.length)
      : 1500;

    // Create AI task
    const { data: taskRow } = await supabase.from("ai_tasks").insert({
      related_entity_type: "offer_generation",
      related_entity_id: artist_id,
      provider: "manus",
      task_type: "generate_offer",
      input_payload: { artist_id, event_city, event_date, venue_name, event_type, notes },
      status: "processing",
    }).select("id").single();

    if (!manusApiKey || !manusApiUrl) {
      // Fallback: generate a simple offer suggestion without AI
      const suggestion = {
        venue_name: venue_name || "TBD",
        event_date: event_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        guarantee: Math.max(artist?.rate_min || 500, Math.min(artist?.rate_max || 5000, avgGuarantee)),
        door_split: 15,
        merch_split: 100,
        notes: `Booking request for ${artist?.display_name || "artist"} at ${venue_name || "venue"}.`,
        reasoning: "Generated using market averages and artist fee range (AI service not configured).",
      };

      await supabase.from("ai_tasks").update({
        status: "completed",
        output_payload: suggestion,
        completed_at: new Date().toISOString(),
      }).eq("id", taskRow?.id);

      return new Response(JSON.stringify(suggestion), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an AI booking agent for a live music marketplace. A promoter wants to send an offer to an artist. Generate optimal offer terms.

Artist Profile:
- Name: ${artist?.display_name || "Unknown"}
- Genre: ${artist?.genre || "Not specified"}
- Location: ${artist?.city || "Unknown"}, ${artist?.state || ""}
- Fee Range: $${artist?.rate_min || 0} - $${artist?.rate_max || "negotiable"}
- BookScore: ${artist?.bookscore || "N/A"}

Promoter Profile:
- Name: ${promoter?.display_name || "Unknown"}
- Location: ${promoter?.city || "Unknown"}

Event Details:
- City: ${event_city || "Not specified"}
- Date: ${event_date || "Not specified"}
- Venue: ${venue_name || "Not specified"}
- Type: ${event_type || "General"}
- Notes: ${notes || "None"}

Market Context:
- Average recent guarantee: $${avgGuarantee}

Return a JSON object with:
{
  "guarantee": number (suggested offer amount in dollars),
  "door_split": number (percentage for artist, 0-100),
  "merch_split": number (percentage artist keeps, 0-100),
  "notes": "Professional message from promoter to artist",
  "reasoning": "Why these terms are fair for both parties",
  "confidence": number 0-1
}

Only return JSON, no other text.`;

    const manusResponse = await fetch(manusApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${manusApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert music booking negotiator. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!manusResponse.ok) {
      await supabase.from("ai_tasks").update({
        status: "failed",
        error_message: `Manus API error: ${manusResponse.status}`,
        completed_at: new Date().toISOString(),
      }).eq("id", taskRow?.id);

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const manusData = await manusResponse.json();
    const content = manusData.choices?.[0]?.message?.content || "{}";

    let suggestion: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse generate-offer response:", content);
    }

    suggestion.venue_name = venue_name || suggestion.venue_name || "TBD";
    suggestion.event_date = event_date || suggestion.event_date;

    await supabase.from("ai_tasks").update({
      status: "completed",
      output_payload: suggestion,
      completed_at: new Date().toISOString(),
    }).eq("id", taskRow?.id);

    await supabase.from("activity_logs").insert({
      actor_type: "manus",
      actor_id: user.id,
      action_type: "offer_generated",
      entity_type: "offer_generation",
      entity_id: taskRow?.id,
      metadata: { artist_id, guarantee: suggestion.guarantee },
    });

    return new Response(JSON.stringify(suggestion), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-offer error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
