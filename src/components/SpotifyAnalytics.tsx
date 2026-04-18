import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Music2, TrendingUp, MapPin, Disc3, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const ACCENT = "#C8FF3E";
const SPOTIFY_GREEN = "#1DB954";

type StreamingStats = {
  monthly_listeners?: number;
  followers?: number;
  genres?: string[];
  popularity?: number;
  top_tracks?: {
    name: string;
    album: string;
    album_art: string;
    popularity: number;
    spotify_url: string;
    uri: string;
  }[];
  top_city?: string;
  source?: string;
  spotify_artist_id?: string;
  updated_at?: string;
};

type StatsSnapshot = {
  snapshot_date: string;
  monthly_listeners: number;
  followers: number;
};

export default function SpotifyAnalytics() {
  const { profile, user, refreshProfile } = useAuth();
  const stats: StreamingStats = (profile as any)?.streaming_stats ?? {};
  const [spotifyUrl, setSpotifyUrl] = useState((profile as any)?.spotify ?? "");
  const [loading, setLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<StatsSnapshot[]>([]);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);

  const fetchSpotifyData = async () => {
    if (!spotifyUrl || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotify-data", {
        body: { spotify_url: spotifyUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Spotify data synced!");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch Spotify data");
    } finally {
      setLoading(false);
    }
  };

  const refreshSpotifyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotify-callback", {
        body: { action: "refresh" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Spotify data refreshed!");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh Spotify data");
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    if (!user || snapshotsLoaded) return;
    const { data } = await supabase
      .from("artist_stats")
      .select("snapshot_date, monthly_listeners, followers")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true })
      .limit(52);
    setSnapshots((data as StatsSnapshot[]) ?? []);
    setSnapshotsLoaded(true);
  };

  // Load snapshots on mount if we have stats
  if (stats.source === "spotify_api" && !snapshotsLoaded) {
    loadSnapshots();
  }

  const isConnected = stats.source === "spotify_api";

  return (
    <div className="space-y-4">
      {/* Connect / Sync section */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Disc3 className="w-4 h-4" style={{ color: SPOTIFY_GREEN }} />
          <h3 className="text-sm font-display font-semibold">Spotify Connect</h3>
          {isConnected && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/[0.06]" style={{ color: SPOTIFY_GREEN }}>
              ✓ Synced
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Paste your Spotify artist URL to pull stats, top tracks, and audience data.
        </p>
        <div className="flex gap-2">
          <Input
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            placeholder="https://open.spotify.com/artist/..."
            className="h-8 text-xs bg-background border-border flex-1"
          />
          <Button onClick={fetchSpotifyData} disabled={loading || !spotifyUrl} size="sm" className="h-8 text-xs shrink-0 active:scale-[0.97]" style={{ backgroundColor: SPOTIFY_GREEN, color: "#000" }}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            {isConnected ? "Refresh" : "Sync"}
          </Button>
        </div>
        {stats.updated_at && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground">
              Last synced: {new Date(stats.updated_at).toLocaleDateString()}
            </p>
            {isConnected && (
              <button
                onClick={refreshSpotifyData}
                disabled={loading}
                className="text-[10px] text-[#1DB954] hover:text-[#1DB954]/80 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh data"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats overview */}
      {isConnected && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "followers", value: stats.followers?.toLocaleString() ?? "—", icon: Music2, color: SPOTIFY_GREEN },
              { label: "popularity", value: stats.popularity ? `${stats.popularity}/100` : "—", icon: TrendingUp, color: ACCENT },
              { label: "genres", value: stats.genres?.length ? stats.genres.slice(0, 2).join(", ") : "—", icon: MapPin, color: "#FFB83E" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3 h-3" style={{ color: s.color }} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
                </div>
                <p className="font-display text-sm font-bold tabular-nums truncate" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Followers trend chart */}
          {snapshots.length > 1 && (
            <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4">
              <h4 className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">Followers trend</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={snapshots.map((s) => ({ date: new Date(s.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: s.followers }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#5A6478" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#5A6478" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: "#141B28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" fill={SPOTIFY_GREEN} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Tracks */}
          {stats.top_tracks && stats.top_tracks.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4">
              <h4 className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">Top tracks</h4>
              <div className="space-y-2">
                {stats.top_tracks.map((track, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-right">{i + 1}</span>
                    {track.album_art && (
                      <img src={track.album_art} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{track.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{track.album}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{track.popularity}/100</span>
                      {track.spotify_url && (
                        <a href={track.spotify_url} target="_blank" rel="noopener noreferrer" className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: SPOTIFY_GREEN }}>
                          play ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Disc3 className="w-3 h-3" style={{ color: SPOTIFY_GREEN }} /> Powered by Spotify
                </p>
              </div>
            </div>
          )}

          {/* Generate Pitch Card */}
          <PitchCardButton />
        </>
      )}
    </div>
  );
}

function PitchCardButton() {
  const [generating, setGenerating] = useState(false);
  const { profile } = useAuth();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pitch-card");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        toast.success("Pitch card generated!");
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate pitch card");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-display font-semibold">Pitch Card / EPK</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Auto-generated PDF with your stats, tracks, and booking info</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} size="sm" className="h-8 text-xs active:scale-[0.97]" style={{ backgroundColor: "#C8FF3E", color: "#080C14" }}>
          {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileDown className="w-3 h-3 mr-1" />}
          {generating ? "Generating..." : "Generate"}
        </Button>
      </div>
      {(profile as any)?.pitch_card_url && (
        <a href={(profile as any).pitch_card_url} target="_blank" rel="noopener noreferrer" className="text-[10px] mt-2 inline-block" style={{ color: "#C8FF3E" }}>
          View current pitch card ↗
        </a>
      )}
    </div>
  );
}
