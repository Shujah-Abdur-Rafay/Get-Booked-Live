import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, MapPin, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Recommendation = {
  artist_id: string;
  artist_name: string;
  artist_genre: string | null;
  artist_city: string | null;
  artist_state: string | null;
  artist_avatar: string | null;
  artist_slug: string | null;
  artist_bookscore: number | null;
  suggested_price: number | null;
  confidence_score: number | null;
  reason: string;
  rank: number;
};

interface AIRecommendationCardProps {
  recommendation: Recommendation;
  onSendOffer?: (artistId: string) => void;
}

export default function AIRecommendationCard({ recommendation: rec, onSendOffer }: AIRecommendationCardProps) {
  const confidence = Math.round((rec.confidence_score || 0) * 100);
  const confidenceColor = confidence >= 80 ? "text-[#3EFFBE]" : confidence >= 50 ? "text-[#FFB83E]" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-4 hover:border-white/[0.12] transition-all group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-[#141B28] flex items-center justify-center">
          {rec.artist_avatar ? (
            <img src={rec.artist_avatar} alt={rec.artist_name || ""} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-lg font-syne font-bold text-muted-foreground">
              {(rec.artist_name || "?")[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-syne font-semibold text-sm truncate lowercase">{rec.artist_name || "unknown artist"}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#C8FF3E]/10 text-[#C8FF3E] font-medium shrink-0 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> #{rec.rank}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
            {rec.artist_genre && <span className="lowercase">{rec.artist_genre}</span>}
            {rec.artist_city && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" /> {rec.artist_city}{rec.artist_state ? `, ${rec.artist_state}` : ""}
              </span>
            )}
            {rec.artist_bookscore != null && (
              <span className="flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> {rec.artist_bookscore}
              </span>
            )}
          </div>

          {/* AI Reason */}
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-3 line-clamp-2">{rec.reason}</p>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {rec.suggested_price != null && (
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-[#C8FF3E]">
                  <DollarSign className="w-3 h-3" /> {rec.suggested_price.toLocaleString()} suggested
                </span>
              )}
              <span className={`text-[10px] font-medium ${confidenceColor}`}>
                {confidence}% match
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {rec.artist_slug && (
                <Link to={`/${rec.artist_slug}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2">
                    view
                  </Button>
                </Link>
              )}
              {onSendOffer && (
                <Button
                  size="sm"
                  onClick={() => onSendOffer(rec.artist_id)}
                  className="h-7 text-[10px] px-2.5 bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 active:scale-[0.97]"
                >
                  send offer <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
