import { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type CheckItem = {
  label: string;
  cta: string;
  key: string;
  weight: number;
  complete: boolean;
};

const ACCENT = "#C8FF3E";
const RING_SIZE = 160;
const RADIUS = 68;
const STROKE = 5;

export default function ProfileCompletionRing() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [animated, setAnimated] = useState(false);
  const [availabilityCount, setAvailabilityCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("artist_availability")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", user.id)
      .then(({ count }) => setAvailabilityCount(count ?? 0));
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  const items: CheckItem[] = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "Profile photo", cta: "Add a photo →", key: "avatar", weight: 20, complete: !!profile.avatar_url },
      { label: "Bio", cta: "Write your bio →", key: "bio", weight: 15, complete: !!profile.bio && profile.bio.length > 50 },
      { label: "Genre", cta: "Pick your genres →", key: "genre", weight: 15, complete: !!profile.genre },
      { label: "Fee range", cta: "Set your rates →", key: "fee", weight: 15, complete: (profile.rate_min ?? 0) > 0 && (profile.rate_max ?? 0) > 0 },
      { label: "Location", cta: "Add your location →", key: "location", weight: 10, complete: !!profile.city && !!profile.state },
      { label: "Instagram", cta: "Link Instagram →", key: "instagram", weight: 10, complete: !!(profile as any).instagram },
      { label: "Spotify", cta: "Link Spotify →", key: "spotify", weight: 10, complete: !!(profile as any).spotify },
      { label: "Availability", cta: "Mark your dates →", key: "availability", weight: 5, complete: availabilityCount >= 2 },
    ];
  }, [profile, availabilityCount]);

  const score = useMemo(() => items.reduce((sum, i) => sum + (i.complete ? i.weight : 0), 0), [items]);
  const incomplete = items.filter((i) => !i.complete);

  // Persist score
  useEffect(() => {
    if (!user || !profile) return;
    if ((profile as any).completion_score !== score) {
      supabase.from("profiles").update({ completion_score: score } as any).eq("user_id", user.id).then(() => {});
    }
  }, [score, user, profile]);

  if (!profile || score === 100) return null;

  const circumference = 2 * Math.PI * RADIUS;
  const offset = animated ? circumference - (score / 100) * circumference : circumference;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-6">
      {/* Ring + avatar */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="transform -rotate-90">
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE}
            />
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke={ACCENT} strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover" loading="lazy" width={96} height={96} />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#1C2535] flex items-center justify-center">
                <span className="font-syne font-bold text-2xl text-foreground">
                  {(profile.display_name ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="font-syne font-bold text-base text-foreground mt-3 text-center">
          Your profile is <span style={{ color: ACCENT }} className="tabular-nums">{score}%</span> complete
        </p>
      </div>

      {/* Incomplete pills */}
      {incomplete.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {incomplete.map((item) => (
            <button
              key={item.key}
              onClick={() => item.key === "availability" ? navigate("/dashboard") : navigate("/profile-setup")}
              className="inline-flex items-center h-8 px-3 rounded-full text-[11px] font-medium border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/10 transition-colors active:scale-[0.97]"
            >
              {item.cta}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/profile-setup")}
        className="w-full inline-flex items-center justify-center h-10 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
        style={{ backgroundColor: ACCENT, color: "#080C14" }}
      >
        Update Profile
      </button>
    </div>
  );
}
