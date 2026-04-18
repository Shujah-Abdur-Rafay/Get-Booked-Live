import { motion } from "framer-motion";
import { Megaphone, Mic2, FileText, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";

const LOOP_STEPS = [
  {
    icon: Megaphone,
    label: "Promoter",
    sublabel: "posts a show",
    color: "#FF5C8A",
    glow: "rgba(255,92,138,0.3)",
  },
  {
    icon: Mic2,
    label: "Artist",
    sublabel: "receives offer",
    color: "#C8FF3E",
    glow: "rgba(200,255,62,0.3)",
  },
  {
    icon: FileText,
    label: "Offer",
    sublabel: "terms locked in",
    color: "#FFB83E",
    glow: "rgba(255,184,62,0.3)",
  },
  {
    icon: CheckCircle,
    label: "Acceptance",
    sublabel: "deal signed",
    color: "#3EC8FF",
    glow: "rgba(62,200,255,0.3)",
  },
  {
    icon: RefreshCw,
    label: "Repeat",
    sublabel: "network grows",
    color: "#C8FF3E",
    glow: "rgba(200,255,62,0.3)",
  },
];

const NETWORK_STATS = [
  { value: "2,400+", label: "Artists" },
  { value: "18K+", label: "Deals Sent" },
  { value: "47", label: "Cities Active" },
  { value: "4.8★", label: "Avg Rating" },
];

export default function CoreLoopSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 md:px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/[0.04] blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-display font-bold tracking-[0.2em] uppercase text-primary/70 mb-3">
            how the ecosystem connects
          </p>
          <h2 className="font-display font-extrabold text-[clamp(26px,4vw,44px)] text-foreground lowercase tracking-[-0.02em] leading-[1.1]">
            a self-reinforcing network effect
          </h2>
          <p className="text-sm text-white/40 font-body mt-3 max-w-md mx-auto leading-relaxed">
            every booking creates reputation. every reputation attracts more bookings. the loop never stops.
          </p>
        </motion.div>

        {/* Loop visualization */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 mb-16 flex-wrap">
          {LOOP_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === LOOP_STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center gap-2 sm:gap-0">
                <motion.div
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.4 }}
                >
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border"
                    style={{
                      borderColor: `${step.color}30`,
                      backgroundColor: `${step.color}0D`,
                    }}
                    whileHover={{
                      scale: 1.08,
                      boxShadow: `0 0 32px ${step.glow}`,
                      borderColor: `${step.color}60`,
                      backgroundColor: `${step.color}18`,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: step.color }} />
                  </motion.div>
                  <p className="text-[11px] font-display font-bold" style={{ color: step.color }}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-white/35 font-body text-center max-w-[72px]">
                    {step.sublabel}
                  </p>
                </motion.div>

                {/* Arrow connector */}
                {!isLast && (
                  <motion.div
                    className="mx-1 sm:mx-3 text-white/20"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 + 0.2, duration: 0.3 }}
                  >
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Repeat arrow back to start */}
        <motion.div
          className="flex items-center justify-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <div className="flex items-center gap-3 bg-primary/[0.06] border border-primary/20 rounded-full px-5 py-2">
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-display font-bold text-primary/80 tracking-wide">
              every show builds your reputation and attracts the next one
            </span>
          </div>
        </motion.div>

        {/* Network stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {NETWORK_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              whileHover={{ borderColor: "rgba(200,255,62,0.2)", backgroundColor: "rgba(200,255,62,0.03)" }}
            >
              <p className="font-display font-extrabold text-2xl sm:text-3xl text-primary tabular-nums">
                {stat.value}
              </p>
              <p className="text-[11px] text-white/40 font-body uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
