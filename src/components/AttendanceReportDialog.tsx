import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    venue_name: string;
    event_date: string;
    guarantee: number;
    artist_id: string;
    promoter_id: string;
  };
  onReported?: () => void;
};

export default function AttendanceReportDialog({ open, onOpenChange, booking, onReported }: Props) {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !attendance) return;
    setSubmitting(true);

    const { error } = await supabase.from("show_attendance" as any).insert({
      booking_id: booking.id,
      venue_name: booking.venue_name,
      artist_id: booking.artist_id,
      promoter_id: booking.promoter_id,
      actual_attendance: parseInt(attendance),
      venue_capacity: capacity ? parseInt(capacity) : null,
      reported_by: user.id,
    });

    if (error) {
      if (error.code === "23505") toast.error("Attendance already reported for this booking");
      else toast.error(error.message);
    } else {
      toast.success("Attendance reported!");
      onReported?.();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-syne flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Report Attendance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-xs text-muted-foreground">
            {booking.venue_name} · {new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          <div>
            <Label className="text-xs">Actual Attendance *</Label>
            <Input
              type="number"
              min="0"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              placeholder="e.g. 847"
              className="mt-1 bg-background border-border"
            />
          </div>

          <div>
            <Label className="text-xs">Venue Capacity (optional)</Label>
            <Input
              type="number"
              min="0"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 1200"
              className="mt-1 bg-background border-border"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!attendance || submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
