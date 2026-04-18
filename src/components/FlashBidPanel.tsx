import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, TrendingUp, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, isPast } from "date-fns";

type Bid = {
  id: string;
  amount: number;
  bidder_id: string;
  status: string;
  created_at: string;
};

type Props = {
  availabilityId: string;
  artistId: string;
  deadline: string;
  minPrice: number;
};

export default function FlashBidPanel({ availabilityId, artistId, deadline, minPrice }: Props) {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const isExpired = isPast(new Date(deadline));

  // Countdown timer
  useEffect(() => {
    const update = () => {
      if (isPast(new Date(deadline))) {
        setTimeLeft("Ended");
      } else {
        setTimeLeft(formatDistanceToNow(new Date(deadline), { addSuffix: false }) + " left");
      }
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Fetch bids
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("flash_bids" as any)
        .select("id, amount, bidder_id, status, created_at")
        .eq("availability_id", availabilityId)
        .eq("status", "active")
        .order("amount", { ascending: false });
      setBids((data as any[]) ?? []);
      setLoading(false);
    };
    load();

    const interval = window.setInterval(load, 10000);
    return () => { window.clearInterval(interval); };
  }, [availabilityId]);

  const highBid = bids.length > 0 ? bids[0].amount : 0;
  const bidCount = bids.length;
  const userHasBid = bids.some(b => b.bidder_id === user?.id);
  const userBid = bids.find(b => b.bidder_id === user?.id);

  const handleBid = async () => {
    if (!user) return;
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid bid amount");
      return;
    }
    if (amount < minPrice) {
      toast.error(`Minimum bid is $${minPrice.toLocaleString()}`);
      return;
    }
    if (amount <= highBid) {
      toast.error(`Bid must be higher than current high of $${highBid.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    // If user already has a bid, we can't update (no update policy for bidders), place a new one
    // Actually let's just insert a new bid each time — the highest one wins
    const { error } = await supabase
      .from("flash_bids" as any)
      .insert({
        availability_id: availabilityId,
        artist_id: artistId,
        bidder_id: user.id,
        amount,
      } as any);

    if (error) {
      toast.error("Failed to place bid");
    } else {
      toast.success(`Bid of $${amount.toLocaleString()} placed!`);
      setBidAmount("");
      const { data } = await supabase
        .from("flash_bids" as any)
        .select("id, amount, bidder_id, status, created_at")
        .eq("availability_id", availabilityId)
        .eq("status", "active")
        .order("amount", { ascending: false });
      setBids((data as any[]) ?? []);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold font-syne text-foreground">Flash Bid</span>
        </div>
        <span className={`text-xs font-medium flex items-center gap-1 ${isExpired ? "text-red-400" : "text-amber-400"}`}>
          <Clock className="w-3 h-3" />
          {timeLeft}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{bidCount} bid{bidCount !== 1 ? "s" : ""} placed</span>
        {highBid > 0 && (
          <span className="flex items-center gap-1 text-primary font-medium">
            <TrendingUp className="w-3 h-3" />
            High: ${highBid.toLocaleString()}
          </span>
        )}
        {minPrice > 0 && <span>Min: ${minPrice.toLocaleString()}</span>}
      </div>

      {/* Bid input (only for non-artists, non-expired) */}
      {!isExpired && user && user.id !== artistId && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="number"
              min={Math.max(minPrice, highBid + 1)}
              step="50"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`$${Math.max(minPrice, highBid + 1).toLocaleString()}+`}
              className="bg-background border-border h-9 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={handleBid}
            disabled={submitting}
            className="bg-amber-500 text-black hover:bg-amber-400 h-9 active:scale-[0.97]"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Bid"}
          </Button>
        </div>
      )}

      {userHasBid && userBid && (
        <p className="text-xs text-muted-foreground">
          Your bid: <span className="font-medium text-foreground">${userBid.amount.toLocaleString()}</span>
          {userBid.amount === highBid ? (
            <span className="text-primary ml-1">· Leading</span>
          ) : (
            <span className="text-amber-400 ml-1">· Outbid</span>
          )}
        </p>
      )}

      {isExpired && (
        <p className="text-xs text-muted-foreground">
          Bidding has ended.{" "}
          {highBid > 0 ? `Winning bid: $${highBid.toLocaleString()}` : "No bids were placed."}
        </p>
      )}
    </div>
  );
}
