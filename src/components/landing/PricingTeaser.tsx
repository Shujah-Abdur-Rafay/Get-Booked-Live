// FIX 4: Added "No credit card required" below the Pro plan CTA button.
// FIX 8: Added payment security trust strip above the pricing cards.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: "forever",
    popular: false,
    features: [
      "3 offers per month",
      "20% commission on bookings",
      "Basic profile page",
      "In-app notifications",
    ],
    cta: "Get started",
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    yearlyPrice: 23,
    unit: "/month",
    popular: true,
    features: [
      "Unlimited offers",
      "10% commission on bookings",
      "Verified badge",
      "Deal rooms & contracts",
      "Income smoothing",
      "Priority support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Agency",
    monthlyPrice: 99,
    yearlyPrice: 79,
    unit: "/month",
    popular: false,
    features: [
      "Up to 25 artist profiles",
      "5-7% commission",
      "Team seats & permissions",
      "White-label contracts",
      "Dedicated account manager",
      "API access",
    ],
    cta: "Contact us",
  },
];

export default function PricingTeaser() {
  // Default to yearly to encourage annual subscriptions
  const [yearly, setYearly] = useState(true);

  return (
    <section className="fade-in-section py-16 sm:py-32 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <span className="section-label">pricing</span>
          <h2 className="section-heading">simple plans.</h2>
          <p className="section-subtext mx-auto">
            Every new account gets a <span className="text-primary font-semibold">7-day Pro trial</span>.
          </p>
        </div>

        {/* Toggle — yearly shown first and selected by default */}
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

        {/* FIX 8: Payment security trust strip */}
        <div className="flex items-center justify-center gap-8 flex-wrap py-6 border-y border-white/[0.06] my-8">
          {[
            { icon: '🔒', text: 'Payments secured by Stripe' },
            { icon: '📋', text: 'Auto-generated contracts' },
            { icon: '✅', text: 'Verified profiles only' },
            { icon: '💸', text: 'Transparent payout — see your fee before accepting' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[#8892A4]">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const monthlySavings = plan.monthlyPrice - plan.yearlyPrice;
            return (
              <div
                key={plan.name}
                className={`fade-in-section relative rounded-2xl p-7 border ${
                  plan.popular
                    ? "bg-primary/[0.04] border-primary/[0.35]"
                    : "bg-card/80 border-white/[0.06]"
                }`}
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-display font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full">
                    popular
                  </span>
                )}

                <p className="text-xs text-muted-foreground font-display uppercase tracking-wider mb-3">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`font-display font-black text-[42px] leading-none ${plan.popular ? "text-primary" : "text-foreground"}`}>
                    ${price}
                  </span>
                  <span className="text-[13px] text-muted-foreground font-body">{plan.unit}</span>
                </div>
                {yearly && monthlySavings > 0 && (
                  <p className="text-[11px] text-primary/70 mb-1">
                    Save ${monthlySavings * 12}/year vs monthly
                  </p>
                )}

                <div className="border-t border-white/[0.06] my-5" />

                <ul className="space-y-3 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-[13px] text-foreground/80 font-body">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.name === "Agency" ? "/pricing" : "/auth?tab=signup"}>
                  <button
                    className={`w-full h-11 rounded-[10px] text-sm font-display font-bold transition-all active:scale-[0.96] ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-white/[0.1] text-foreground hover:bg-secondary"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </Link>
                {/* FIX 4: No credit card required text under Pro plan CTA */}
                {plan.popular && (
                  <p className="text-xs text-[#5A6478] text-center mt-2">No credit card required</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
