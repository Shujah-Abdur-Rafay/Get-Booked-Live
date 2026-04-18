import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic2, Users, Building2, Wrench, Camera, ArrowRight, Check } from "lucide-react";

const ROLE_TABS = [
  { key: "artist", label: "artists", icon: Mic2, color: "bg-primary text-primary-foreground" },
  { key: "promoter", label: "promoters", icon: Users, color: "bg-role-promoter text-white" },
  { key: "venue", label: "venues", icon: Building2, color: "bg-role-venue text-black" },
  { key: "production", label: "production", icon: Wrench, color: "bg-role-production text-white" },
  { key: "photo_video", label: "photo & video", icon: Camera, color: "bg-role-photo text-black" },
];

const ROLE_DETAILS: Record<string, { headline: string; points: string[]; accent: string }> = {
  artist: {
    headline: "manage your bookings, build your brand, and get discovered.",
    accent: "text-primary",
    points: [
      "receive & negotiate offers in deal rooms",
      "request advances on confirmed guarantees",
      "auto-calculate commissions & net pay",
      "track attendance analytics & average draw",
      "smooth your income into equal monthly payouts",
    ],
  },
  promoter: {
    headline: "find talent, send offers, and manage your events.",
    accent: "text-role-promoter",
    points: [
      "AI booking agent finds best-fit artists for your budget",
      "send structured offers with one click",
      "use flash bids to fill last-minute slots",
      "finance bookings with flexible payment plans",
      "track real attendance data per show",
    ],
  },
  venue: {
    headline: "list your space, fill your calendar, and grow revenue.",
    accent: "text-role-venue",
    points: [
      "showcase capacity, amenities & rates",
      "receive booking requests directly",
      "manage availability & holds",
      "show attendance stats: '65% of capacity' badges",
      "connect with local promoters & talent",
    ],
  },
  production: {
    headline: "connect with events that need your expertise.",
    accent: "text-role-production",
    points: [
      "list your services & crew size",
      "get hired for sound, lighting & staging",
      "manage tour assignments with timezone sync",
      "book ground transport per tour stop",
      "build your reputation with reviews",
    ],
  },
  photo_video: {
    headline: "get booked for live coverage and grow your portfolio.",
    accent: "text-role-photo",
    points: [
      "showcase your work & style",
      "set your rate & availability",
      "get discovered by promoters",
      "upload reels directly to your profile",
      "build reviews from real events",
    ],
  },
};

export default function RoleSwitcherSection() {
  const [activeRole, setActiveRole] = useState("artist");
  const details = ROLE_DETAILS[activeRole];

  return (
    <section className="fade-in-section py-16 sm:py-28 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-2xl sm:text-4xl font-bold text-center mb-3 lowercase tracking-tight">
          built for every role in live music
        </h2>
        <p className="text-muted-foreground text-center text-sm mb-12 max-w-md mx-auto font-body">
          one platform, five roles. everyone gets the tools they need.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-10">
          {ROLE_TABS.map((tab) => {
            const active = activeRole === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveRole(tab.key)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-display font-medium transition-all duration-200 active:scale-[0.96] lowercase min-h-[44px] ${
                  active
                    ? tab.color
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-card/60 border border-border p-7 sm:p-10 transition-all duration-300">
          <h3 className={`font-display text-lg sm:text-xl font-bold mb-6 lowercase ${details.accent}`}>
            {details.headline}
          </h3>
          <ul className="space-y-3">
            {details.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 font-body">
                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${details.accent}`} />
                {point}
              </li>
            ))}
          </ul>
          <Link to="/auth?tab=signup" className="inline-block mt-8">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-display font-semibold active:scale-[0.96] transition-transform lowercase h-10 px-6">
              get started as {activeRole === "photo_video" ? "photo/video" : activeRole === "production" ? "production crew" : `a ${activeRole}`} <ArrowRight className="ml-2 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
