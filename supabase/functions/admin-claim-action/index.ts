import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw new Error("Forbidden: not an admin");

    const body = await req.json();
    const { action } = body;

    // Handle admin role management
    if (action === "grant_admin" || action === "remove_admin") {
      const { user_id } = body;
      if (!user_id) throw new Error("Missing user_id");

      if (action === "grant_admin") {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", "admin");
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle claim actions
    const { claim_id, rejection_reason } = body;
    if (!claim_id || !["approve", "reject"].includes(action)) {
      throw new Error("Invalid payload");
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateErr } = await supabaseAdmin
      .from("artist_claims")
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq("id", claim_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
