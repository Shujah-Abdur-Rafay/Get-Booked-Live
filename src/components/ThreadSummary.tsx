import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

type ThreadSummary = {
  summary: string;
  key_points: string[];
  next_steps: string;
  sentiment?: "positive" | "neutral" | "strained";
};

type Props = {
  offerId: string;
};

const SENTIMENT_STYLES = {
  positive: { bg: "bg-green-500/10", text: "text-green-400", label: "positive" },
  neutral: { bg: "bg-amber-500/10", text: "text-amber-400", label: "neutral" },
  strained: { bg: "bg-red-500/10", text: "text-red-400", label: "strained" },
};

export default function ThreadSummary({ offerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);

  const summarize = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-booking-thread", {
        body: { offer_id: offerId },
      });
      if (error) throw error;
      setSummary(data as ThreadSummary);
    } catch (err) {
      console.error(err);
      toast.error("Failed to summarize thread");
    } finally {
      setLoading(false);
    }
  };

  if (!summary) {
    return (
      <Button
        onClick={summarize}
        disabled={loading}
        variant="outline"
        className="h-8 text-[11px] border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-primary/30"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <FileText className="w-3 h-3 mr-1.5" />}
        {loading ? "summarizing..." : "ai summary"}
      </Button>
    );
  }

  const sentimentStyle = summary.sentiment ? SENTIMENT_STYLES[summary.sentiment] : SENTIMENT_STYLES.neutral;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="font-syne font-bold text-xs text-foreground">thread summary</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sentimentStyle.bg} ${sentimentStyle.text}`}>
          {sentimentStyle.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{summary.summary}</p>

      {summary.key_points?.length > 0 && (
        <ul className="space-y-1">
          {summary.key_points.map((point, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              {point}
            </li>
          ))}
        </ul>
      )}

      {summary.next_steps && (
        <div className="flex items-start gap-1.5 rounded-lg bg-primary/5 border border-primary/10 p-2.5">
          <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground">{summary.next_steps}</p>
        </div>
      )}

      <Button
        onClick={summarize}
        variant="ghost"
        className="h-6 text-[10px] text-muted-foreground hover:text-foreground p-0"
      >
        refresh summary
      </Button>
    </div>
  );
}
