import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Share2, Check, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { differenceInSeconds, format, isToday, isPast, parse } from "date-fns";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  venue_name: string;
  event_date: string;
  event_time: string | null;
  status: string;
};

type Props = {
  artistUserId: string;
  artistName: string;
  isOwner: boolean;
};

const STATUS_STEPS = [
  { key: "arrived", label: "I'm here", icon: MapPin },
  { key: "soundcheck", label: "Soundcheck done", icon: Check },
  { key: "onstage", label: "On stage now", icon: Radio },
] as const;

export default function ShowNightMode({ artistUserId, artistName, isOwner }: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatus, setShowStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");

  // Fetch today's confirmed booking
  useEffect(() => {
    const load = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("id, venue_name, event_date, event_time, status")
        .eq("artist_id", artistUserId)
        .eq("event_date", today)
        .eq("status", "confirmed")
        .limit(1)
        .single();
      setBooking((data as Booking) ?? null);
      setLoading(false);
    };
    load();
  }, [artistUserId]);

  // Live countdown
  useEffect(() => {
    if (!booking?.event_time) return;
    const update = () => {
      const now = new Date();
      const showtime = parse(
        `${booking.event_date} ${booking.event_time}`,
        "yyyy-MM-dd HH:mm:ss",
        new Date()
      );
      const diff = differenceInSeconds(showtime, now);
      if (diff <= 0) {
        setCountdown("Live now");
        return;
      }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const handleStatusUpdate = (status: string) => {
    setShowStatus(status);
    toast.success(
      status === "arrived" ? "Marked as arrived!" :
      status === "soundcheck" ? "Soundcheck complete!" :
      "You're on stage! 🎤"
    );
  };

  const handleShare = () => {
    const text = `🎤 ${artistName} is performing tonight at ${booking?.venue_name}!`;
    if (navigator.share) {
      navigator.share({ title: text, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast.success("Copied to clipboard!");
    }
  };

  const mapsUrl = booking
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.venue_name)}`
    : "#";

  if (loading || !booking) return null;

  const isLive = countdown === "Live now";
  const currentStatusIdx = STATUS_STEPS.findIndex(s => s.key === showStatus);

  return (
    <div className={cn(
      "rounded-xl border p-5 mb-4 transition-all",
      isLive
        ? "bg-primary/5 border-primary/20 animate-pulse"
        : "bg-card border-white/[0.06]"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full",
          isLive ? "bg-primary animate-pulse" : "bg-amber-400"
        )} />
        <h2 className="font-syne text-sm font-bold uppercase tracking-wider text-foreground">
          {isLive ? "Live Now" : "Show Tonight"}
        </h2>
      </div>

      {/* Countdown */}
      {booking.event_time && (
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground mb-1">
            {isLive ? "On stage" : "Showtime countdown"}
          </p>
          <p className={cn(
            "font-syne font-bold tabular-nums",
            isLive ? "text-3xl text-primary" : "text-3xl text-foreground"
          )}>
            {countdown}
          </p>
          {!isLive && (
            <p className="text-xs text-muted-foreground mt-1">
              Doors at {format(
                parse(booking.event_time, "HH:mm:ss", new Date()),
                "h:mm a"
              )}
            </p>
          )}
        </div>
      )}

      {/* Venue + Map */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg bg-background border border-white/[0.06] hover:border-primary/20 transition-colors mb-4 group"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{booking.venue_name}</p>
          <p className="text-xs text-muted-foreground">Open in Google Maps</p>
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">→</span>
      </a>

      {/* Artist status buttons (owner only) */}
      {isOwner && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-muted-foreground font-medium">Update your status</p>
          <div className="flex gap-2">
            {STATUS_STEPS.map((s, i) => {
              const isActive = showStatus === s.key;
              const isPassed = currentStatusIdx > i;
              const Icon = s.icon;
              return (
                <Button
                  key={s.key}
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusUpdate(s.key)}
                  disabled={isPassed && !isActive}
                  className={cn(
                    "flex-1 h-9 text-xs active:scale-[0.97] transition-all",
                    isActive
                      ? "bg-primary/15 text-primary border-primary/30"
                      : isPassed
                        ? "bg-muted/30 text-muted-foreground border-border"
                        : "border-border hover:border-primary/20"
                  )}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status display for visitors */}
      {!isOwner && showStatus && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-medium text-primary">
            {showStatus === "arrived" && `${artistName} has arrived at the venue`}
            {showStatus === "soundcheck" && `${artistName} just finished soundcheck`}
            {showStatus === "onstage" && `${artistName} is on stage now! 🎤`}
          </p>
        </div>
      )}

      {/* Share */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="w-full border-border text-xs h-9 active:scale-[0.97] transition-transform"
      >
        <Share2 className="w-3.5 h-3.5 mr-1.5" />
        Share tonight's show
      </Button>
    </div>
  );
}
