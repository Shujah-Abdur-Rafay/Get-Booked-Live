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

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { offer_id } = await req.json();
    if (!offer_id) {
      return new Response(JSON.stringify({ error: "offer_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch offer
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offer_id)
      .single();

    if (offerErr || !offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is the recipient (artist)
    if (offer.recipient_id !== claims.user.id) {
      return new Response(JSON.stringify({ error: "Only the offer recipient can request a contract review" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles
    const [artistRes, promoterRes] = await Promise.all([
      supabase.from("profiles").select("display_name, subscription_plan").eq("user_id", offer.recipient_id).single(),
      supabase.from("profiles").select("display_name").eq("user_id", offer.sender_id).single(),
    ]);

    const artistName = artistRes.data?.display_name ?? "Artist";
    const promoterName = promoterRes.data?.display_name ?? "Promoter";
    const plan = artistRes.data?.subscription_plan ?? "free";

    const commissionRate = plan === "agency" ? 0.06 : plan === "pro" ? 0.10 : 0.20;
    const guarantee = Number(offer.guarantee);
    const commission = Math.floor(guarantee * commissionRate);
    const artistNet = guarantee - commission;

    const offerSummary = `
LIVE MUSIC PERFORMANCE CONTRACT TERMS:
- Artist: ${artistName}
- Promoter: ${promoterName}
- Venue: ${offer.venue_name}
- Event Date: ${offer.event_date}
- Event Time: ${offer.event_time || "TBD"}
- Guarantee: $${guarantee.toLocaleString()}
- Door Split: ${offer.door_split ? offer.door_split + "%" : "None"}
- Merch Split: ${offer.merch_split ? offer.merch_split + "%" : "None"}
- Platform Commission: ${(commissionRate * 100).toFixed(0)}% ($${commission.toLocaleString()})
- Artist Net Payout: $${artistNet.toLocaleString()}
- Hospitality: ${offer.hospitality || "Not specified"}
- Backline: ${offer.backline || "Not specified"}
- Notes: ${offer.notes || "None"}
- Standard deposit: 50% within 14 days
- Cancellation policy: 30+ days = full refund, 15-29 days = 50% retained, <15 days = non-refundable
    `.trim();

    const systemPrompt = `You are a music industry contract analyst specializing in live performance agreements. You protect artists' interests while maintaining fair dealing standards. Respond ONLY with valid JSON matching the required schema. Do not include any text outside the JSON.`;

    const userPrompt = `Analyze these live music performance contract terms and provide a comprehensive review.

${offerSummary}

Respond with this exact JSON structure:
{
  "health_score": <number 0-100>,
  "score_label": "<string: Excellent|Good|Fair|Needs Attention|Risky>",
  "flags": [
    {"severity": "<high|medium|low>", "issue": "<brief description>", "detail": "<explanation>"}
  ],
  "suggested_clauses": [
    {"title": "<clause name>", "text": "<full clause text to add>", "reason": "<why this protects the artist>"}
  ],
  "missing_terms": [
    {"term": "<term name>", "importance": "<critical|important|recommended>", "description": "<what should be included>"}
  ],
  "summary": "<2-3 sentence overall assessment>"
}

Guidelines:
- Score 80-100 for standard industry terms with good protections
- Score 50-79 for acceptable but could be improved
- Score below 50 for significant gaps or concerning terms
- Flag guarantees below $500 for established venues
- Check if deposit terms, cancellation, force majeure, payment timeline, sound/lighting requirements, and liability terms exist
- Suggest 3 protective clauses the artist should consider adding
- Be specific with suggested clause text — make them copy-pasteable`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (handle markdown code blocks)
    let review;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/```\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      review = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      // Return a fallback review
      review = {
        health_score: 65,
        score_label: "Fair",
        flags: [{ severity: "medium", issue: "AI analysis incomplete", detail: "The automated review could not fully parse. Please review terms manually." }],
        suggested_clauses: [],
        missing_terms: [],
        summary: "Unable to complete full automated analysis. Manual review recommended.",
      };
    }

    return new Response(JSON.stringify(review), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("review-contract error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
