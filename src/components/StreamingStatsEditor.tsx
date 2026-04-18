import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music2, Loader2, Check } from "lucide-react";

const ACCENT = "#C8FF3E";

type StreamingStats = {
  monthly_listeners?: number;
  followers?: number;
  top_city?: string;
  top_track?: string;
  source?: "manual" | "spotify_api";
  updated_at?: string;
};

export default function StreamingStatsEditor() {
  const { user, profile, refreshProfile } = useAuth();
  const existing: StreamingStats = (profile as any)?.streaming_stats ?? {};

  const [listeners, setListeners] = useState(existing.monthly_listeners?.toString() ?? "");
  const [followers, setFollowers] = useState(existing.followers?.toString() ?? "");
  const [topCity, setTopCity] = useState(existing.top_city ?? "");
  const [topTrack, setTopTrack] = useState(existing.top_track ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const stats: StreamingStats = {
      monthly_listeners: listeners ? parseInt(listeners) : undefined,
      followers: followers ? parseInt(followers) : undefined,
      top_city: topCity || undefined,
      top_track: topTrack || undefined,
      source: "manual",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .update({ streaming_stats: stats } as any)
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Streaming stats saved!");
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Music2 className="w-4 h-4" style={{ color: ACCENT }} />
        <h3 className="text-sm font-display font-semibold">Streaming Stats</h3>
        {existing.source && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/[0.06]" style={{ color: "#1DB954" }}>
            <Check className="w-3 h-3" /> {existing.source === "spotify_api" ? "Spotify verified" : "Manual entry"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        Enter your streaming numbers. These appear on your public profile.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px]">Monthly listeners</Label>
          <Input type="number" value={listeners} onChange={(e) => setListeners(e.target.value)} placeholder="2400000" className="mt-1 h-8 text-xs bg-background border-border" />
        </div>
        <div>
          <Label className="text-[11px]">Followers</Label>
          <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="500000" className="mt-1 h-8 text-xs bg-background border-border" />
        </div>
        <div>
          <Label className="text-[11px]">Top city</Label>
          <Input value={topCity} onChange={(e) => setTopCity(e.target.value)} placeholder="Miami" className="mt-1 h-8 text-xs bg-background border-border" />
        </div>
        <div>
          <Label className="text-[11px]">#1 track</Label>
          <Input value={topTrack} onChange={(e) => setTopTrack(e.target.value)} placeholder="Track name" className="mt-1 h-8 text-xs bg-background border-border" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="mt-4 h-8 text-xs active:scale-[0.97] transition-transform" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Save stats
      </Button>
    </div>
  );
}
