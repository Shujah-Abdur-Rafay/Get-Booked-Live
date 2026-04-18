import { useState, useMemo } from "react";
import { CalendarPlus, Share2, ExternalLink, Link2, ChevronDown, ChevronUp, MapPin, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const ACCENT = "#C8FF3E";

type Booking = {
  id: string;
  offer_id: string;
  contract_url: string | null;
  status: string;
  artist_id: string;
  promoter_id: string;
  venue_name: string;
  event_date: string;
  event_time?: string | null;
  guarantee: number;
};

type Props = {
  bookings: Booking[];
  loading: boolean;
};

function formatGcalDate(date: string, time?: string | null) {
  const d = new Date(date + "T" + (time ?? "20:00") + ":00");
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function EventCard({ booking }: { booking: Booking }) {
  const [ticketUrl, setTicketUrl] = useState("");
  const isPast = new Date(booking.event_date) < new Date();
  const dateStr = new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const gcalUrl = useMemo(() => {
    const start = formatGcalDate(booking.event_date, booking.event_time);
    const end = formatGcalDate(booking.event_date, booking.event_time);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.venue_name)}&dates=${start}/${end}&details=${encodeURIComponent(`Guarantee: $${booking.guarantee.toLocaleString()}`)}`;
  }, [booking]);

  const handleShare = () => {
    const url = `${window.location.origin}/p/${booking.artist_id}`;
    navigator.clipboard.writeText(url);
    toast.success("Event link copied!");
  };

  return (
    <div className={`rounded-lg border border-white/[0.06] bg-[#0e1420] ${isPast ? "opacity-60" : ""} hover:border-white/[0.12] transition-colors`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold truncate">{booking.venue_name}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {dateStr}
                {booking.event_time && ` · ${booking.event_time}`}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-display text-sm font-bold tabular-nums" style={{ color: ACCENT }}>
              ${booking.guarantee.toLocaleString()}
            </span>
            <div className="mt-1">
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                booking.status === "confirmed" ? "bg-green-500/10 text-green-400" :
                booking.status === "completed" ? "bg-[#3EC8FF]/10 text-[#3EC8FF]" :
                "bg-white/5 text-muted-foreground"
              }`}>
                {booking.status}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
          {!isPast && (
            <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-[0.97] px-2.5">
                <CalendarPlus className="w-3 h-3 mr-1" /> Google Calendar
              </Button>
            </a>
          )}
          <Button size="sm" variant="ghost" onClick={handleShare} className="h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-[0.97] px-2.5">
            <Share2 className="w-3 h-3 mr-1" /> Share
          </Button>
          <a href={`#`} onClick={(e) => e.preventDefault()}>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] hover:bg-white/5 active:scale-[0.97] px-2.5" style={{ color: ACCENT }}>
              <ExternalLink className="w-3 h-3 mr-1" /> Deal room
            </Button>
          </a>
        </div>

        {/* Ticket URL */}
        {!isPast && (
          <div className="flex items-center gap-2 mt-2">
            <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
            <Input
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="Paste ticket link..."
              className="h-7 text-[11px] bg-transparent border-white/[0.06] focus:border-white/[0.12] px-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsTab({ bookings, loading }: Props) {
  const [showPast, setShowPast] = useState(false);
  const now = new Date();

  const upcoming = useMemo(
    () => bookings.filter((b) => new Date(b.event_date) >= now).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()),
    [bookings]
  );

  const past = useMemo(
    () => bookings.filter((b) => new Date(b.event_date) < now).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
    [bookings]
  );

  if (loading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg bg-[#0e1420]" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      <div>
        <h3 className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">
          upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
            <CalendarPlus className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No upcoming events — accept offers to see them here.</p>
          </div>
        ) : (
          <div className="space-y-2">{upcoming.map((b) => <EventCard key={b.id} booking={b} />)}</div>
        )}
      </div>

      {/* Past shows */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest mb-3"
          >
            {showPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            past shows ({past.length})
          </button>
          {showPast && (
            <div className="space-y-2">{past.map((b) => <EventCard key={b.id} booking={b} />)}</div>
          )}
        </div>
      )}
    </div>
  );
}
