/**
 * retry-payout/index.ts — Scheduled & manual payout retry handler
 * ─────────────────────────────────────────────────────────────────────────────
 * This edge function processes pending payout_failures.
 *
 * Call modes:
 *   POST {} with Authorization: Bearer <service_role>
 *     → Bulk mode: finds ALL pending failures where next_retry_at <= now()
 *       and retries each one up to max_retries times.
 *
 *   POST { "failure_id": "<uuid>" } with Authorization: Bearer <service_role>
 *     → Single mode: retries a specific failure row (for manual ops use).
 *
 * Schedule this function via pg_cron (run every hour):
 *   SELECT cron.schedule(
 *     'retry-payout-failures',
 *     '0 * * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/retry-payout',
 *       headers := '{"Authorization": "Bearer <service_role_key>"}',
 *       body := '{}'
 *     )$$
 *   );
 *
 * Security:
 *   - Only service_role JWT is accepted (same as send-email).
 *   - No user-facing route should be able to trigger this.
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { retryPayoutFailure, defaultLogger } from "../_shared/payouts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Auth guard (service_role or admin user) ───────────────────────────────

async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload?.role === "service_role") return true;
  } catch {
    // ignore parsing errors
  }

  // Not service_role, check if they are a valid admin user
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return false;

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return false;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: adminRecord } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return !!adminRecord;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const isAuthorized = await verifyAuth(req);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "Forbidden — service_role or admin required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Init clients ───────────────────────────────────────────────────────────
  const supabaseUrl     = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
    console.error("[retry-payout] missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-04-30.basil",
    typescript: true,
  });

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    // empty body is valid (bulk mode)
  }

  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE MODE — retry a specific failure_id
  // ─────────────────────────────────────────────────────────────────────────
  if (typeof body.failure_id === "string") {
    const failureId = body.failure_id;
    console.log(`[retry-payout] single mode — retrying failure ${failureId}`);

    try {
      const result = await retryPayoutFailure(stripe, supabase, failureId, defaultLogger);

      return new Response(
        JSON.stringify({
          mode:       "single",
          failure_id: failureId,
          result,
          elapsed_ms: Date.now() - startTime,
        }),
        {
          status: result.success ? 200 : 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[retry-payout] unhandled error in single mode:`, msg);
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BULK MODE — find all due retries and process them
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[retry-payout] bulk mode — scanning for due retries");

  const { data: dueFailures, error: fetchErr } = await supabase
    .from("payout_failures")
    .select("id, booking_id, retry_count, max_retries")
    .in("status", ["pending", "retrying"])
    .lte("next_retry_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(50); // process at most 50 per invocation to stay within timeout

  if (fetchErr) {
    console.error("[retry-payout] failed to fetch due failures", fetchErr.message);
    return new Response(
      JSON.stringify({ error: "Failed to fetch pending failures", details: fetchErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!dueFailures?.length) {
    console.log("[retry-payout] no due retries found");
    return new Response(
      JSON.stringify({ mode: "bulk", processed: 0, elapsed_ms: Date.now() - startTime }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[retry-payout] found ${dueFailures.length} due retries`);

  // Process sequentially to avoid Stripe rate-limit issues
  const results: Array<{
    failure_id: string;
    success: boolean;
    transfer_id?: string;
    error?: string;
    skipped?: boolean;
  }> = [];

  for (const failure of dueFailures) {
    console.log(`[retry-payout] processing failure ${failure.id} (attempt ${failure.retry_count + 1}/${failure.max_retries})`);

    try {
      const result = await retryPayoutFailure(stripe, supabase, failure.id, defaultLogger);
      results.push({
        failure_id:  failure.id,
        success:     result.success,
        transfer_id: result.transferId,
        skipped:     result.skipped,
        error:       result.errorMessage,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[retry-payout] unhandled error for failure ${failure.id}:`, msg);
      results.push({ failure_id: failure.id, success: false, error: msg });
    }

    // Small delay between transfers to be polite to Stripe's API
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed    = results.filter((r) => !r.success && !r.skipped).length;
  const skipped   = results.filter((r) => r.skipped).length;

  console.log(`[retry-payout] bulk complete — ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);

  return new Response(
    JSON.stringify({
      mode:       "bulk",
      processed:  dueFailures.length,
      succeeded,
      failed,
      skipped,
      results,
      elapsed_ms: Date.now() - startTime,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
