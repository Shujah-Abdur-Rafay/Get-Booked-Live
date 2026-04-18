import { motion } from "framer-motion";

const DIFFERENTIATORS = [
  {
    emoji: "🗺",
    title: "tour management",
    color: "#7B5CF0",
    desc: "Plan multi-city runs from one hub. Budget, crew, logistics, and contracts — connected across every stop.",
    bullets: [
      "Interactive itinerary with day-of timelines",
      "Crew manifests and ground transport",
      "Budget tracking per stop and overall",
    ],
  },
  {
    emoji: "🧠",
    title: "AI-powered booking",
    color: "#C8FF3E",
    desc: "Describe what you need and our AI finds the best-fit artists. Flash bids fill open dates in real time.",
    bullets: [
      "AI agent matches genre, budget, and market",
      "Flash bids with countdown auctions",
      "Market rate intelligence for fair offers",
    ],
  },
  {
    emoji: "🎫",
    title: "fan economy",
    color: "#FF5C8A",
    desc: "Presale signups, attendance tracking, and show content marketplace — turn every show into recurring revenue.",
    bullets: [
      "Presale capture and demand signals",
      "Verified attendance analytics per show",
      "Photo marketplace for fan content",
    ],
  },
];

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function WhatMakesDifferentSection() {
  return (
    <section className="fade-in-section py-16 sm:py-28 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <span className="section-label">why getbooked?</span>
          <h2 className="section-heading">what makes us different</h2>
          <p className="section-subtext mx-auto">
            purpose-built tools no generic platform can offer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DIFFERENTIATORS.map((d, i) => (
            <motion.div
              key={d.title}
              className="rounded-2xl border border-white/[0.06] bg-card/80 p-6 sm:p-7"
              style={{ borderTop: `2px solid ${d.color}` }}
              variants={cardVariants}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.35, ease: "easeOut" }}
            >
              <span className="text-2xl block mb-3">{d.emoji}</span>
              <h3 className="font-display font-bold text-sm text-foreground lowercase mb-2">{d.title}</h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed mb-5">{d.desc}</p>
              <ul className="space-y-2">
                {d.bullets.map((b) => (
                  <li key={b} className="text-[11px] text-foreground/70 font-body flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: d.color }} />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
