import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle, Plus, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Flag = { severity: string; issue: string; detail: string };
type Clause = { title: string; text: string; reason: string };
type MissingTerm = { term: string; importance: string; description: string };

type ReviewData = {
  health_score: number;
  score_label: string;
  flags: Flag[];
  suggested_clauses: Clause[];
  missing_terms: MissingTerm[];
  summary: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  onProceed: (addedClauses: string[]) => void;
};

const severityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const importanceColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  important: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  recommended: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "stroke-green-400";
  if (score >= 60) return "stroke-amber-400";
  return "stroke-red-400";
}

export default function ContractReviewDialog({ open, onOpenChange, offerId, onProceed }: Props) {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [addedClauses, setAddedClauses] = useState<Set<number>>(new Set());
  const [expandedFlags, setExpandedFlags] = useState<Set<number>>(new Set());

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-contract", {
        body: { offer_id: offerId },
      });
      if (error) throw error;
      setReview(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze contract");
    } finally {
      setLoading(false);
    }
  };

  const toggleClause = (idx: number) => {
    setAddedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleFlag = (idx: number) => {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleProceed = () => {
    const clauses = review?.suggested_clauses
      .filter((_, i) => addedClauses.has(i))
      .map((c) => `${c.title}: ${c.text}`) ?? [];
    onProceed(clauses);
    onOpenChange(false);
  };

  // Start analysis on open
  if (open && !review && !loading) {
    analyze();
  }

  const circumference = 2 * Math.PI * 40;
  const offset = review ? circumference - (review.health_score / 100) * circumference : circumference;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="font-syne flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-primary" />
            AI Contract Review
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 px-5 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing contract terms…</p>
          </div>
        )}

        {review && (
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-5">
              {/* Health Score */}
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      className={scoreRingColor(review.health_score)}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("font-syne text-2xl font-bold", scoreColor(review.health_score))}>
                      {review.health_score}
                    </span>
                    <span className="text-[10px] text-muted-foreground -mt-0.5">/ 100</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className={cn("font-syne font-semibold text-sm", scoreColor(review.health_score))}>
                    {review.score_label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{review.summary}</p>
                </div>
              </div>

              {/* Flags */}
              {review.flags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Flagged Issues
                  </h4>
                  <div className="space-y-1.5">
                    {review.flags.map((flag, i) => (
                      <button
                        key={i}
                        onClick={() => toggleFlag(i)}
                        className="w-full text-left rounded-lg border border-border p-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", severityColors[flag.severity])}>
                            {flag.severity}
                          </Badge>
                          <span className="text-xs font-medium text-foreground flex-1">{flag.issue}</span>
                          {expandedFlags.has(i)
                            ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
                            : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        {expandedFlags.has(i) && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{flag.detail}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Clauses */}
              {review.suggested_clauses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> Suggested Protective Clauses
                  </h4>
                  <div className="space-y-2">
                    {review.suggested_clauses.map((clause, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg border p-3 transition-all cursor-pointer",
                          addedClauses.has(i)
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-border/80"
                        )}
                        onClick={() => toggleClause(i)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors",
                            addedClauses.has(i)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/40"
                          )}>
                            {addedClauses.has(i) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{clause.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed italic">"{clause.text}"</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">{clause.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Terms */}
              {review.missing_terms.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Missing Terms
                  </h4>
                  <div className="space-y-1.5">
                    {review.missing_terms.map((term, i) => (
                      <div key={i} className="rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", importanceColors[term.importance])}>
                            {term.importance}
                          </Badge>
                          <span className="text-xs font-medium text-foreground">{term.term}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{term.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {review && (
          <div className="px-5 py-3 border-t border-border flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="flex-1 border-border active:scale-[0.97]"
              onClick={handleProceed}
            >
              Skip & Accept
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]"
              onClick={handleProceed}
            >
              {addedClauses.size > 0
                ? `Accept with ${addedClauses.size} clause${addedClauses.size > 1 ? "s" : ""}`
                : "Accept & Generate Contract"
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
