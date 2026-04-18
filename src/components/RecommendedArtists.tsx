// IMPROVEMENT 7: Recommended artists on promoter dashboard.
// Fetches 3 artists from Supabase directly, filtered by promoter's city, ordered by completion_score.
// Hides automatically once the promoter has sent one or more offers.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ArtistRec = {
  user_id: string;
  display_name: string | null;
  genre: string | null;
  city: string | null;
  state: string | null;
  slug: string | null;
  avatar_url: string | null;
  rate_min: number | null;
  rate_max: number | null;
  completion_score: number | null;
};

export default function RecommendedArtists() {
  const { user, profile } = useAuth();
  const [recs, setRecs] = useState<ArtistRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOffers, setHasOffers] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Hide section once promoter has sent any offer
      const { count } = await supabase
        .from("offers")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", user.id);
      if ((count ?? 0) > 0) { setHasOffers(true); setLoading(false); return; }

      // Fetch 3 artists near the promoter's city, ordered by completion_score
      const promoterCity = profile?.city ?? null;
      let query = supabase
        .from("profiles")
        .select("user_id, display_name, genre, city, state, slug, avatar_url, rate_min, rate_max, completion_score")
        .eq("role", "artist")
        .eq("profile_complete", true)
        .order("completion_score", { ascending: false })
        .limit(3);
      if (promoterCity) query = query.ilike("city", `%${promoterCity}%`);
      const { data } = await query;
      setRecs((data as ArtistRec[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user, profile]);

  if (hasOffers || (!loading && recs.length === 0)) return null;

  return (
    <div className="mb-6 sm:mb-8">
      <h3 className="font-syne font-semibold text-sm mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" /> Recommended for You
      </h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding artists near you…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recs.map((rec) => (
            <div key={rec.user_id} className="rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                {rec.avatar_url ? (
                  <img src={rec.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(rec.display_name || "?")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">{rec.display_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{[rec.genre, rec.city].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {(rec.rate_min || rec.rate_max) && (
                <p className="text-[11px] text-muted-foreground mb-3">
                  ${rec.rate_min?.toLocaleString() ?? "—"}{rec.rate_max ? `–$${rec.rate_max.toLocaleString()}` : "+"}
                </p>
              )}
              <Link
                to={`/offer/new/${rec.user_id}`}
                className="block w-full text-center text-[11px] font-semibold rounded-lg py-2 transition-colors"
                style={{ backgroundColor: "rgba(200,255,62,0.12)", color: "#C8FF3E", border: "1px solid rgba(200,255,62,0.2)" }}
              >
                Send offer
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
