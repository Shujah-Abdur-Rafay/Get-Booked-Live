import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type OfferScore = {
  quality_score: number;
  risk_level: "low" | "medium" | "high";
  risk_flags: string[];
  pricing_assessment: "below_market" | "fair" | "above_market";
  summary: string;
  recommendation: "accept" | "negotiate" | "caution";
};

interface OfferScoreCardProps {
  offerId: string;
}

export default function OfferScoreCard({ offerId }: OfferScoreCardProps) {
  const [score, setScore] = useState<OfferScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchScore = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("score-booking-request", {
        body: { offer_id: offerId },
      });
      if (fnError) {
        console.error("Score error:", fnError);
        setError(true);
        return;
      }
      if (data?.quality_score != null) {
        setScore(data as OfferScore);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = {
    low: "text-[#3EFFBE]",
    medium: "text-[#FFB83E]",
    high: "text-[#FF5C5C]",
  };

  const riskBg = {
    low: "bg-[#3EFFBE]/10",
    medium: "bg-[#FFB83E]/10",
    high: "bg-[#FF5C5C]/10",
  };

  const recIcon = {
    accept: <CheckCircle className="w-3.5 h-3.5 text-[#3EFFBE]" />,
    negotiate: <TrendingUp className="w-3.5 h-3.5 text-[#FFB83E]" />,
    caution: <AlertTriangle className="w-3.5 h-3.5 text-[#FF5C5C]" />,
  };

  if (!score && !loading) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#C8FF3E]" />
            <span className="text-[11px] font-medium lowercase">ai offer analysis</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchScore}
            disabled={loading}
            className="h-6 text-[10px] text-[#C8FF3E] hover:bg-[#C8FF3E]/10 px-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "analyze"}
          </Button>
        </div>
        {error && <p className="text-[10px] text-[#FF5C5C] mt-1">could not analyze this offer</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#C8FF3E]" />
        <span className="text-[11px] text-muted-foreground">analyzing offer…</span>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#C8FF3E]" />
          <span className="text-[11px] font-medium lowercase">ai analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${riskBg[score.risk_level]} ${riskColor[score.risk_level]} font-medium`}>
            {score.risk_level} risk
          </span>
          <span className="text-sm font-syne font-bold text-[#C8FF3E]">{score.quality_score}/100</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{score.summary}</p>

      {/* Recommendation + Pricing */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] font-medium">
          {recIcon[score.recommendation]} {score.recommendation}
        </span>
        <span className="text-[10px] text-muted-foreground">
          pricing: <span className="text-foreground">{score.pricing_assessment.replace("_", " ")}</span>
        </span>
      </div>

      {/* Risk flags */}
      {score.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {score.risk_flags.map((flag, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF5C5C]/10 text-[#FF5C5C]">
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
