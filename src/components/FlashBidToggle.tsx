import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Clock, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addHours } from "date-fns";

type Props = {
  availabilityId: string;
  date: string;
  flashBidEnabled: boolean;
  flashBidDeadline: string | null;
  flashBidMinPrice: number;
  onUpdate: () => void;
};

export default function FlashBidToggle({
  availabilityId,
  date,
  flashBidEnabled,
  flashBidDeadline,
  flashBidMinPrice,
  onUpdate,
}: Props) {
  const [enabled, setEnabled] = useState(flashBidEnabled);
  const [hours, setHours] = useState("24");
  const [minPrice, setMinPrice] = useState(String(flashBidMinPrice || ""));
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      setShowConfig(true);
      return;
    }
    // Disable flash bid
    setSaving(true);
    const { error } = await supabase
      .from("artist_availability")
      .update({
        flash_bid_enabled: false,
        flash_bid_deadline: null,
        flash_bid_min_price: 0,
      } as any)
      .eq("id", availabilityId);
    if (error) {
      toast.error("Failed to disable flash bid");
    } else {
      setEnabled(false);
      toast.success("Flash bid disabled");
      onUpdate();
    }
    setSaving(false);
  };

  const handleEnable = async () => {
    setSaving(true);
    const deadline = addHours(new Date(), parseInt(hours) || 24);
    const { error } = await supabase
      .from("artist_availability")
      .update({
        flash_bid_enabled: true,
        flash_bid_deadline: deadline.toISOString(),
        flash_bid_min_price: parseFloat(minPrice) || 0,
      } as any)
      .eq("id", availabilityId);
    if (error) {
      toast.error("Failed to enable flash bid");
    } else {
      setEnabled(true);
      setShowConfig(false);
      toast.success("Flash bid enabled! Promoters can now bid.");
      onUpdate();
    }
    setSaving(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-medium text-foreground">Flash Bid</span>
            {enabled && flashBidDeadline && (
              <p className="text-[10px] text-muted-foreground">
                Ends {format(new Date(flashBidDeadline), "MMM d, h:mm a")}
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={saving}
          className="data-[state=checked]:bg-amber-500"
        />
      </div>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-syne flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Enable Flash Bid
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Open this date for competitive bidding. Promoters see the high bid (not who placed it). The highest bid auto-accepts at the deadline.
          </p>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Bidding window (hours)
              </Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="mt-1.5 bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Minimum bid ($)
              </Label>
              <Input
                type="number"
                min="0"
                step="50"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="mt-1.5 bg-background border-border"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfig(false)}
              className="flex-1 border-border active:scale-[0.97]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnable}
              disabled={saving}
              className="flex-1 bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.97]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Activate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
