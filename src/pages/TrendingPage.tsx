import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Flame, Star, Sparkles, UserPlus } from "lucide-react";
import SEO from "@/components/SEO";

type ArtistRow = {
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  genre: string | null;
  city: string | null;
  state: string | null;
  slug: string | null;
  is_verified: boolean | null;
};

type BookingRow = {
  artist_id: string;
  created_at: string;
  guarantee: number;
  status: string;
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Trending() {
  const [tab, setTab] = useState("booked");

  const { data: profiles } = useQuery({
    queryKey: ["trending-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, avatar_url, genre, city, state, slug, is_verified")
        .eq("role", "artist");
      return (data ?? []) as ArtistRow[];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["trending-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("artist_id, created_at, guarantee, status")
        .eq("status", "confirmed");
      return (data ?? []) as BookingRow[];
    },
  });

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const artistMap = useMemo(() => {
    const m = new Map<string, ArtistRow>();
    (profiles ?? []).forEach(p => { if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  // Most booked this month
  const mostBooked = useMemo(() => {
    const counts = new Map<string, number>();
    (bookings ?? []).forEach(b => {
      const d = new Date(b.created_at);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        counts.set(b.artist_id, (counts.get(b.artist_id) ?? 0) + 1);
      }
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id, count], i) => ({ id, count, rank: i + 1, profile: artistMap.get(id) }));
  }, [bookings, artistMap, thisMonth, thisYear]);

  // Rising — biggest % increase in bookings this month vs last
  const rising = useMemo(() => {
    const thisM = new Map<string, number>();
    const lastM = new Map<string, number>();
    (bookings ?? []).forEach(b => {
      const d = new Date(b.created_at);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        thisM.set(b.artist_id, (thisM.get(b.artist_id) ?? 0) + 1);
      }
      if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        lastM.set(b.artist_id, (lastM.get(b.artist_id) ?? 0) + 1);
      }
    });
    const ids = new Set([...thisM.keys(), ...lastM.keys()]);
    const entries: { id: string; pct: number; thisCount: number; lastCount: number }[] = [];
    ids.forEach(id => {
      const t = thisM.get(id) ?? 0;
      const l = lastM.get(id) ?? 0;
      const pct = l === 0 ? (t > 0 ? 100 : 0) : Math.round(((t - l) / l) * 100);
      if (pct > 0) entries.push({ id, pct, thisCount: t, lastCount: l });
    });
    return entries
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 20)
      .map((e, i) => ({ ...e, rank: i + 1, profile: artistMap.get(e.id) }));
  }, [bookings, artistMap, thisMonth, thisYear, lastMonth, lastMonthYear]);

  // Highest score — total guarantee earned
  const highestScore = useMemo(() => {
    const totals = new Map<string, number>();
    (bookings ?? []).forEach(b => {
      totals.set(b.artist_id, (totals.get(b.artist_id) ?? 0) + Number(b.guarantee));
    });
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id, total], i) => ({ id, total, rank: i + 1, profile: artistMap.get(id) }));
  }, [bookings, artistMap]);

  // New arrivals — newest profiles
  const newArrivals = useMemo(() => {
    return [...(profiles ?? [])]
      .sort((a, b) => 0) // already sorted by creation in DB, just take last 20
      .slice(-20)
      .reverse()
      .map((p, i) => ({ profile: p, rank: i + 1 }));
  }, [profiles]);

  return (
    <>
      <SEO title="Trending Artists | GetBooked.Live" description="Discover trending artists and rising talent on GetBooked.Live." />
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-syne font-bold text-foreground">trending</h1>
          <p className="text-sm text-muted-foreground mt-1">Discover who's making waves right now</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-card border border-border mb-6 h-auto flex-wrap">
            <TabsTrigger value="booked" className="flex-1 min-w-[100px] text-xs gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Most Booked
            </TabsTrigger>
            <TabsTrigger value="rising" className="flex-1 min-w-[100px] text-xs gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Rising
            </TabsTrigger>
            <TabsTrigger value="score" className="flex-1 min-w-[100px] text-xs gap-1.5">
              <Star className="w-3.5 h-3.5" /> Top Earners
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1 min-w-[100px] text-xs gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> New Arrivals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="booked">
            <div className="space-y-2">
              {mostBooked.length === 0 && <EmptyState />}
              {mostBooked.map(a => (
                <RankCard
                  key={a.id}
                  rank={a.rank}
                  profile={a.profile}
                  metric={`${a.count} booking${a.count > 1 ? "s" : ""} this month`}
                  trend="up"
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rising">
            <div className="space-y-2">
              {rising.length === 0 && <EmptyState />}
              {rising.map(a => (
                <RankCard
                  key={a.id}
                  rank={a.rank}
                  profile={a.profile}
                  metric={`+${a.pct}% vs last month`}
                  trend="up"
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="score">
            <div className="space-y-2">
              {highestScore.length === 0 && <EmptyState />}
              {highestScore.map(a => (
                <RankCard
                  key={a.id}
                  rank={a.rank}
                  profile={a.profile}
                  metric={`$${a.total.toLocaleString()} earned`}
                  trend="neutral"
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new">
            <div className="space-y-2">
              {newArrivals.length === 0 && <EmptyState />}
              {newArrivals.map(a => (
                <RankCard
                  key={a.profile?.user_id ?? String(a.rank)}
                  rank={a.rank}
                  profile={a.profile}
                  metric="Just joined"
                  trend="new"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Get discovered CTA */}
        <div className="mt-10 rounded-xl border border-border bg-card p-6 text-center">
          <UserPlus className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="font-syne font-semibold text-foreground text-lg mb-1">Get discovered</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Complete your profile to appear on the trending page and get found by promoters.
          </p>
          <Link to="/profile-setup">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform">
              Complete profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

function RankCard({
  rank,
  profile,
  metric,
  trend,
}: {
  rank: number;
  profile?: ArtistRow;
  metric: string;
  trend: "up" | "down" | "neutral" | "new";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : trend === "new" ? Sparkles : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : trend === "new" ? "text-primary" : "text-muted-foreground";

  return (
    <Link
      to={profile?.slug ? `/p/${profile.slug}` : "#"}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-card/80 transition-colors active:scale-[0.98]"
    >
      <span className="w-7 text-center font-syne font-bold text-muted-foreground text-sm">{rank}</span>
      <Avatar className="h-9 w-9">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name ?? ""} />}
        <AvatarFallback className="bg-muted text-xs">{initials(profile?.display_name ?? null)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">{profile?.display_name ?? "Unknown"}</span>
          {profile?.is_verified && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">✓</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {[profile?.genre, profile?.city].filter(Boolean).join(" · ") || "—"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">{metric}</span>
        <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-muted-foreground">No data yet — check back soon.</p>
    </div>
  );
}
