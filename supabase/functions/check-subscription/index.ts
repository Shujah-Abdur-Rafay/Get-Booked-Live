import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header, returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed, returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    // Check trial status first via RPC
    const { data: trialData } = await supabaseClient.rpc("check_trial_status", {
      p_user_id: user.id,
    });
    const trialInfo = trialData as {
      is_trial: boolean;
      trial_active: boolean;
      trial_ends_at?: string;
      days_remaining?: number;
    } | null;
    logStep("Trial check", trialInfo);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // If trial is active, user is effectively subscribed (trial Pro)
      if (trialInfo?.trial_active) {
        logStep("Trial active, returning as subscribed (trial)");
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: null,
          subscription_end: trialInfo.trial_ends_at,
          is_trial: true,
          trial_days_remaining: trialInfo.days_remaining,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      productId = sub.items.data[0].price.product;
      logStep("Active subscription", { productId, subscriptionEnd });

      // Sync plan to profiles table (paid subscription overrides trial)
      const TIERS: Record<string, string> = {
        "prod_UBwiBhPDnrEdUZ": "pro",
        "prod_UBwjw5DHeMV0yo": "business",
      };
      const plan = TIERS[productId as string] || "free";
      // Clear trial_ends_at since user is now a paying subscriber
      await supabaseClient
        .from("profiles")
        .update({ subscription_plan: plan, trial_ends_at: null })
        .eq("user_id", user.id);
      logStep("Synced plan to profile (paid)", { plan });
    } else {
      logStep("No active subscription");
      // If trial is still active, keep them on Pro
      if (trialInfo?.trial_active) {
        logStep("Trial still active, keeping Pro");
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: null,
          subscription_end: trialInfo.trial_ends_at,
          is_trial: true,
          trial_days_remaining: trialInfo.days_remaining,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      // No active sub and no trial — reset to free
      await supabaseClient
        .from("profiles")
        .update({ subscription_plan: "free" })
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_trial: false,
      trial_days_remaining: 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
