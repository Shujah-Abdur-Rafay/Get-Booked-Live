import { useState, useEffect } from "react";
import { Zap, Clock } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";

type Props = {
  deadline: string;
  bidCount: number;
  compact?: boolean;
};

export default function FlashBidBadge({ deadline, bidCount, compact }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const isExpired = isPast(new Date(deadline));

  useEffect(() => {
    const update = () => {
      if (isPast(new Date(deadline))) {
        setTimeLeft("Ended");
      } else {
        setTimeLeft(formatDistanceToNow(new Date(deadline), { addSuffix: false }));
      }
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (isExpired) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold animate-pulse">
        <Zap className="w-2.5 h-2.5" />
        Flash
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
      <Zap className="w-3 h-3 text-amber-400" />
      <span className="text-amber-400 font-medium">{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground flex items-center gap-0.5">
        <Clock className="w-2.5 h-2.5" />
        {timeLeft}
      </span>
    </div>
  );
}
