import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic2, Users, Building2, Wrench, Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─── */
type PersonaKey = "artist" | "promoter" | "venue" | "production" | "creative";
type Intent = "book" | "get" | "build";

interface Persona {
  color: string;
  icon: React.ElementType;
  label: string;
  badge: string;
  headline: string;
  subtext: string;
  cta: string;
  ctaLink: string;
  painTitle: string;
  pains: string[];
  features: { icon: string; name: string; desc: string }[];
  stats: string[];
}

/* ─── Persona data ─── */
const PERSONAS: Record<PersonaKey, Persona> = {
  artist: {
    color: "#C8FF3E", icon: Mic2, label: "Artist", badge: "built for artists — own your career",
    headline: "Own Your Bookings.\nOwn Your Career.",
    subtext: "Stop chasing gigs through DMs. Receive structured offers, negotiate in deal rooms, and get paid on time — all from one dashboard.",
    cta: "Join as Artist", ctaLink: "/auth?mode=signup&role=artist",
    painTitle: "Why artists switch to GetBooked.Live",
    pains: ["Chasing promoters through Instagram DMs", "No idea if an offer is fair for your market", "Contracts done on napkins or not at all", "Getting paid late — or not at all"],
    features: [
      { icon: "📩", name: "Offer inbox", desc: "Receive structured offers with all deal terms upfront" },
      { icon: "🤝", name: "Deal rooms", desc: "Negotiate, sign contracts, and track milestones in one place" },
      { icon: "📊", name: "BookScore™", desc: "Build your reputation with verified attendance and reviews" },
      { icon: "💰", name: "Income smoothing", desc: "Convert lumpy show income into predictable monthly pay" },
      { icon: "🗺", name: "Tour hub", desc: "Plan multi-city runs with crew, budget, and logistics built in" },
      { icon: "⚡", name: "Flash bids", desc: "Fill open dates by letting promoters bid in real time" },
    ],
    stats: ["2,400+ artists", "920 avg draw", "$4.2M paid", "18K+ shows"],
  },
  promoter: {
    color: "#FF5C8A", icon: Users, label: "Promoter", badge: "built for promoters — book smarter",
    headline: "Book the Right Artist.\nEvery Time.",
    subtext: "Find verified talent, send structured offers, and manage every booking from confirmation to settlement.",
    cta: "Join as Promoter", ctaLink: "/auth?mode=signup&role=promoter",
    painTitle: "Why promoters switch to GetBooked.Live",
    pains: ["Hours spent searching for the right artist", "Unstructured offers lost in email threads", "No reliable attendance data to vet talent", "Manually tracking deposits, riders, and contracts"],
    features: [
      { icon: "🤖", name: "AI booking agent", desc: "Describe what you need and get matched with best-fit artists" },
      { icon: "📨", name: "One-click offers", desc: "Send structured offers with guarantee, splits, and hospitality" },
      { icon: "📈", name: "Attendance data", desc: "See verified draw numbers before you book" },
      { icon: "⚡", name: "Flash bids", desc: "Fill last-minute slots by posting open dates for bidding" },
      { icon: "💳", name: "Financing", desc: "Split booking costs into flexible payment plans" },
      { icon: "📋", name: "Deal rooms", desc: "Contracts, milestones, and chat — all in one workspace" },
    ],
    stats: ["920+ promoters", "4.8K events", "$2.1M booked", "89% accept"],
  },
  venue: {
    color: "#FFB83E", icon: Building2, label: "Venue", badge: "built for venues — fill your calendar",
    headline: "Fill Your Calendar.\nGrow Your Revenue.",
    subtext: "List your space, showcase capacity and amenities, and connect directly with promoters and artists looking for rooms.",
    cta: "Join as Venue", ctaLink: "/auth?mode=signup&role=venue",
    painTitle: "Why venues switch to GetBooked.Live",
    pains: ["Empty weeknights and underbooked seasons", "No centralized way to list availability", "Promoters ghost after initial inquiry", "No data on which artists actually draw"],
    features: [
      { icon: "🏟", name: "Venue profiles", desc: "Showcase capacity, amenities, rates, and photos" },
      { icon: "📅", name: "Availability calendar", desc: "Publish open dates and receive booking requests" },
      { icon: "📊", name: "Attendance badges", desc: "Show '65% of capacity' stats on your profile" },
      { icon: "🤝", name: "Direct connect", desc: "Work directly with promoters and talent — no middlemen" },
      { icon: "💰", name: "Revenue tracking", desc: "Track bookings, deposits, and settlement per event" },
      { icon: "⭐", name: "Reviews", desc: "Build your venue's reputation with verified post-show reviews" },
    ],
    stats: ["840+ venues", "1.2K cities", "92% fill rate", "direct book"],
  },
  production: {
    color: "#7B5CF0", icon: Wrench, label: "Production", badge: "built for production crews — get hired",
    headline: "Get Booked for\nthe Shows That Matter.",
    subtext: "Access real booking opportunities and get hired directly by promoters and venues. No more hustling for gigs through personal networks.",
    cta: "Join as Production", ctaLink: "/auth?mode=signup&role=production",
    painTitle: "Why production crews switch to GetBooked.Live",
    pains: ["Hard to find consistent, well-paying gigs", "Scattered communication with promoters and venues", "No centralized job pipeline for live events", "Technical requirements unclear until last minute"],
    features: [
      { icon: "🎯", name: "Gig marketplace", desc: "Browse upcoming events actively looking for production crews" },
      { icon: "🔧", name: "Role-based hiring", desc: "Sound, lighting, stage, AV — get hired per show or full tour" },
      { icon: "📋", name: "Tech specs upfront", desc: "See full technical requirements before you commit to a gig" },
      { icon: "💬", name: "Direct comms", desc: "Talk directly with promoters and venue managers — no middlemen" },
      { icon: "⭐", name: "BookScore™", desc: "Build your crew reputation and attract repeat bookings" },
      { icon: "🗺", name: "Tour assignments", desc: "Get assigned to multiple tour stops from a single booking" },
    ],
    stats: ["380+ crews", "89 avg shows", "12K+ events", "direct hire"],
  },
  creative: {
    color: "#3EC8FF", icon: Camera, label: "Creative", badge: "built for creatives — bring shows to life",
    headline: "Bring Shows to\nLife Creatively.",
    subtext: "Get hired to create photos, video content, and branding for live events and tours. Your portfolio does the talking.",
    cta: "Join as Creative", ctaLink: "/auth?mode=signup&role=photo_video",
    painTitle: "Why creatives switch to GetBooked.Live",
    pains: ["Hard to connect with live events that need visuals", "Last-minute gig sourcing through Instagram DMs", "No centralized creative opportunities for events", "Portfolio scattered across different platforms"],
    features: [
      { icon: "🎬", name: "Creative marketplace", desc: "Browse events needing photographers, videographers, and designers" },
      { icon: "🖼", name: "Portfolio integration", desc: "Showcase your best work directly on your GetBooked profile" },
      { icon: "🎟", name: "Event-based hiring", desc: "Get booked per show, per tour stop, or on an ongoing basis" },
      { icon: "🤝", name: "Direct collaboration", desc: "Work directly with artists, promoters, and venues" },
      { icon: "📦", name: "Content delivery", desc: "Structured delivery milestones — raw files, edits, final cut" },
      { icon: "💰", name: "Show marketplace", desc: "Sell show photos directly to fans through artist profiles" },
    ],
    stats: ["640+ creatives", "310 avg shoots", "photo + video", "tour packages"],
  },
};

