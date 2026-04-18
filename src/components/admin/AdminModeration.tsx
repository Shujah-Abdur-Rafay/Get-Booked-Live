import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export default function AdminModeration() {
  const { data: lowRatedProfiles } = useQuery({
    queryKey: ["admin-low-rated"],
    queryFn: async () => {
      // Get profiles with low review averages
      const { data: reviews } = await supabase.from("reviews").select("reviewee_id, rating");
      const scores: Record<string, { total: number; count: number }> = {};
      reviews?.forEach(r => {
        if (!scores[r.reviewee_id]) scores[r.reviewee_id] = { total: 0, count: 0 };
        scores[r.reviewee_id].total += r.rating;
        scores[r.reviewee_id].count++;
      });
      
      const lowScoreIds = Object.entries(scores)
        .filter(([, s]) => s.count >= 2 && (s.total / s.count) < 2.5)
        .map(([id, s]) => ({ userId: id, avgRating: (s.total / s.count).toFixed(1), reviewCount: s.count }));
      
      if (lowScoreIds.length === 0) return [];

      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, role, avatar_url").in("user_id", lowScoreIds.map(l => l.userId));
      return lowScoreIds.map(l => ({
        ...l,
        profile: profiles?.find(p => p.user_id === l.userId),
      }));
    },
    staleTime: 30_000,
  });

  const { data: flaggedReviews } = useQuery({
    queryKey: ["admin-flagged-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").lte("rating", 1).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name");
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.display_name || "unnamed"; });
      return map;
    },
    staleTime: 60_000,
  });

  const getName = (id: string) => profiles?.[id] ?? "—";

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">content moderation</h1>

      {/* Low-rated profiles */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#FFB83E]" />
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] lowercase">low-rated profiles</h2>
        </div>
        {lowRatedProfiles && lowRatedProfiles.length > 0 ? (
          <div className="space-y-2">
            {lowRatedProfiles.map(lp => (
              <div key={lp.userId} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2.5">
                  {lp.profile?.avatar_url ? (
                    <img src={lp.profile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" loading="lazy" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#1C2535] flex items-center justify-center text-[10px] font-bold text-[#8892A4]">
                      {(lp.profile?.display_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[#F0F2F7]">{lp.profile?.display_name || "unnamed"}</p>
                    <p className="text-[10px] text-[#5A6478]">{lp.profile?.role || "—"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-syne font-bold text-[#FF5C5C]">★ {lp.avgRating}</p>
                  <p className="text-[10px] text-[#5A6478]">{lp.reviewCount} reviews</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5A6478] text-center py-4">no low-rated profiles</p>
        )}
      </div>

      {/* Flagged reviews (1 star) */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
        <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">flagged reviews (1 star)</h2>
        {flaggedReviews && flaggedReviews.length > 0 ? (
          <div className="space-y-3">
            {flaggedReviews.map(r => (
              <div key={r.id} className="bg-[#141B28] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#F0F2F7]">{getName(r.reviewer_id)} → {getName(r.reviewee_id)}</span>
                  <span className="text-[10px] text-[#5A6478]">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-[#FF5C5C]">★ {r.rating}</p>
                {r.comment && <p className="text-[11px] text-[#8892A4] mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5A6478] text-center py-4">no flagged reviews</p>
        )}
      </div>
    </div>
  );
}
