import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Banknote, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    guarantee: number;
    venue_name: string;
    event_date: string;
    promoter_id: string;
  };
  commissionRate?: number;
  onRequested: () => void;
};

export default function AdvanceRequestDialog({ open, onOpenChange, booking, commissionRate = 10, onRequested }: Props) {
  const { user } = useAuth();
  const [percent, setPercent] = useState(50);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const guaranteeNet = booking.guarantee * (1 - commissionRate / 100);
  const maxAdvance = Math.floor(guaranteeNet * 0.7);
  const requestedAmount = Math.floor(guaranteeNet * (percent / 100));
  const feePercent = 3;
  const feeAmount = Math.floor(requestedAmount * (feePercent / 100));
  const artistReceives = requestedAmount - feeAmount;

  const handleRequest = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("advance_requests" as any).insert({
      booking_id: booking.id,
      artist_id: user.id,
      amount_requested: requestedAmount,
      guarantee_net: guaranteeNet,
      fee_percent: feePercent,
      fee_amount: feeAmount,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSubmitted(true);
      toast.success("Advance request submitted!");
      onRequested();
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md">
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[hsl(var(--primary))]" />
            </div>
            <h3 className="font-syne font-bold text-lg">Request Submitted</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your advance request for ${artistReceives.toLocaleString()} is being evaluated. You'll be notified within 24 hours.
            </p>
            <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-syne flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[hsl(var(--primary))]" />
            Request Advance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="rounded-lg bg-secondary/50 border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">{booking.venue_name} · {new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            <p className="text-sm font-medium">Guarantee: ${booking.guarantee.toLocaleString()} · Net: ${guaranteeNet.toLocaleString()}</p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Advance amount</span>
              <span className="font-syne font-bold text-foreground text-base">${requestedAmount.toLocaleString()}</span>
            </div>
            <Slider
              value={[percent]}
              onValueChange={(v) => setPercent(v[0])}
              min={10}
              max={70}
              step={5}
              className="mb-1"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>10%</span>
              <span>Max 70% (${maxAdvance.toLocaleString()})</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Advance requested</span>
              <span>${requestedAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Processing fee ({feePercent}%)</span>
              <span className="text-[#FF5C5C]">-${feeAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-medium">
              <span>You receive</span>
              <span className="text-[hsl(var(--primary))] font-syne font-bold">${artistReceives.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-lg bg-[#FFB83E]/5 border border-[#FFB83E]/20 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFB83E] shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-[#FFB83E] mb-0.5">Evaluation criteria</p>
              <ul className="list-disc pl-3 space-y-0.5">
                <li>Booking must be confirmed with signed contract</li>
                <li>Promoter must have PromoScore &gt; 75</li>
                <li>On show day, full guarantee is collected from promoter</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleRequest}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Banknote className="w-4 h-4 mr-2" />}
            Request ${artistReceives.toLocaleString()} Advance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
