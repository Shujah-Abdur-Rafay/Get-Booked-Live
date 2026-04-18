import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, AlertCircle, Loader2 } from "lucide-react";

interface IntelligenceData {
  suggested_low: number;
  suggested_high: number;
  acceptance_likelihood: number;
  summary: string;
  confidence: "high" | "medium" | "low";
}

interface Props {
  artistId: string;
  genre: string | null;
  city: string | null;
  onSuggestedRange?: (low: number, high: number) => void;
}

export default function OfferIntelligence({ artistId, genre, city, onSuggestedRange }: Props) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "offer-intelligence",
          { body: { artist_id: artistId, venue_city: city, genre } }
        );
        if (cancelled) return;
        if (fnError) throw fnError;
        setData(result as IntelligenceData);
        if (result?.suggested_low && result?.suggested_high) {
          onSuggestedRange?.(result.suggested_low, result.suggested_high);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Could not load intelligence");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [artistId, genre, city]);

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-[#0E1420] p-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-[#8892A4]">
          <Loader2 className="w-4 h-4 animate-spin text-[#C8FF3E]" />
          <span>Analyzing booking data…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-[#0E1420] p-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-[#8892A4]">
          <AlertCircle className="w-4 h-4 text-[#5A6478]" />
          <span>Offer intelligence unavailable</span>
        </div>
      </div>
    );
  }

  const confidenceColor =
    data.confidence === "high"
      ? "text-[#3EFFBE]"
      : data.confidence === "medium"
      ? "text-[#FFB83E]"
      : "text-[#8892A4]";

  return (
    <div className="rounded-lg border border-[#C8FF3E]/20 bg-[#0E1420] p-4 mb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#C8FF3E]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C8FF3E]">
            Offer Intelligence
          </span>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-medium ${confidenceColor}`}>
          {data.confidence} confidence
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#F0F2F7] leading-relaxed">{data.summary}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-[#141B28] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-[#5A6478] mb-1">Suggested range</div>
          <div className="font-syne font-bold text-[#F0F2F7] text-base">
            ${data.suggested_low.toLocaleString()} – ${data.suggested_high.toLocaleString()}
          </div>
        </div>
        <div className="rounded-md bg-[#141B28] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-[#5A6478] mb-1">Acceptance rate</div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#3EFFBE]" />
            <span className="font-syne font-bold text-[#F0F2F7] text-base">
              {data.acceptance_likelihood}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
