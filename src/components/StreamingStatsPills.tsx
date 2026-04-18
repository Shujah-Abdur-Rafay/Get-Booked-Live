import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Music, Youtube, Headphones, CloudRain, RefreshCw } from "lucide-react";

const ACCENT = "#C8FF3E";

type PlatformDef = {
  key: string;
  name: string;
  icon: typeof Music;
  color: string;
  metricKey: string;
  metricLabel: string;
  updatedKey?: string;
};

const PLATFORMS: PlatformDef[] = [
  { key: "spotify", name: "Spotify", icon: Music, color: "#1DB954", metricKey: "monthly_listeners", metricLabel: "monthly listeners" },
  { key: "youtube", name: "YouTube", icon: Youtube, color: "#FF0000", metricKey: "youtube_subscribers", metricLabel: "subscribers" },
  { key: "soundcloud", name: "SoundCloud", icon: CloudRain, color: "#FF5500", metricKey: "soundcloud_plays", metricLabel: "plays" },
];

function formatMetric(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function StreamingStatsPills({ onNavigateToAnalytics }: { onNavigateToAnalytics: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const stats: Record<string, any> = (profile as any)?.streaming_stats ?? {};

  const pills = useMemo(() => {
    return PLATFORMS.map((p) => {
      const value = stats[p.metricKey];
      const connected = value && Number(value) > 0;
      return { ...p, value: connected ? Number(value) : null, connected };
    });
  }, [stats]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">streaming stats</h2>
        <button
          onClick={() => refreshProfile()}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {pills.map((pill) => {
          const Icon = pill.icon;
          if (pill.connected) {
            return (
              <div
                key={pill.key}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0e1420] px-3 py-2"
              >
                <Icon className="w-3.5 h-3.5" style={{ color: pill.color }} />
                <div className="flex flex-col">
                  <span className="text-xs font-display font-bold text-foreground tabular-nums">
                    {formatMetric(pill.value!)} <span className="text-[10px] font-normal text-muted-foreground">{pill.metricLabel}</span>
                  </span>
                  {stats.updated_at && (
                    <span className="text-[9px] text-muted-foreground/60">synced {timeSince(stats.updated_at)}</span>
                  )}
                </div>
              </div>
            );
          }
          return (
            <button
              key={pill.key}
              onClick={onNavigateToAnalytics}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-white/[0.12] transition-colors"
            >
              <Icon className="w-3.5 h-3.5" style={{ color: pill.color, opacity: 0.4 }} />
              Connect {pill.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}