// IMPROVEMENT 6: "Open for bookings" toggle on artist dashboard.
// Stores state in profiles.accepting_bookings (boolean, default true).
// Shows green "Taking bookings" or muted "Not accepting" badge on directory cards.
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function OpenForBookingsToggle() {
  const { user, profile, refreshProfile } = useAuth();
  const [accepting, setAccepting] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Read from profile; default to true if column not yet populated
    const val = (profile as any)?.accepting_bookings;
    setAccepting(val === undefined || val === null ? true : Boolean(val));
  }, [profile]);

  const handleToggle = async (value: boolean) => {
    if (!user) return;
    setAccepting(value);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ accepting_bookings: value } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(value ? "You're now open for bookings" : "Bookings paused");
    } catch (err: any) {
      toast.error(err.message || "Could not update booking status");
      setAccepting(!value); // revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0e1420] px-4 py-3 mb-4">
      <div className="flex items-center gap-3">
        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body transition-colors ${
            accepting
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-white/[0.04] text-muted-foreground border border-white/[0.06]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${accepting ? "bg-green-400" : "bg-muted-foreground"}`}
          />
          {accepting ? "Taking bookings" : "Not accepting"}
        </span>
        <Label htmlFor="open-for-bookings" className="text-sm font-medium text-foreground cursor-pointer">
          Open for bookings
        </Label>
      </div>
      <Switch
        id="open-for-bookings"
        checked={accepting}
        onCheckedChange={handleToggle}
        disabled={saving}
        aria-label="Toggle open for bookings"
      />
    </div>
  );
}