const PERSONA_KEYS: PersonaKey[] = ["artist", "promoter", "venue", "production", "creative"];

const INTENT_MAP: Record<Intent, PersonaKey[]> = {
  book: ["promoter", "venue"],
  get: ["artist", "production", "creative"],
  build: ["artist", "promoter", "venue", "production", "creative"],
};

const INTENTS: { key: Intent; label: string }[] = [
  { key: "book", label: "Book Talent" },
  { key: "get", label: "Get Booked" },
  { key: "build", label: "Build a Team" },
];

const ECOSYSTEM_FLOWS: Record<PersonaKey, { label: string; color: string }[]> = {
  promoter: [
    { label: "Promoter", color: "#FF5C8A" }, { label: "Artist", color: "#C8FF3E" },
    { label: "Venue", color: "#FFB83E" }, { label: "Production", color: "#7B5CF0" }, { label: "Creative", color: "#3EC8FF" },
  ],
  artist: [
    { label: "Promoter", color: "#FF5C8A" }, { label: "Artist", color: "#C8FF3E" },
    { label: "Deal Room", color: "#C8FF3E" }, { label: "Tour Hub", color: "#C8FF3E" },
  ],
  venue: [
    { label: "Promoter", color: "#FF5C8A" }, { label: "Venue", color: "#FFB83E" },
    { label: "Artist", color: "#C8FF3E" }, { label: "Production", color: "#7B5CF0" },
  ],
  production: [
    { label: "Promoter", color: "#FF5C8A" }, { label: "Production", color: "#7B5CF0" },
    { label: "Venue", color: "#FFB83E" }, { label: "Show Night", color: "#7B5CF0" },
  ],
  creative: [
    { label: "Artist", color: "#C8FF3E" }, { label: "Creative", color: "#3EC8FF" },
    { label: "Content", color: "#3EC8FF" }, { label: "Fan Reach", color: "#3EC8FF" },
  ],
};

/* ─── Animation variants ─── */
const detailVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const featureCardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const featureContainerVariants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

