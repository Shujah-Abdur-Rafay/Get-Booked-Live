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

    const { stops } = await req.json();
    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 tour stops required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stopsSummary = stops.map((s: any, i: number) =>
      `${i + 1}. ${s.venue_name} — ${s.city || "?"}, ${s.state || "?"} — ${s.date}`
    ).join("\n");

    const systemPrompt = `You are a tour logistics optimizer for live music. Respond ONLY with valid JSON matching the schema. Think about drive distances between U.S. cities, optimal ordering to minimize total travel, and gap dates between shows.`;

    const userPrompt = `Optimize this tour routing. Current stop order:

${stopsSummary}

Respond with this exact JSON:
{
  "optimized_order": [
    {"original_index": <0-based>, "venue_name": "...", "city": "...", "state": "...", "date": "...", "travel_mode": "drive|fly", "distance_miles": <number>, "drive_hours": <number>, "reason": "..."}
  ],
  "gap_opportunities": [
    {"between_stops": [<idx1>, <idx2>], "gap_date": "YYYY-MM-DD", "nearby_city": "...", "suggestion": "..."}
  ],
  "total_current_miles": <number>,
  "total_optimized_miles": <number>,
  "savings_pct": <number>,
  "fly_vs_drive_threshold": "Fly if over 500 miles or 8+ hours drive",
  "summary": "..."
}

Rules:
- Use fly for distances over 500 miles between stops
- Flag gap dates of 2+ days between stops as opportunities
- Estimate rough distances between major U.S. cities
- Keep chronological date order — reorder cities to dates if possible`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    let result;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/```\s*([\s\S]*?)```/);
      result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
    } catch {
      result = { error: "Failed to parse optimization result", raw: content.substring(0, 500) };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("optimize-tour error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
