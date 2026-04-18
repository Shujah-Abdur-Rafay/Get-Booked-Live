import { Mic2, Users, Building2, Wrench, Camera, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const ROLES = [
  { icon: Users, label: "Promoter", color: "#FF5C8A", desc: "Books the artist and secures the venue" },
  { icon: Mic2, label: "Artist", color: "#C8FF3E", desc: "Performs and brings the audience" },
  { icon: Building2, label: "Venue", color: "#FFB83E", desc: "Provides the space and infrastructure" },
  { icon: Wrench, label: "Production", color: "#7B5CF0", desc: "Delivers sound, lights, and staging" },
  { icon: Camera, label: "Creative", color: "#3EC8FF", desc: "Captures and creates the content" },
];

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function BuildShowSection() {
  return (
    <section className="fade-in-section py-16 sm:py-28 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <span className="section-label">the full picture</span>
          <h2 className="section-heading">build an entire show in one place</h2>
          <p className="section-subtext mx-auto">
            from artist booking to production and content creation — everything you need to execute a live event.
          </p>
        </div>

        {/* Flow cards */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-1">
          {ROLES.map((role, i) => (
            <div key={role.label} className="flex items-center gap-1 sm:gap-1">
              <motion.div
                className="rounded-2xl border border-white/[0.08] bg-card/80 p-5 sm:p-6 text-center w-full sm:w-[160px]"
                style={{ borderTop: `2px solid ${role.color}` }}
                variants={cardVariants}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.07, duration: 0.35, ease: "easeOut" }}
                whileHover={{ y: -2 }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: `${role.color}12` }}
                >
                  <role.icon className="w-4 h-4" style={{ color: role.color }} />
                </div>
                <p className="text-xs font-display font-bold text-foreground lowercase mb-1">{role.label}</p>
                <p className="text-[10px] text-muted-foreground font-body leading-[1.5]">{role.desc}</p>
              </motion.div>
              {i < ROLES.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground font-body mt-10 max-w-md mx-auto">
          one platform. one contract. one deal room for everyone.
        </p>
      </div>
    </section>
  );
}
