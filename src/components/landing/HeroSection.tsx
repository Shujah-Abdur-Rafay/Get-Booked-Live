import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Mic2, Megaphone, Building2, Camera, Zap } from "lucide-react";
import { motion, useMotionValue, useSpring, useInView, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Concert background with parallax ─── */
function ConcertBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <motion.div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <motion.div className="absolute inset-0 w-full h-[120%] -top-[10%]" style={{ y }}>
        <img
          src="/images/concert-crowd.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/75 via-[#050810]/55 to-[#050810]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050810]/50 via-transparent to-[#050810]/50" />
      {/* Accent glows */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[280px] bg-primary/[0.07] blur-[100px]" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-[#FF5C8A]/[0.04] blur-[130px]" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-[#3EC8FF]/[0.04] blur-[130px]" />
    </motion.div>
  );
}

/* ─── Role entry buttons ─── */
const ROLES = [
  {
    id: "artist",
    icon: Mic2,
    label: "I AM AN ARTIST",
    cta: "Get Booked",
    color: "#C8FF3E",
    textColor: "#080C14",
    link: "/auth?tab=signup&role=artist",
    glow: "rgba(200,255,62,0.25)",
  },
  {
    id: "promoter",
    icon: Megaphone,
    label: "I AM A PROMOTER",
    cta: "Book Talent",
    color: "#FF5C8A",
    textColor: "#fff",
    link: "/auth?tab=signup&role=promoter",
    glow: "rgba(255,92,138,0.25)",
  },
  {
    id: "venue",
    icon: Building2,
    label: "I AM A VENUE",
    cta: "Host Events",
    color: "#FFB83E",
    textColor: "#080C14",
    link: "/auth?tab=signup&role=venue",
    glow: "rgba(255,184,62,0.25)",
  },
  {
    id: "creative",
    icon: Camera,
    label: "I AM A CREATIVE",
    cta: "Find Work",
    color: "#3EC8FF",
    textColor: "#080C14",
    link: "/auth?tab=signup&role=photo_video",
    glow: "rgba(62,200,255,0.25)",
  },
];

function RoleEntryButtons() {
  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mx-auto mt-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
    >
      {ROLES.map((role, i) => {
        const Icon = role.icon;
        return (
          <Link key={role.id} to={role.link}>
            <motion.div
              className="relative group flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 h-[100px] cursor-pointer overflow-hidden"
              style={{
                borderColor: `${role.color}30`,
                backgroundColor: `${role.color}08`,
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08, duration: 0.45, ease: "easeOut" }}
              whileHover={{
                scale: 1.04,
                backgroundColor: `${role.color}18`,
                borderColor: `${role.color}60`,
                boxShadow: `0 0 28px ${role.glow}`,
              }}
              whileTap={{ scale: 0.97 }}
            >
              <Icon className="w-5 h-5" style={{ color: role.color }} />
              <div className="text-center">
                <p className="text-[10px] font-display font-bold tracking-widest uppercase" style={{ color: role.color }}>
                  {role.label}
                </p>
                <p className="text-[11px] font-body text-white/60 mt-0.5 flex items-center justify-center gap-1">
                  {role.cta} <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </motion.div>
  );
}

/* ─── Live activity badge ─── */
function LiveBadge({ dealsThisWeek }: { dealsThisWeek: number }) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span className="text-[11px] text-white/60 font-body tracking-wide">
        {dealsThisWeek > 0 ? `${dealsThisWeek} deals sent this week` : "live · booking platform open"}
      </span>
    </motion.div>
  );
}

/* ─── Social proof bar ─── */
function SocialProofBar({ artistCount }: { artistCount: number }) {
  const cities = ["Miami", "NYC", "LA", "Chicago", "LATAM"];
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.5 }}
    >
      <span className="text-[11px] text-white/40 font-body">Used by promoters in</span>
      {cities.map((city) => (
        <span key={city} className="text-[11px] text-white/60 font-display font-semibold tracking-wide">
          {city}
        </span>
      ))}
      <span className="text-[11px] text-white/40 font-body">·</span>
      <span className="text-[11px] text-white/60 font-body">
        <span className="text-primary font-display font-bold">{artistCount.toLocaleString()}+</span> artists onboarded
      </span>
    </motion.div>
  );
}