export default function PersonaSection() {
  const [active, setActive] = useState<PersonaKey>("artist");
  const [intent, setIntent] = useState<Intent>("build");
  const persona = PERSONAS[active];
  const highlighted = INTENT_MAP[intent];
  const flow = ECOSYSTEM_FLOWS[active];

  return (
    <section className="fade-in-section py-16 sm:py-28 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Section header */}
        <div className="text-center mb-10">
          <span className="section-label">who it's for</span>
          <h2 className="section-heading">one platform, every role in live music</h2>
          <p className="section-subtext mx-auto">whether you're booking talent or getting booked — we built it for you.</p>
        </div>

        {/* Intent toggle */}
        <div className="flex justify-center gap-2 mb-8">
          {INTENTS.map((i) => (
            <motion.button
              key={i.key}
              onClick={() => setIntent(i.key)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`px-4 py-2 rounded-full text-xs font-display font-semibold transition-all duration-200 lowercase ${
                intent === i.key
                  ? "bg-foreground text-background"
                  : "border border-white/[0.1] text-muted-foreground hover:text-foreground hover:border-white/[0.15]"
              }`}
            >
              {i.label}
            </motion.button>
          ))}
        </div>

        {/* Persona cards */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          {PERSONA_KEYS.map((key) => {
            const p = PERSONAS[key];
            const isActive = active === key;
            const isDimmed = !highlighted.includes(key);
            return (
              <motion.button
                key={key}
                onClick={() => setActive(key)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                layout
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-display font-medium transition-all duration-300 lowercase max-w-[120px] flex-1 min-w-[100px] ${
                  isActive
                    ? "border-2 text-foreground"
                    : "border border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-white/[0.12]"
                } ${isDimmed && !isActive ? "opacity-40" : "opacity-100"}`}
                style={isActive ? { borderColor: p.color, backgroundColor: `${p.color}10` } : {}}
              >
                <p.icon className="w-3.5 h-3.5" style={isActive ? { color: p.color } : {}} />
                {p.label}
              </motion.button>
            );
          })}
        </div>

        {/* Active persona detail — animated */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="rounded-2xl border border-white/[0.08] bg-card/60 p-7 sm:p-10"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={detailVariants}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Badge */}
            <motion.span
              className="inline-block text-[10px] font-display font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5"
              style={{ color: persona.color, backgroundColor: `${persona.color}15`, border: `1px solid ${persona.color}25` }}
              variants={staggerItem}
            >
              {persona.badge}
            </motion.span>

            {/* Headline + subtext */}
            <motion.h3
              className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl text-foreground mb-3 lowercase whitespace-pre-line"
              style={{ lineHeight: 1.1 }}
              variants={staggerItem}
              transition={{ delay: 0.05 }}
            >
              {persona.headline}
            </motion.h3>
            <motion.p
              className="text-sm text-muted-foreground font-body leading-relaxed max-w-lg mb-8"
              variants={staggerItem}
              transition={{ delay: 0.1 }}
            >
              {persona.subtext}
            </motion.p>

            {/* Pain points */}
            <motion.p
              className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-3"
              variants={staggerItem}
              transition={{ delay: 0.15 }}
            >
              {persona.painTitle}
            </motion.p>
            <motion.ul className="space-y-2 mb-8" variants={staggerContainer} initial="initial" animate="animate">
              {persona.pains.map((pain, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground/70 font-body"
                  variants={staggerItem}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive" />
                  {pain}
                </motion.li>
              ))}
            </motion.ul>

            {/* Features grid */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8"
              variants={featureContainerVariants}
              initial="initial"
              animate="animate"
            >
              {persona.features.map((f, i) => (
                <motion.div
                  key={f.name}
                  className="rounded-xl bg-secondary/40 border border-white/[0.06] p-4"
                  variants={featureCardVariants}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.3, ease: "easeOut" }}
                >
                  <span className="text-base mb-2 block">{f.icon}</span>
                  <p className="text-xs font-display font-bold text-foreground lowercase mb-1">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground font-body leading-[1.5]">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 sm:gap-8 mb-8">
              {persona.stats.map((s) => (
                <p key={s} className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">{s}</p>
              ))}
            </div>

            {/* CTA */}
            <Link to={persona.ctaLink}>
              <motion.button
                className="font-display font-bold text-sm rounded-[10px] px-7 h-11 transition-all inline-flex items-center gap-2 lowercase"
                style={{ backgroundColor: persona.color, color: "#080C14" }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {persona.cta} <motion.span whileHover={{ x: 4 }}><ArrowRight className="w-4 h-4" /></motion.span>
              </motion.button>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Ecosystem flow */}
        <div className="mt-14">
          <p className="text-center text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-6">
            how the ecosystem connects
          </p>
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
            {flow.map((node, i) => {
              const isActiveNode = node.label.toLowerCase() === active || (active === "creative" && node.label === "Creative");
              return (
                <div key={i} className="flex items-center gap-1.5 sm:gap-3">
                  <motion.div
                    layout
                    className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold transition-all duration-300 lowercase ${
                      isActiveNode ? "border-2" : "border border-white/[0.08] opacity-50"
                    }`}
                    style={
                      isActiveNode
                        ? { borderColor: node.color, backgroundColor: `${node.color}15`, color: node.color }
                        : { color: node.color }
                    }
                  >
                    {node.label}
                  </motion.div>
                  {i < flow.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
