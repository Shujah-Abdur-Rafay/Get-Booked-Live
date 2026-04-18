import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, MapPin, Lock, Flame, DollarSign, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import SEO from "@/components/SEO";

type GenreCity = { genre: string; city: string; avg_guarantee: number; count: number };
type TrendingArtist = { user_id: string; display_name: string; genre: string; booking_count: number };
type HeatmapCell = { city: string; month: string; count: number };

const GENRE_COLORS: Record<string, string> = {
  "Hip-Hop": "#C8FF3E", "R&B": "#FF5C8A", "Electronic": "#3EC8FF", "Pop": "#FFB83E",
  "Rock": "#7B5CF0", "Latin": "#3EFFBE", "Country": "#FF8C3E", "Jazz": "#5CE1FF",
};

function blurClass(isPro: boolean) {
  return isPro ? "" : "blur-sm select-none pointer-events-none";
}

export default function Insights() {
  const { user, profile } = useAuth();
  const isPro = profile?.subscription_plan === "pro" || profile?.subscription_plan === "agency";
  const [genreCity, setGenreCity] = useState<GenreCity[]>([]);
  const [trending, setTrending] = useState<TrendingArtist[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [myRate, setMyRate] = useState<{ avg: number; min: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

      // Avg guarantee by genre + city from bookings joined with profiles
      const { data: bookings } = await supabase
        .from("bookings")
        .select("guarantee, venue_name, event_date, artist_id")
        .gte("event_date", ninetyDaysAgo)
        .order("event_date", { ascending: false })
        .limit(500);

      if (bookings && bookings.length > 0) {
        const artistIds = [...new Set(bookings.map((b) => b.artist_id))];
      const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, genre, city, display_name")
          .in("user_id", artistIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

        // Genre+City aggregation
        const gcMap = new Map<string, { total: number; count: number; genre: string; city: string }>();
        bookings.forEach((b) => {
          const p = profileMap.get(b.artist_id);
          const genre = p?.genre || "Other";
          const city = p?.city || "Unknown";
          const key = `${genre}|${city}`;
          const existing = gcMap.get(key) || { total: 0, count: 0, genre, city };
          existing.total += Number(b.guarantee);
          existing.count += 1;
          gcMap.set(key, existing);
        });
        const gcData = Array.from(gcMap.values())
          .map((v) => ({ genre: v.genre, city: v.city, avg_guarantee: Math.round(v.total / v.count), count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12);
        setGenreCity(gcData);

        // Trending by booking velocity
        const velocityMap = new Map<string, { count: number; user_id: string }>();
        bookings.forEach((b) => {
          const existing = velocityMap.get(b.artist_id) || { count: 0, user_id: b.artist_id };
          existing.count += 1;
          velocityMap.set(b.artist_id, existing);
        });
        const topArtists = Array.from(velocityMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);
        const trendingData: TrendingArtist[] = topArtists.map((t) => {
          const p = profileMap.get(t.user_id);
          return { user_id: t.user_id, display_name: p?.display_name ?? "Artist", genre: p?.genre ?? "", booking_count: t.count };
        });
        setTrending(trendingData);

        // Seasonal heatmap
        const heatData = new Map<string, number>();
        bookings.forEach((b) => {
          const p = profileMap.get(b.artist_id);
          const city = p?.city || "Unknown";
          const month = new Date(b.event_date).toLocaleString("en", { month: "short" });
          const key = `${city}|${month}`;
          heatData.set(key, (heatData.get(key) || 0) + 1);
        });
        setHeatmap(Array.from(heatData.entries()).map(([k, v]) => {
          const [city, month] = k.split("|");
          return { city, month, count: v };
        }));

        // My rate vs market (artist only)
        if (profile?.role === "artist" && profile?.genre) {
          const sameGenre = bookings.filter((b) => profileMap.get(b.artist_id)?.genre === profile.genre);
          if (sameGenre.length > 0) {
            const guarantees = sameGenre.map((b) => Number(b.guarantee));
            setMyRate({
              avg: Math.round(guarantees.reduce((a, b) => a + b, 0) / guarantees.length),
              min: Math.min(...guarantees),
              max: Math.max(...guarantees),
            });
          }
        }
      }

      setLoading(false);
    };
    fetchInsights();
  }, [profile]);

  // Chart data for top genres
  const chartData = genreCity.reduce((acc, gc) => {
    const existing = acc.find((a) => a.genre === gc.genre);
    if (existing) { existing.avg = Math.round((existing.avg + gc.avg_guarantee) / 2); }
    else acc.push({ genre: gc.genre, avg: gc.avg_guarantee });
    return acc;
  }, [] as { genre: string; avg: number }[]).slice(0, 8);

  // Heatmap grid
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const heatCities = [...new Set(heatmap.map((h) => h.city))].slice(0, 6);

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <SEO title="Insights & Analytics | GetBooked.Live" description="Track your BookScore, offer funnel, revenue, and genre performance." />
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-syne text-xl sm:text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Market Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time booking market data across 50+ U.S. markets</p>
          </div>
          {!isPro && (
            <Link to="/pricing">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]">
                <Lock className="w-3.5 h-3.5 mr-1" /> Unlock Pro
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Average Guarantee by Genre */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-syne font-semibold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Avg Guarantee by Genre
              </h3>
              <div className={blurClass(isPro)}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="genre" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, "Avg Guarantee"]}
                      />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={GENRE_COLORS[d.genre] || "#C8FF3E"} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Not enough booking data yet</p>
                )}
              </div>
              {!isPro && (
                <div className="flex items-center justify-center mt-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Lock className="w-3 h-3 mr-1" /> Unlock with Pro
                  </Badge>
                </div>
              )}
            </div>

            {/* Trending Artists */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-syne font-semibold text-sm mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF5C8A]" /> Trending Artists
              </h3>
              <div className={blurClass(isPro)}>
                {trending.length > 0 ? (
                  <div className="space-y-2">
                    {trending.map((a, i) => (
                      <div key={a.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground font-mono w-5 text-right">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.display_name}</p>
                          <p className="text-xs text-muted-foreground">{a.genre}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary shrink-0">
                          <TrendingUp className="w-2.5 h-2.5 mr-1" /> {a.booking_count} bookings
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No trending data yet</p>
                )}
              </div>
              {!isPro && (
                <div className="flex items-center justify-center mt-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Lock className="w-3 h-3 mr-1" /> Unlock with Pro
                  </Badge>
                </div>
              )}
            </div>

            {/* Seasonal Demand Heatmap */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-syne font-semibold text-sm mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FFB83E]" /> Seasonal Demand by City
              </h3>
              <div className={blurClass(isPro)}>
                {heatCities.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr>
                          <th className="text-left text-muted-foreground py-1 pr-2">City</th>
                          {months.map((m) => <th key={m} className="text-center text-muted-foreground py-1 px-0.5 w-7">{m}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {heatCities.map((city) => (
                          <tr key={city}>
                            <td className="text-xs text-foreground py-1 pr-2 whitespace-nowrap">{city}</td>
                            {months.map((month) => {
                              const count = heatmap.find((h) => h.city === city && h.month === month)?.count ?? 0;
                              const intensity = count === 0 ? 0 : Math.min(count / 5, 1);
                              return (
                                <td key={month} className="p-0.5">
                                  <div
                                    className="w-full h-5 rounded-sm"
                                    style={{ backgroundColor: count === 0 ? "hsl(var(--muted)/0.3)" : `hsla(75, 100%, 62%, ${0.15 + intensity * 0.7})` }}
                                    title={`${city} ${month}: ${count} bookings`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Not enough data for heatmap</p>
                )}
              </div>
              {!isPro && (
                <div className="flex items-center justify-center mt-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Lock className="w-3 h-3 mr-1" /> Unlock with Pro
                  </Badge>
                </div>
              )}
            </div>

            {/* Your Rate vs Market */}
            {profile?.role === "artist" && (
              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-syne font-semibold text-sm mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#3EFFBE]" /> Your Rate vs Market
                </h3>
                <div className={blurClass(isPro)}>
                  {myRate ? (
                    <div className="space-y-4">
                      <div className="flex items-end gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Your Range</p>
                          <p className="font-syne text-lg font-bold">
                            ${(profile.rate_min ?? 0).toLocaleString()} – ${(profile.rate_max ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mb-1" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Market Avg ({profile.genre})</p>
                          <p className="font-syne text-lg font-bold text-primary">${myRate.avg.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-primary/40"
                          style={{ width: `${Math.min(((profile.rate_max ?? myRate.avg) / myRate.max) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Market range: ${myRate.min.toLocaleString()} – ${myRate.max.toLocaleString()} · Based on {profile.genre} bookings in the last 90 days
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Set your genre and fee range to see market comparison</p>
                  )}
                </div>
                {!isPro && (
                  <div className="flex items-center justify-center mt-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                      <Lock className="w-3 h-3 mr-1" /> Unlock with Pro
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
