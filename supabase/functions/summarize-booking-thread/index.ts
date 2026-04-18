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
    const { offer_id } = await req.json();

    if (!offer_id) {
      return new Response(JSON.stringify({ error: "offer_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the offer
    const { data: offer } = await supabase.from("offers").select("*").eq("id", offer_id).single();
    if (!offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is a party to the offer
    if (offer.sender_id !== user.id && offer.recipient_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch counter offers (negotiation history)
    const { data: counters } = await supabase
      .from("counter_offers")
      .select("*")
      .eq("offer_id", offer_id)
      .order("created_at", { ascending: true });

    // Fetch sender + recipient profiles
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("user_id", offer.sender_id)
      .single();

    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("user_id", offer.recipient_id)
      .single();

    // Create AI task
    const { data: taskRow } = await supabase.from("ai_tasks").insert({
      related_entity_type: "offer",
      related_entity_id: offer_id,
      provider: "manus",
      task_type: "summarize_thread",
      input_payload: { offer_id },
      status: "processing",
    }).select("id").single();

    if (!manusApiKey || !manusApiUrl) {
      // Fallback summary without AI
      const counterCount = counters?.length || 0;
      const fallback = {
        summary: `Offer from ${senderProfile?.display_name || "promoter"} to ${recipientProfile?.display_name || "artist"} for ${offer.venue_name} on ${offer.event_date}. Guarantee: $${offer.guarantee}. Status: ${offer.status}. ${counterCount} counter-offer(s) exchanged.`,
        key_points: [
          `Original guarantee: $${offer.guarantee}`,
          counterCount > 0 ? `${counterCount} counter-offer(s) in negotiation` : "No counter-offers yet",
          `Current status: ${offer.status}`,
        ],
        next_steps: offer.status === "pending"
          ? "Awaiting response from the artist."
          : offer.status === "negotiating"
          ? "Parties are actively negotiating terms."
          : `Offer has been ${offer.status}.`,
      };

      await supabase.from("ai_tasks").update({
        status: "completed",
        output_payload: fallback,
        completed_at: new Date().toISOString(),
      }).eq("id", taskRow?.id);

      return new Response(JSON.stringify(fallback), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timeline = [
      `Original offer: $${offer.guarantee} at ${offer.venue_name} on ${offer.event_date}`,
      ...(counters || []).map((c: any, i: number) =>
        `Counter #${i + 1} (${c.sender_id === offer.sender_id ? "promoter" : "artist"}): $${c.guarantee}, date: ${c.event_date}, message: "${c.message || "none"}"`
      ),
    ];

    const prompt = `Summarize this booking negotiation thread for a music marketplace.

Parties:
- Sender (${senderProfile?.role || "promoter"}): ${senderProfile?.display_name || "Unknown"}
- Recipient (${recipientProfile?.role || "artist"}): ${recipientProfile?.display_name || "Unknown"}

Offer Status: ${offer.status}

Timeline:
${timeline.join("\n")}

Return a JSON object:
{
  "summary": "2-3 sentence plain English summary of the negotiation",
  "key_points": ["array of 3-5 bullet points"],
  "next_steps": "What should happen next",
  "sentiment": "positive" | "neutral" | "strained"
}

Only return JSON.`;

    const manusResponse = await fetch(manusApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${manusApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a music industry booking assistant. Always respond with valid JSON only." },
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

    let result: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse summary response:", content);
    }

    await supabase.from("ai_tasks").update({
      status: "completed",
      output_payload: result,
      completed_at: new Date().toISOString(),
    }).eq("id", taskRow?.id);

    await supabase.from("activity_logs").insert({
      actor_type: "manus",
      actor_id: user.id,
      action_type: "thread_summarized",
      entity_type: "offer",
      entity_id: offer_id,
      metadata: { sentiment: result.sentiment },
    });

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("summarize-booking-thread error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
