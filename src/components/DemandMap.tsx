import { useMemo } from "react";
import { TrendingUp, Flame } from "lucide-react";

const ACCENT = "#C8FF3E";

type DemandCity = {
  city: string;
  listeners: number;
};

type Props = {
  cities: DemandCity[];
};

export default function DemandMap({ cities }: Props) {
  const maxListeners = useMemo(() => {
    if (!cities || cities.length === 0) return 0;
    return Math.max(...cities.map((c) => c.listeners));
  }, [cities]);

  if (!cities || cities.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-white/[0.06] p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />
        <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Demand Map</h2>
      </div>

      <div className="space-y-2">
        {cities.slice(0, 10).map((city, i) => {
          const pct = maxListeners > 0 ? (city.listeners / maxListeners) * 100 : 0;
          const isHot = pct >= 80;

          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium truncate">{city.city}</span>
                  {isHot && <Flame className="w-3 h-3 text-orange-400 shrink-0" />}
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isHot ? "#FF6B35" : ACCENT,
                    }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {city.listeners >= 1000 ? `${(city.listeners / 1000).toFixed(1)}K` : city.listeners}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Badge component for directory cards
export function DemandBadge({ city }: { city: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
      <Flame className="w-3 h-3" /> High demand in {city}
    </span>
  );
}

// Momentum badge for directory cards
export function MomentumBadge({ percentChange }: { percentChange: number }) {
  if (Math.abs(percentChange) <= 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
        → flat
      </span>
    );
  }

  if (percentChange > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-green-400">
        ↑ {Math.round(percentChange)}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-red-400">
      ↓ {Math.abs(Math.round(percentChange))}%
    </span>
  );
}
