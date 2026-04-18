import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type TourStop = {
  id: string;
  venue_name: string;
  city: string | null;
  state: string | null;
  date: string;
  load_in_time: string | null;
  sound_check_time: string | null;
  doors_time: string | null;
  show_time: string | null;
  guarantee: number | null;
  notes: string | null;
};

interface EditStopDialogProps {
  stop: TourStop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Partial<TourStop>) => void;
  onDeleted?: (id: string) => void;
}

export default function EditStopDialog({ stop, open, onOpenChange, onSaved, onDeleted }: EditStopDialogProps) {
  const [form, setForm] = useState({
    venue_name: stop.venue_name,
    city: stop.city ?? "",
    state: stop.state ?? "",
    date: stop.date,
    show_time: stop.show_time ?? "",
    load_in_time: stop.load_in_time ?? "",
    sound_check_time: stop.sound_check_time ?? "",
    doors_time: stop.doors_time ?? "",
    guarantee: stop.guarantee?.toString() ?? "",
    notes: stop.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      venue_name: form.venue_name,
      city: form.city || null,
      state: form.state || null,
      date: form.date,
      show_time: form.show_time || null,
      load_in_time: form.load_in_time || null,
      sound_check_time: form.sound_check_time || null,
      doors_time: form.doors_time || null,
      guarantee: parseFloat(form.guarantee) || 0,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("tour_stops").update(updates).eq("id", stop.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Stop updated");
    onSaved(updates);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("tour_stops").delete().eq("id", stop.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Stop deleted");
    onDeleted?.(stop.id);
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit tour stop</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Venue</Label>
            <Input value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} className="mt-1 bg-background border-border" maxLength={200} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1 bg-background border-border" maxLength={100} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} className="mt-1 bg-background border-border" maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Guarantee ($)</Label>
              <Input type="number" min="0" value={form.guarantee} onChange={(e) => set("guarantee", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Load-in time</Label>
              <Input type="time" value={form.load_in_time} onChange={(e) => set("load_in_time", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Soundcheck</Label>
              <Input type="time" value={form.sound_check_time} onChange={(e) => set("sound_check_time", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Doors</Label>
              <Input type="time" value={form.doors_time} onChange={(e) => set("doors_time", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Show time</Label>
              <Input type="time" value={form.show_time} onChange={(e) => set("show_time", e.target.value)} className="mt-1 bg-background border-border" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1 bg-background border-border" rows={2} maxLength={500} placeholder="Hotel, flight info, transport notes..." />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 mr-auto">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete stop
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Delete this stop?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{form.venue_name}" from the tour. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.venue_name.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