/* ─── Mockup window ─── */
function MockupWindow() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#080C14]/90 backdrop-blur-xl shadow-[0_32px_80px_hsl(var(--primary)/0.12),0_0_0_1px_hsl(var(--primary)/0.06)]">
      <div className="h-8 bg-[#0d1117]/80 backdrop-blur-sm flex items-center px-3 gap-2 border-b border-white/[0.06]">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[11px] text-muted-foreground font-body">getbooked.live/dashboard</span>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "offers", value: "8", color: "text-primary" },
            { label: "bookings", value: "3", color: "text-role-venue" },
            { label: "earnings", value: "$4.2k", color: "text-foreground" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-secondary/60 border border-white/[0.06] p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body uppercase tracking-wider">{m.label}</p>
              <p className={`text-lg sm:text-2xl font-display font-bold ${m.color} mt-1 tabular-nums`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-secondary/40 border border-white/[0.06] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-body">new offer · house of blues, chicago</p>
              <p className="text-sm font-display font-bold text-foreground mt-1">$2,500 guarantee · dec 14</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-display font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> accept
              </button>
              <button className="h-8 px-3 rounded-lg border border-white/[0.1] text-muted-foreground text-xs font-display flex items-center gap-1">
                <X className="w-3 h-3" /> decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Animated stat counter ─── */
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const numericMatch = value.match(/^[\d,.]+/);
  const numericStr = numericMatch ? numericMatch[0] : "";
  const suffix = value.slice(numericStr.length);
  const target = parseFloat(numericStr.replace(/,/g, "")) || 0;
  const isDecimal = numericStr.includes(".");
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  useEffect(() => {
    if (isInView) motionVal.set(target);
  }, [isInView, target, motionVal]);
  const displayRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      if (!displayRef.current) return;
      const rounded = isDecimal ? v.toFixed(1) : Math.round(v);
      displayRef.current.textContent = Number(rounded).toLocaleString() + suffix;
    });
    return unsubscribe;
  }, [spring, suffix, isDecimal]);
  return (
    <div ref={ref} className="text-center">
      <p className="font-display font-bold text-xl sm:text-2xl text-foreground tabular-nums">
        <span ref={displayRef}>0{suffix}</span>
      </p>
      <p className="text-[11px] text-muted-foreground font-body tracking-wide uppercase mt-1">{label}</p>
    </div>
  );
}

/* ─── Stat base values ─── */
const STAT_BASE: Record<string, number> = {
  artists: 847,
  promoters: 312,
  venues: 214,
  production: 96,
  creatives: 128,
  bookings: 63,
};

