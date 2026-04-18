import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Loader2, Settings, Clock, Zap, TrendingDown, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STRIPE_TIERS = {
  pro: {
    monthly_price_id: "price_1TDz0XRard5VqoGDEZumRzPp",
    yearly_price_id: "price_1TGYHuRard5VqoGD6dTwv6wl",
    product_id: "prod_UCNmzyxcl7E3JD",
  },
  business: {
    monthly_price_id: "price_1TDz0TRard5VqoGDql9FySVQ",
    yearly_price_id: "price_1TGYHvRard5VqoGDT1uvbcdz",
    product_id: "prod_UCNmSg0DRrBwAN",
  },
};

const PLANS = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: "forever",
    desc: "Get started and explore the platform.",
    commission: "20%",
    features: ["3 offers per month", "20% commission on bookings", "Basic profile page", "In-app notifications"],
    cta: "Get started",
    highlight: false,
    tier: "free" as const,
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    yearlyPrice: 23,
    unit: "/month",
    desc: "For working artists and active promoters.",
    commission: "10%",
    features: ["7-day free trial", "Unlimited offers", "10% commission on bookings", "Verified badge", "Deal rooms & contracts", "Income smoothing", "Priority support"],
    cta: "Start free trial",
    highlight: true,
    tier: "pro" as const,
  },
  {
    name: "Agency",
    monthlyPrice: 99,
    yearlyPrice: 79,
    unit: "/month",
    desc: "For agencies, venues, and power users.",
    commission: "5-7%",
    features: ["Up to 25 artist profiles", "5-7% commission", "Team seats & permissions", "White-label contracts", "Dedicated account manager", "API access"],
    cta: "Contact us",
    highlight: false,
    tier: "business" as const,
  },
];

