import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function FinalCTA() {
  return (
    <section className="fade-in-section py-20 sm:py-32 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/[0.06] blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-2xl text-center relative z-10">
        <motion.h2
          className="font-display font-extrabold text-foreground mb-4"
          style={{ fontSize: "clamp(28px, 4.5vw, 48px)", lineHeight: "1.1" }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Your next show starts here.
        </motion.h2>

        <motion.p
          className="text-base text-white/40 font-body mb-8 max-w-md mx-auto"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          Join free — no credit card. First booking in minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Link to="/auth?tab=signup">
            <motion.button
              className="bg-primary text-primary-foreground font-display font-bold text-sm rounded-xl px-10 h-12 hover:bg-primary/90 transition-all inline-flex items-center gap-2 shadow-[0_0_32px_hsl(var(--primary)/0.35)]"
              whileHover={{ scale: 1.03, boxShadow: "0 0 44px hsl(var(--primary)/0.5)" }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap className="w-4 h-4" /> Join GetBooked.Live
            </motion.button>
          </Link>
        </motion.div>

        <motion.p
          className="text-[11px] text-white/20 font-body mt-5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          no credit card · free plan forever · 7-day pro trial included
        </motion.p>
      </div>
    </section>
  );
}
