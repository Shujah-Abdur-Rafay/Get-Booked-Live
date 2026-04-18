import { Search, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    num: "01",
    icon: Search,
    title: "Discover Talent",
    desc: "Browse verified profiles by genre, city, and budget — or let our AI match you with the perfect artist.",
    color: "#C8FF3E",
  },
  {
    num: "02",
    icon: Send,
    title: "Send Offers",
    desc: "Send structured offers with guarantee, splits, and hospitality. No more email chains or DM chaos.",
    color: "#FF5C8A",
  },
  {
    num: "03",
    icon: CheckCircle2,
    title: "Close Deals",
    desc: "Auto-generated contracts, deal rooms, milestone tracking, and payments — all handled in one place.",
    color: "#3EC8FF",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="fade-in-section py-20 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <span className="section-label">how it works</span>
          <h2 className="section-heading">from search to show in 3 steps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-[#C8FF3E]/30 via-[#FF5C8A]/30 to-[#3EC8FF]/30" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                className="relative text-center"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
              >
                {/* Step number + icon */}
                <div className="relative inline-flex flex-col items-center mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${step.color}10`, border: `1px solid ${step.color}25` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest" style={{ color: step.color }}>
                    Step {step.num}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-[280px] mx-auto">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