export default function Pricing() {
  const ref = useRef<HTMLDivElement>(null);
  const { user, profile, subscription, checkSubscription } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Default to yearly (aggressive yearly push)
  const [yearly, setYearly] = useState(true);

  const isTrial = subscription?.is_trial === true;
  const trialDaysLeft = subscription?.trial_days_remaining ?? 0;

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (data) setIsAdmin(true);
    });
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Subscription activated! Welcome aboard.");
      checkSubscription();
      window.history.replaceState({}, "", "/pricing");
    } else if (params.get("canceled") === "true") {
      toast("Checkout canceled. No charges were made.");
      window.history.replaceState({}, "", "/pricing");
    }
  }, [checkSubscription]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("animate-reveal-up"); observer.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    el.querySelectorAll("[data-reveal]").forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  const currentPlan = isAdmin ? "admin" : (profile?.subscription_plan || "free");

  const handleCheckout = async (tier: "pro" | "business") => {
    if (!user) {
      window.location.href = "/auth?tab=signup";
      return;
    }

    setLoadingTier(tier);
    try {
      const priceId = yearly
        ? STRIPE_TIERS[tier].yearly_price_id
        : STRIPE_TIERS[tier].monthly_price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open subscription management");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div ref={ref} className="min-h-screen pt-24 px-4 pb-16">
      <SEO
        title="Pricing — GetBooked.Live | Free, Pro & Agency Plans"
        description="Start free with a 7-day Pro trial. Pro plan from $23/month (billed yearly) or $29/month — cuts your commission from 20% to 10%. One booking pays for itself."
        canonical="https://www.getbooked.live/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "GetBooked.Live Pricing",
          description: "Start free with a 7-day Pro trial. Pro plan from $23/month (billed yearly) or $29/month — cuts your commission from 20% to 10%.",
          url: "https://www.getbooked.live/pricing",
          mainEntity: {
            "@type": "PriceSpecification",
            priceCurrency: "USD",
            price: "29.00",
            description: "Pro plan (yearly) — 10% commission, unlimited offers, verified badge",
          },
        }}
      />
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <span className="section-label">pricing</span>
          <h1 data-reveal className="opacity-0 section-heading">simple, transparent pricing</h1>
          <p data-reveal className="opacity-0 section-subtext mx-auto" style={{ animationDelay: "80ms" }}>
            Every new account starts with a <span className="text-primary font-semibold">7-day Pro trial</span>.
          </p>
        </div>

        {/* Trial banner */}
        {isTrial && trialDaysLeft > 0 && (
          <div data-reveal className="opacity-0 mb-8 flex justify-center">
            <div className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-center flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-primary font-syne font-bold text-sm">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left on your Pro trial
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Subscribe now to keep Pro features and 10% commission after your trial ends.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Yearly/Monthly toggle — Yearly shown first and selected by default */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center rounded-full border border-white/[0.08] p-1 bg-secondary/40">
            <button
              onClick={() => setYearly(true)}
              className={`text-xs font-display font-bold px-5 py-2 rounded-full transition-all ${
                yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              yearly
            </button>
            <button
              onClick={() => setYearly(false)}
              className={`text-xs font-display font-bold px-5 py-2 rounded-full transition-all ${
                !yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              monthly
            </button>
            {yearly && (
              <span className="ml-2 mr-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div data-reveal className="opacity-0 mb-8 flex justify-center">
            <div className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-primary font-syne font-bold text-sm">admin — all access</p>
              <p className="text-[10px] text-muted-foreground mt-1">you have full platform access as an administrator</p>
            </div>
          </div>
        )}

        {subscription?.subscribed && !isTrial && (
          <div data-reveal className="opacity-0 mb-8 flex justify-center">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="border-primary/30 text-primary hover:bg-primary/10 active:scale-[0.97] transition-transform"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
              Manage Subscription
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrentPlan = !isTrial && currentPlan === plan.tier;
            const isTrialPro = isTrial && plan.tier === "pro";
            const isLoading = loadingTier === plan.tier;
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const monthlySavings = plan.monthlyPrice - plan.yearlyPrice;

            return (
              <div
                key={plan.name}
                data-reveal
                className={`relative opacity-0 rounded-2xl p-7 border transition-all duration-300 ${
                  plan.highlight
                    ? "bg-primary/[0.04] border-primary/[0.35]"
                    : "bg-card border-border hover:border-border/80"
                } ${isCurrentPlan ? "ring-2 ring-primary/50" : ""} ${isTrialPro ? "ring-2 ring-[#3EFFBE]/50" : ""}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {isCurrentPlan && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3EFFBE] text-[#080C14] text-[10px] font-display font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full">Your Plan</span>
                )}
                {isTrialPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3EFFBE] text-[#080C14] text-[10px] font-display font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full">
                    Trial — {trialDaysLeft}d left
                  </span>
                )}
                {plan.highlight && !isCurrentPlan && !isTrialPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-display font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full">popular</span>
                )}

                <p className="text-xs text-muted-foreground font-display uppercase tracking-wider mb-3">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`font-display font-black text-[42px] leading-none ${plan.highlight ? "text-primary" : "text-foreground"}`}>
                    ${price}
                  </span>
                  <span className="text-[13px] text-muted-foreground font-body">{plan.unit}</span>
                </div>
                {yearly && monthlySavings > 0 && (
                  <p className="text-[11px] text-primary/70 mb-1">
                    Save ${monthlySavings * 12}/year vs monthly
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-6">
                  Commission: <span className="text-primary font-semibold">{plan.commission}</span>
                </p>

                <div className="border-t border-white/[0.06] my-5" />

                {plan.tier === "free" ? (
                  <Link to={user ? "#" : "/auth?tab=signup"}>
                    <button
                      disabled={isCurrentPlan}
                      className={`w-full h-11 rounded-[10px] text-sm font-display font-bold transition-all active:scale-[0.96] mb-7 border border-white/[0.1] text-foreground hover:bg-secondary ${isCurrentPlan ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isCurrentPlan ? "Current plan" : plan.cta}
                    </button>
                  </Link>
                ) : (
                  <button
                    disabled={isCurrentPlan || isLoading}
                    onClick={() => handleCheckout(plan.tier)}
                    className={`w-full h-11 rounded-[10px] text-sm font-display font-bold transition-all active:scale-[0.96] mb-7 ${
                      plan.highlight
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-white/[0.1] text-foreground hover:bg-secondary"
                    } ${isCurrentPlan || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                    ) : isCurrentPlan ? (
                      "Current plan"
                    ) : isTrialPro ? (
                      "Subscribe to keep Pro"
                    ) : (
                      plan.cta
                    )}
                  </button>
                )}

                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-[13px] text-foreground/80 font-body">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* How the 14-day trial works */}
        {!user && (
          <div data-reveal className="opacity-0 mt-14 mb-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-8">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
                  <Zap className="w-3 h-3" /> how the trial works
                </span>
                <h2 className="font-display font-bold text-xl text-foreground">Pro free for 7 days.</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    icon: Zap,
                    step: "1",
                    title: "Sign up — get Pro instantly",
                    desc: "Create your account and your 7-day Pro trial starts immediately.",
                  },
                  {
                    icon: ShieldCheck,
                    step: "2",
                    title: "Use every Pro feature",
                    desc: "Deal Rooms, standard contracts, 10% commission, verified badge — everything unlocked for 7 days.",
                  },
                  {
                    icon: TrendingDown,
                    step: "3",
                    title: "Stay free or subscribe",
                    desc: "After 7 days you drop to the Free tier automatically. No surprise charges. Upgrade any time.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-[11px] font-display font-bold text-primary">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-display font-bold text-foreground mb-1">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link to="/auth?tab=signup">
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-display font-bold transition-all active:scale-[0.97] hover:bg-primary/90">
                    Start your free trial
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <p className="text-[10px] text-muted-foreground mt-2">No credit card required · Cancel anytime</p>
              </div>
            </div>
          </div>
        )}

        {/* Trust signals */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              emoji: "🔒",
              title: "Secure payments",
              desc: "All transactions processed by Stripe with bank-level encryption.",
            },
            {
              emoji: "📋",
              title: "Auto-generated contracts",
              desc: "Every booking creates a legally-binding contract automatically.",
            },
            {
              emoji: "⭐",
              title: "Verified profiles",
              desc: "BookScore built from real booking history, not self-reported.",
            },
          ].map((item) => (
            <div
              key={item.title}
              data-reveal
              className="opacity-0 rounded-xl border border-white/[0.06] bg-card p-5 flex items-start gap-3.5"
            >
              <span className="text-xl leading-none shrink-0 mt-0.5">{item.emoji}</span>
              <div>
                <p className="text-[13px] font-display font-bold text-foreground mb-0.5">{item.title}</p>
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
