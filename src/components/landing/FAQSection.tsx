import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "How does the commission system work?",
    a: "Free accounts pay a 20% platform commission on confirmed bookings. Pro subscribers ($29/mo monthly, or $23/mo billed yearly) pay 10%, and Agency accounts ($99/mo monthly, or $79/mo billed yearly) pay just 5–7%. Commission is automatically calculated and deducted — no invoicing required.",
  },
  {
    q: "What happens after an offer is accepted?",
    a: "A Deal Room is created for both parties. It includes auto-generated contracts, milestone tracking, real-time chat, and logistics management. Both sides sign digitally, and payment is processed through Stripe.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes a full profile page, up to 3 offers per month, in-app notifications, and access to the directory. Upgrade to Pro for unlimited offers, lower commission, and premium features like income smoothing.",
  },
  {
    q: "How do I get verified?",
    a: "Verified badges are awarded to users who complete their profile, connect their Spotify (for artists), and maintain a BookScore above 80. You can also apply for manual verification through your settings.",
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="fade-in-section py-16 sm:py-28 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-14">
          <span className="section-label">FAQ</span>
          <h2 className="section-heading">got questions?</h2>
        </div>

        <div>
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            const num = String(i + 1).padStart(2, "0");
            return (
              <div key={i} className="border-b border-white/[0.06]">
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center gap-4 py-5 text-left group"
                >
                  <span className="text-[13px] font-display font-bold text-primary tabular-nums">{num}</span>
                  <span className="flex-1 text-[15px] font-display font-semibold text-foreground">{faq.q}</span>
                  <span className={`text-primary transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                    <Plus className="w-5 h-5" />
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? "200px" : "0px" }}
                >
                  <p className="text-[13px] text-muted-foreground font-body leading-[1.7] pl-10 pb-5">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
