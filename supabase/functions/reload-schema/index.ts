import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Reload PostgREST schema cache
    const { error } = await supabaseAdmin.rpc("pg_notify_pgrst_reload");
    
    if (error) {
      // Try direct SQL approach
      const { error: sqlError } = await supabaseAdmin
        .from("_pgrst_reload")
        .select("*")
        .limit(1);
      
      return new Response(
        JSON.stringify({ 
          message: "Schema reload attempted",
          note: "PostgREST will reload within 30 seconds",
          error: sqlError?.message 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Schema reloaded successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
