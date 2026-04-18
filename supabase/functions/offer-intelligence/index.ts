import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { artist_id, venue_city, genre } = await req.json();
    if (!artist_id) {
      return new Response(JSON.stringify({ error: "artist_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: only the artist themselves or users with an offer relationship can query
    if (artist_id !== userId) {
      const { data: rel } = await supabase
        .from("offers")
        .select("id")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .or(`sender_id.eq.${artist_id},recipient_id.eq.${artist_id}`)
        .limit(1);
      if (!rel?.length) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 1. Fetch artist's accepted offer history
    const { data: acceptedOffers } = await supabase
      .from("bookings")
      .select("guarantee, event_date, venue_name")
      .eq("artist_id", artist_id)
      .order("event_date", { ascending: false })
      .limit(50);

    // 2. Fetch all offers sent to this artist (for acceptance rate)
    const { data: allOffers } = await supabase
      .from("offers")
      .select("guarantee, status, created_at")
      .eq("recipient_id", artist_id)
      .limit(100);

    // 3. Fetch market comps — other bookings in same genre/city
    let marketQuery = supabase
      .from("bookings")
      .select("guarantee, event_date")
      .neq("artist_id", artist_id)
      .order("event_date", { ascending: false })
      .limit(30);

    // We can't filter bookings by genre directly, so we'll pass the raw data to AI

    const { data: marketBookings } = await marketQuery;

    // Build context for AI
    const guarantees = (acceptedOffers || []).map((b) => Number(b.guarantee));
    const avgGuarantee = guarantees.length > 0 ? Math.round(guarantees.reduce((a, b) => a + b, 0) / guarantees.length) : null;
    const minGuarantee = guarantees.length > 0 ? Math.min(...guarantees) : null;
    const maxGuarantee = guarantees.length > 0 ? Math.max(...guarantees) : null;

    const totalOffers = (allOffers || []).length;
    const acceptedCount = (allOffers || []).filter((o) => o.status === "accepted").length;
    const declinedCount = (allOffers || []).filter((o) => o.status === "declined").length;
    const acceptanceRate = totalOffers > 0 ? Math.round((acceptedCount / totalOffers) * 100) : null;

    // Offers by price bracket
    const brackets: Record<string, { total: number; accepted: number }> = {};
    for (const o of allOffers || []) {
      const g = Number(o.guarantee);
      const bracket = g < 1000 ? "under_1000" : g < 2500 ? "1000_2500" : g < 5000 ? "2500_5000" : "5000_plus";
      if (!brackets[bracket]) brackets[bracket] = { total: 0, accepted: 0 };
      brackets[bracket].total++;
      if (o.status === "accepted") brackets[bracket].accepted++;
    }

    const marketGuarantees = (marketBookings || []).map((b) => Number(b.guarantee));
    const marketAvg = marketGuarantees.length > 0 ? Math.round(marketGuarantees.reduce((a, b) => a + b, 0) / marketGuarantees.length) : null;

    const prompt = `You are a booking intelligence assistant for a live music marketplace. Analyze the following data and provide a concise pricing recommendation.

Artist Booking History:
- Total accepted bookings: ${guarantees.length}
- Average guarantee: ${avgGuarantee ? "$" + avgGuarantee : "No data"}
- Range: ${minGuarantee ? "$" + minGuarantee + " – $" + maxGuarantee : "No data"}
- Recent guarantees (newest first): ${guarantees.slice(0, 5).map((g) => "$" + g).join(", ") || "None"}

Offer Response History:
- Total offers received: ${totalOffers}
- Accepted: ${acceptedCount}, Declined: ${declinedCount}
- Overall acceptance rate: ${acceptanceRate !== null ? acceptanceRate + "%" : "No data"}
- By price bracket: ${JSON.stringify(brackets)}

Market Context:
- Genre: ${genre || "Unknown"}
- Venue city: ${venue_city || "Unknown"}
- Market average guarantee (all genres): ${marketAvg ? "$" + marketAvg : "No data"}

Respond with a JSON object (no markdown) with these fields:
- "suggested_low": number (low end of suggested range)
- "suggested_high": number (high end of suggested range)
- "acceptance_likelihood": number (0-100, estimated % chance of acceptance in suggested range)
- "summary": string (1-2 sentence recommendation mentioning specific data points)
- "confidence": "high" | "medium" | "low" (based on data availability)

If there's insufficient data, still provide reasonable estimates based on available market data, but set confidence to "low".`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (strip markdown fences if present)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        suggested_low: avgGuarantee ? Math.round(avgGuarantee * 0.85) : 1000,
        suggested_high: avgGuarantee ? Math.round(avgGuarantee * 1.15) : 3000,
        acceptance_likelihood: acceptanceRate ?? 50,
        summary: "Insufficient data for a precise recommendation. Consider the artist's listed rate range.",
        confidence: "low",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("offer-intelligence error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
