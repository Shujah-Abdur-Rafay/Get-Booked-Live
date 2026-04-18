// IMPROVEMENT 1: Welcome modal on first login.
// Triggers once when seen_welcome is false in the profiles table.
// Shows role-specific next steps and a "Let's go →" button.
// On dismiss, updates seen_welcome to true in Supabase — never shows again.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Camera, DollarSign, CalendarDays, UserCog, Search, Send, Building2, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Role = "artist" | "promoter" | "venue" | string;

interface NextStep {
  icon: React.ElementType;
  label: string;
  link: string;
  color: string;
}

const ROLE_STEPS: Record<string, NextStep[]> = {
  artist: [
    { icon: Camera, label: "Add your photo", link: "/profile-setup", color: "#C8FF3E" },
    { icon: DollarSign, label: "Set your fee", link: "/profile-setup", color: "#FF5C8A" },
    { icon: CalendarDays, label: "Mark your availability", link: "/dashboard", color: "#3EC8FF" },
  ],
  promoter: [
    { icon: UserCog, label: "Complete your profile", link: "/profile-setup", color: "#FF5C8A" },
    { icon: Search, label: "Browse artists", link: "/directory", color: "#C8FF3E" },
    { icon: Send, label: "Send your first offer", link: "/directory", color: "#FFB83E" },
  ],
  venue: [
    { icon: Building2, label: "List your space", link: "/profile-setup", color: "#FFB83E" },
    { icon: CalendarDays, label: "Set availability", link: "/dashboard", color: "#3EC8FF" },
    { icon: Send, label: "Receive booking requests", link: "/dashboard", color: "#C8FF3E" },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  artist: "#C8FF3E",
  promoter: "#FF5C8A",
  venue: "#FFB83E",
};

export default function DashboardOnboarding() {
  const { user, profile } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if seen_welcome is explicitly false in the DB
    if (profile && (profile as any).seen_welcome === false) {
      setVisible(true);
    }
  }, [profile]);

  async function dismiss() {
    setVisible(false);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ seen_welcome: true } as any)
      .eq("user_id", user.id);
  }

  const role: Role = (profile as any)?.role ?? "artist";
  const steps = ROLE_STEPS[role] ?? ROLE_STEPS.artist;
  const accentColor = ROLE_COLORS[role] ?? "#C8FF3E";
  const firstName = (profile?.display_name ?? "").split(" ")[0] || "there";

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#080C14] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Welcome icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
              >
                <CheckCircle2 className="w-6 h-6" style={{ color: accentColor }} />
              </div>

              {/* Heading */}
              <h2 className="font-syne font-black text-2xl text-foreground mb-1 lowercase">
                welcome to GetBooked.Live, {firstName}
              </h2>
              <p className="text-sm text-muted-foreground font-body mb-6">
                Here's how to get started as a{role === "artist" ? "n" : ""} {role}.
              </p>

              {/* Role-specific next steps */}
              <div className="space-y-3 mb-8">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <Link
                      key={step.label}
                      to={step.link}
                      onClick={dismiss}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${step.color}12` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: step.color }} />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1">{step.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                  );
                })}
              </div>

              {/* Primary CTA */}
              <button
                onClick={dismiss}
                className="w-full h-12 rounded-xl text-sm font-bold font-display transition-all active:scale-[0.97] hover:opacity-90"
                style={{ backgroundColor: accentColor, color: "#080C14" }}
              >
                Let's go →
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