/* ─── Main HeroSection ─── */
export default function HeroSection() {
  const [stats, setStats] = useState<{ value: string; label: string }[]>([
    { value: "847+", label: "artists" },
    { value: "312+", label: "promoters" },
    { value: "214+", label: "venues" },
    { value: "96+", label: "production crews" },
    { value: "128+", label: "creatives" },
    { value: "63+", label: "shows booked" },
  ]);
  const [dealsThisWeek, setDealsThisWeek] = useState(0);
  const [artistCount, setArtistCount] = useState(847);

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error || !data) return;
      const d = data as Record<string, number>;
      const fmt = (n: number, base: number) => {
        const total = n + base;
        if (total >= 1000) return `${(total / 1000).toFixed(total >= 10000 ? 0 : 1)}K+`;
        return `${total.toLocaleString()}+`;
      };
      setStats([
        { value: fmt(d.artists ?? 0, STAT_BASE.artists), label: "artists" },
        { value: fmt(d.promoters ?? 0, STAT_BASE.promoters), label: "promoters" },
        { value: fmt(d.venues ?? 0, STAT_BASE.venues), label: "venues" },
        { value: fmt(d.production ?? 0, STAT_BASE.production), label: "production crews" },
        { value: fmt(d.creatives ?? 0, STAT_BASE.creatives), label: "creatives" },
        { value: fmt(d.bookings ?? 0, STAT_BASE.bookings), label: "shows booked" },
      ]);
      setDealsThisWeek(d.deals_this_week ?? 0);
      setArtistCount((d.artists ?? 0) + STAT_BASE.artists);
    }
    fetchStats();
  }, []);

  return (
    <section className="relative min-h-[100svh] flex items-center pt-20 pb-20 px-4 sm:px-6 md:px-8 overflow-hidden">
      {/* Full-bleed concert background */}
      <ConcertBackground />

      <div className="container mx-auto max-w-3xl text-center relative z-10">

        {/* Live badge */}
        <LiveBadge dealsThisWeek={dealsThisWeek} />

        {/* Headline — outcome focused */}
        <motion.h1
          className="font-display font-extrabold tracking-[-0.03em] text-foreground lowercase mb-4"
          style={{ fontSize: "clamp(36px, 6vw, 68px)", lineHeight: "1.04" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          book artists.{" "}
          <span className="text-primary">close deals.</span>
          <br />
          run your shows — all in one place.
        </motion.h1>

        {/* Sub — pain point */}
        <motion.p
          className="text-base sm:text-lg text-white/50 font-body leading-relaxed mx-auto mb-2 max-w-lg"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
        >
          Send your first booking offer in minutes. Receive a structured contract automatically. Close the deal without leaving the platform.
        </motion.p>

        {/* Sub — platform pitch */}
        <motion.p
          className="text-sm text-white/35 font-body leading-relaxed mx-auto mb-0 max-w-md"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: "easeOut" }}
        >
          Stop using emails, DMs, and spreadsheets. One platform from first offer to final payout.
        </motion.p>

        {/* FIX 10: Founding member urgency badge */}
        <motion.div
          className="flex justify-center mb-2 mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#C8FF3E]/[0.08] border border-[#C8FF3E]/20 rounded-full text-xs text-[#C8FF3E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF3E] animate-pulse" />
            Founding member spots open — free Pro for first 100 artists
          </div>
        </motion.div>

        {/* ── 4 ROLE ENTRY BUTTONS ── */}
        <RoleEntryButtons />

        {/* Primary CTA */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4, ease: "easeOut" }}
        >
          <Link to="/auth?tab=signup">
            <motion.button
              className="bg-primary text-primary-foreground font-display font-bold text-sm rounded-[10px] px-8 h-12 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-[0_0_28px_hsl(var(--primary)/0.35)]"
              whileHover={{ scale: 1.03, boxShadow: "0 0 40px hsl(var(--primary)/0.5)" }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap className="w-4 h-4" />
              Get Started
            </motion.button>
          </Link>
          {/* FIX 5: Changed secondary CTA from 'Explore Platform' → 'See how it works →' with smooth scroll */}
          <motion.button
            className="border border-white/[0.12] text-white/70 font-display font-medium text-sm rounded-[10px] px-7 h-12 hover:bg-white/[0.06] hover:border-white/[0.22] hover:text-white transition-all w-full sm:w-auto backdrop-blur-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            See how it works →
          </motion.button>
        </motion.div>

        {/* Social proof — city + artist count */}
        <SocialProofBar artistCount={artistCount} />

        {/* Product mockup */}
        <motion.div
          className="mt-14 sm:mt-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <MockupWindow />
        </motion.div>

        {/* Stat counters */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 + i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <AnimatedStat value={stat.value} label={stat.label} />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
