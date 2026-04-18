import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Stripe secret key is configured
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured. Please contact support.");
    }

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !data.user?.email) {
      throw new Error("User not authenticated. Please sign in and try again.");
    }

    const user = data.user;

    // Parse request body
    const body = await req.json();
    const { priceId } = body;
    if (!priceId) throw new Error("priceId is required");

    // Validate price ID is one of our known prices
    const validPrices = [
      "price_1TDz0XRard5VqoGDEZumRzPp", // Pro monthly $29
      "price_1TDz0TRard5VqoGDql9FySVQ",  // Business monthly $79
      "price_1TGYHuRard5VqoGD6dTwv6wl",  // Pro yearly $276
      "price_1TGYHvRard5VqoGDT1uvbcdz",  // Business yearly $756
    ];
    if (!validPrices.includes(priceId)) {
      throw new Error("Invalid price ID");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://getbookedlive.lovable.app";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("create-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
