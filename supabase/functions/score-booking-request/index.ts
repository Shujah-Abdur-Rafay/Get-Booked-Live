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

    if (!manusApiKey || !manusApiUrl) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { offer_id } = await req.json();

    if (!offer_id) {
      return new Response(JSON.stringify({ error: "offer_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the offer details
    const { data: offer } = await supabase.from("offers").select("*").eq("id", offer_id).single();
    if (!offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sender profile
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name, city, state, subscription_plan, bookscore")
      .eq("user_id", offer.sender_id)
      .single();

    // Fetch sender's past booking history
    const { data: senderBookings, count: bookingCount } = await supabase
      .from("bookings")
      .select("id, status, guarantee", { count: "exact" })
      .eq("promoter_id", offer.sender_id);

    const completedBookings = (senderBookings || []).filter((b: any) => b.status === "completed").length;
    const totalSpent = (senderBookings || []).reduce((s: number, b: any) => s + (b.guarantee || 0), 0);

    // Create AI task
    const { data: taskRow } = await supabase.from("ai_tasks").insert({
      related_entity_type: "offer",
      related_entity_id: offer_id,
      provider: "manus",
      task_type: "score_booking_request",
      input_payload: { offer, senderProfile, bookingCount, completedBookings, totalSpent },
      status: "processing",
    }).select("id").single();

    const prompt = `You are an AI booking quality analyst. Score this booking request on quality and risk.

Offer Details:
- Venue: ${offer.venue_name}
- Date: ${offer.event_date}
- Guarantee: $${offer.guarantee}
- Door Split: ${offer.door_split || "N/A"}%
- Merch Split: ${offer.merch_split || "N/A"}%

Promoter Profile:
- Name: ${senderProfile?.display_name || "Unknown"}
- Location: ${senderProfile?.city || "Unknown"}, ${senderProfile?.state || ""}
- Plan: ${senderProfile?.subscription_plan || "free"}
- BookScore: ${senderProfile?.bookscore || "N/A"}
- Past Bookings: ${bookingCount || 0} (${completedBookings} completed)
- Total Spent: $${totalSpent}

Respond with a JSON object:
{
  "quality_score": number 0-100,
  "risk_level": "low" | "medium" | "high",
  "risk_flags": ["array of specific concerns"],
  "pricing_assessment": "below_market" | "fair" | "above_market",
  "summary": "2-3 sentence summary for the artist reviewing this offer",
  "recommendation": "accept" | "negotiate" | "caution"
}

Only return the JSON object, no other text.`;

    const manusResponse = await fetch(manusApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${manusApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert music industry booking analyst. Always respond with valid JSON only." },
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

    let score: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      score = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse score response:", content);
    }

    await supabase.from("ai_tasks").update({
      status: "completed",
      output_payload: score,
      completed_at: new Date().toISOString(),
    }).eq("id", taskRow?.id);

    await supabase.from("activity_logs").insert({
      actor_type: "manus",
      action_type: "booking_scored",
      entity_type: "offer",
      entity_id: offer_id,
      metadata: { quality_score: score.quality_score, risk_level: score.risk_level },
    });

    return new Response(JSON.stringify(score), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("score-booking-request error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
