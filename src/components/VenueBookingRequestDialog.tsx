import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FREE_OFFER_LIMIT = 5;

interface Props {
  venueId: string;
  venueName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export default function VenueBookingRequestDialog({ venueId, venueName, open, onOpenChange, onSubmitted }: Props) {
  const { user, profile } = useAuth();
  const [date, setDate] = useState<Date>();
  const [eventType, setEventType] = useState("");
  const [attendance, setAttendance] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const checkLimit = async () => {
    if (!user || profile?.subscription_plan !== "free") return false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Count offers sent + venue booking requests this month
    const [offersRes, requestsRes] = await Promise.all([
      supabase.from("offers").select("id", { count: "exact", head: true }).eq("sender_id", user.id).gte("created_at", monthStart),
      supabase.from("venue_booking_requests" as any).select("id", { count: "exact", head: true }).eq("artist_id", user.id).gte("created_at", monthStart),
    ]);

    const total = (offersRes.count ?? 0) + (requestsRes.count ?? 0);
    if (total >= FREE_OFFER_LIMIT) {
      setLimitReached(true);
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!user || !date || !eventType.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    setSubmitting(true);
    try {
      const overLimit = await checkLimit();
      if (overLimit) {
        toast.error("You've reached your free plan limit of 5 requests/month. Upgrade to Pro for unlimited.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from("venue_booking_requests" as any).insert({
        artist_id: user.id,
        venue_id: venueId,
        proposed_date: format(date, "yyyy-MM-dd"),
        event_type: eventType.trim(),
        expected_attendance: attendance ? parseInt(attendance) : null,
        message: message.trim() || null,
      } as any);

      if (error) throw error;

      toast.success(`Booking request sent to ${venueName}!`);
      onOpenChange(false);
      onSubmitted?.();
      // Reset
      setDate(undefined);
      setEventType("");
      setAttendance("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-syne text-lg">request to book</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-body">
            Send a booking request to <span className="text-role-venue font-semibold">{venueName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Proposed date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-body">proposed date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-body h-11", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Event type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-body">event type *</Label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. DJ set, live band, album release..."
              className="h-11 font-body"
              maxLength={100}
            />
          </div>

          {/* Expected attendance */}
          <div className="space-y-1.5">
            <Label className="text-xs font-body">expected attendance</Label>
            <Input
              type="number"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              placeholder="estimated headcount"
              className="h-11 font-body"
              min={0}
              max={100000}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs font-body">message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="tell the venue about yourself and your event..."
              className="font-body min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">{message.length}/500</p>
          </div>

          {limitReached && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-body">
              You've used all 5 free requests this month. <a href="/pricing" className="underline font-semibold">Upgrade to Pro</a> for unlimited.
            </div>
          )}

          {profile?.subscription_plan === "free" && (
            <p className="text-[10px] text-muted-foreground font-body">
              This counts toward your 5 free offers/month limit.
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !date || !eventType.trim()}
            className="w-full h-12 bg-role-venue text-background font-syne font-bold hover:bg-role-venue/90 active:scale-[0.97] transition-transform"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            send request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
