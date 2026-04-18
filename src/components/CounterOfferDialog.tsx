import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ArrowRightLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CounterOfferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  currentTerms: {
    guarantee: number;
    doorSplit: number | null;
    merchSplit: number | null;
    eventDate: string;
    eventTime: string | null;
    venueName: string;
  };
  onCountered: () => void;
};

export default function CounterOfferDialog({
  open, onOpenChange, offerId, currentTerms, onCountered,
}: CounterOfferDialogProps) {
  const { user } = useAuth();
  const [guarantee, setGuarantee] = useState(String(currentTerms.guarantee));
  const [doorSplit, setDoorSplit] = useState(currentTerms.doorSplit != null ? String(currentTerms.doorSplit) : "");
  const [merchSplit, setMerchSplit] = useState(currentTerms.merchSplit != null ? String(currentTerms.merchSplit) : "");
  const [eventDate, setEventDate] = useState<Date | undefined>(
    currentTerms.eventDate ? new Date(currentTerms.eventDate + "T12:00:00") : undefined
  );
  const [eventTime, setEventTime] = useState(currentTerms.eventTime ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasChanges = () => {
    const g = Number(guarantee);
    if (g !== currentTerms.guarantee) return true;
    if (doorSplit && Number(doorSplit) !== currentTerms.doorSplit) return true;
    if (merchSplit && Number(merchSplit) !== currentTerms.merchSplit) return true;
    if (eventDate && format(eventDate, "yyyy-MM-dd") !== currentTerms.eventDate) return true;
    if (eventTime && eventTime !== currentTerms.eventTime) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!hasChanges() && !message.trim()) {
      toast.error("Change at least one term or add a message");
      return;
    }

    const g = Number(guarantee);
    if (isNaN(g) || g < 0) {
      toast.error("Enter a valid guarantee amount");
      return;
    }

    setSubmitting(true);
    try {
      // Insert counter offer
      const { error: counterErr } = await supabase.from("counter_offers").insert({
        offer_id: offerId,
        sender_id: user.id,
        guarantee: g,
        door_split: doorSplit ? Number(doorSplit) : null,
        merch_split: merchSplit ? Number(merchSplit) : null,
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : currentTerms.eventDate,
        event_time: eventTime || null,
        message: message.trim() || null,
        status: "pending",
      } as any);

      if (counterErr) { toast.error(counterErr.message); return; }

      // Update offer status to negotiating
      await supabase.from("offers").update({ status: "negotiating" }).eq("id", offerId);

      toast.success("Counter-offer sent!");
      onCountered();
      onOpenChange(false);
    } catch {
      toast.error("Failed to send counter-offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(var(--card))] border-white/[0.06] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-lg">Counter Offer</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Propose different terms for {currentTerms.venueName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Guarantee */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Guarantee ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={guarantee}
                onChange={(e) => setGuarantee(e.target.value)}
                className="bg-background/50 border-white/[0.06] pl-7"
                min={0}
              />
            </div>
            {Number(guarantee) !== currentTerms.guarantee && (
              <p className="text-xs text-[hsl(var(--primary))]">
                Changed from ${currentTerms.guarantee.toLocaleString()}
              </p>
            )}
          </div>

          {/* Splits row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Door Split (%)</Label>
              <Input
                type="number"
                value={doorSplit}
                onChange={(e) => setDoorSplit(e.target.value)}
                placeholder={currentTerms.doorSplit != null ? String(currentTerms.doorSplit) : "—"}
                className="bg-background/50 border-white/[0.06]"
                min={0} max={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Merch Split (%)</Label>
              <Input
                type="number"
                value={merchSplit}
                onChange={(e) => setMerchSplit(e.target.value)}
                placeholder={currentTerms.merchSplit != null ? String(currentTerms.merchSplit) : "—"}
                className="bg-background/50 border-white/[0.06]"
                min={0} max={100}
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Event Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background/50 border-white/[0.06]",
                    !eventDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Event Time</Label>
            <Input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="bg-background/50 border-white/[0.06]"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your counter-offer..."
              className="bg-background/50 border-white/[0.06] resize-none h-20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-white/[0.06] active:scale-[0.97] transition-transform"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.97] transition-transform font-medium"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Sending...</>
            ) : (
              <><ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Send Counter</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
