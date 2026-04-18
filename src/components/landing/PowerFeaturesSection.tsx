import { Users, FileText, BarChart3, Calendar, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Users,
    title: "Artist Directory",
    desc: "Browse verified profiles with genre, draw history, fee range, and BookScore — find the right artist in seconds.",
    color: "#C8FF3E",
  },
  {
    icon: FileText,
    title: "Offer Management",
    desc: "Structured offers with guarantee, splits, hospitality, and backline. Accept, counter, or decline in one click.",
    color: "#FF5C8A",
  },
  {
    icon: BarChart3,
    title: "Deal Tracking Dashboard",
    desc: "Private deal rooms per booking with contracts, milestones, real-time chat, and payment tracking.",
    color: "#3EC8FF",
  },
  {
    icon: Calendar,
    title: "Availability Calendar",
    desc: "Publish open dates, receive booking requests, and enable Flash Bidding for last-minute slots.",
    color: "#FFB83E",
  },
  {
    icon: MessageSquare,
    title: "Messaging & Negotiation",
    desc: "In-context negotiation threads per offer. Counter-offers, rider discussions, and contract reviews — all in one place.",
    color: "#7B5CF0",
  },
];

export default function PowerFeaturesSection() {
  return (
    <section className="fade-in-section py-20 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <span className="section-label">core features</span>
          <h2 className="section-heading">everything you need to run live events</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="group rounded-2xl p-6 bg-card/80 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ y: -3 }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}12` }}
                >
                  <Icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-display font-bold text-sm text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* FIX 7: CTA after features section */}
        <div className="text-center mt-10">
          <p className="text-[#8892A4] text-sm mb-4">Ready to replace your booking chaos?</p>
          <a
            href="/auth?mode=signup"
            className="inline-block px-8 py-4 bg-[#C8FF3E] text-[#080C14] rounded-2xl text-sm font-black hover:opacity-90 transition-opacity"
          >
            Start free — no credit card →
          </a>
        </div>
      </div>
    </section>
  );
}
