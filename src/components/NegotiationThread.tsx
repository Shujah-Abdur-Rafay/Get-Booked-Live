import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CounterOfferDialog from "@/components/CounterOfferDialog";
import TranslateButton from "@/components/TranslateButton";

export type CounterOffer = {
  id: string;
  offer_id: string;
  sender_id: string;
  guarantee: number;
  door_split: number | null;
  merch_split: number | null;
  event_date: string;
  event_time: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

type NegotiationThreadProps = {
  offerId: string;
  offer: {
    guarantee: number;
    door_split: number | null;
    merch_split: number | null;
    event_date: string;
    event_time: string | null;
    venue_name: string;
    sender_id: string;
    recipient_id: string;
  };
  onOfferUpdated: (newStatus: string, updatedTerms?: { guarantee: number; event_date: string; event_time: string | null; door_split: number | null; merch_split: number | null }) => void;
};

export default function NegotiationThread({ offerId, offer, onOfferUpdated }: NegotiationThreadProps) {
  const { user } = useAuth();
  const [counters, setCounters] = useState<CounterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("counter_offers")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true });
      setCounters((data as CounterOffer[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [offerId]);

  const latestCounter = counters.length > 0 ? counters[counters.length - 1] : null;
  const latestPending = latestCounter?.status === "pending" ? latestCounter : null;

  // Can the current user respond to the latest counter?
  const canRespond = latestPending && user && latestPending.sender_id !== user.id;

  // Current terms = latest counter terms or original offer terms
  const currentTerms = latestCounter
    ? {
        guarantee: latestCounter.guarantee,
        doorSplit: latestCounter.door_split,
        merchSplit: latestCounter.merch_split,
        eventDate: latestCounter.event_date,
        eventTime: latestCounter.event_time,
        venueName: offer.venue_name,
      }
    : {
        guarantee: offer.guarantee,
        doorSplit: offer.door_split,
        merchSplit: offer.merch_split,
        eventDate: offer.event_date,
        eventTime: offer.event_time,
        venueName: offer.venue_name,
      };

  const handleAcceptCounter = async (counter: CounterOffer) => {
    setResponding(counter.id);
    try {
      // Mark counter as accepted
      await supabase.from("counter_offers").update({ status: "accepted" } as any).eq("id", counter.id);

      // Update the original offer with the accepted counter terms and set status to accepted
      await supabase.from("offers").update({
        status: "accepted",
        guarantee: counter.guarantee,
        door_split: counter.door_split,
        merch_split: counter.merch_split,
        event_date: counter.event_date,
        event_time: counter.event_time,
      }).eq("id", offerId);

      setCounters((prev) => prev.map((c) => c.id === counter.id ? { ...c, status: "accepted" } : c));
      onOfferUpdated("accepted", {
        guarantee: counter.guarantee,
        event_date: counter.event_date,
        event_time: counter.event_time,
        door_split: counter.door_split,
        merch_split: counter.merch_split,
      });
      toast.success("Counter-offer accepted!");
    } catch {
      toast.error("Failed to accept");
    } finally {
      setResponding(null);
    }
  };

  const handleDeclineCounter = async (counter: CounterOffer) => {
    setResponding(counter.id);
    try {
      await supabase.from("counter_offers").update({ status: "declined" } as any).eq("id", counter.id);
      await supabase.from("offers").update({ status: "declined" }).eq("id", offerId);

      setCounters((prev) => prev.map((c) => c.id === counter.id ? { ...c, status: "declined" } : c));
      onOfferUpdated("declined");
      toast.success("Counter-offer declined");
    } catch {
      toast.error("Failed to decline");
    } finally {
      setResponding(null);
    }
  };

  const handleCounterBack = () => {
    setCounterDialogOpen(true);
  };

  if (loading) return null;
  if (counters.length === 0) return null;

  const counterStatusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accepted: "bg-green-500/10 text-green-400 border-green-500/20",
    declined: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="pt-2 border-t border-border space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Negotiation</p>

      {counters.map((counter, idx) => {
        const isFromMe = counter.sender_id === user?.id;
        return (
          <div
            key={counter.id}
            className={`rounded-lg border border-white/[0.06] p-3 text-sm space-y-1.5 ${
              isFromMe ? "bg-background/30 ml-4" : "bg-amber-500/5 mr-4"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {isFromMe ? "You proposed" : "Counter received"} · {new Date(counter.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <Badge variant="outline" className={counterStatusColors[counter.status] ?? ""}>
                {counter.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">Guarantee</span>
              <span className="font-syne font-semibold text-foreground">${counter.guarantee.toLocaleString()}</span>
              {counter.door_split != null && (
                <>
                  <span className="text-muted-foreground">Door Split</span>
                  <span className="text-foreground">{counter.door_split}%</span>
                </>
              )}
              {counter.merch_split != null && (
                <>
                  <span className="text-muted-foreground">Merch Split</span>
                  <span className="text-foreground">{counter.merch_split}%</span>
                </>
              )}
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">
                {new Date(counter.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            {counter.message && (
              <div>
                <p className="text-xs text-muted-foreground italic">"{counter.message}"</p>
                <TranslateButton text={counter.message} className="mt-1" />
              </div>
            )}

            {/* Response buttons for the latest pending counter (only if not from me) */}
            {counter.status === "pending" && !isFromMe && idx === counters.length - 1 && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => handleAcceptCounter(counter)}
                  disabled={responding === counter.id}
                  className="bg-green-600 hover:bg-green-700 text-foreground active:scale-[0.97] transition-transform w-full sm:w-auto h-9"
                >
                  {responding === counter.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCounterBack}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 active:scale-[0.97] transition-transform w-full sm:w-auto h-9"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Counter Back
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeclineCounter(counter)}
                  disabled={responding === counter.id}
                  className="border-border hover:bg-destructive/10 active:scale-[0.97] transition-transform w-full sm:w-auto h-9"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <CounterOfferDialog
        open={counterDialogOpen}
        onOpenChange={setCounterDialogOpen}
        offerId={offerId}
        currentTerms={currentTerms}
        onCountered={() => {
          // Refetch counters
          supabase
            .from("counter_offers")
            .select("*")
            .eq("offer_id", offerId)
            .order("created_at", { ascending: true })
            .then(({ data }) => setCounters((data as CounterOffer[]) ?? []));
        }}
      />
    </div>
  );
}
