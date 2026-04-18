import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, MapPin, BarChart3, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminGrowth() {
  const [dateRange, setDateRange] = useState("90");

  const { data: profiles } = useQuery({
    queryKey: ["admin-growth-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, role, created_at, profile_complete, subscription_plan, city, state");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: offers } = useQuery({
    queryKey: ["admin-growth-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("sender_id, recipient_id, created_at, status");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-growth-bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("artist_id, promoter_id, created_at");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(dateRange));
    return d;
  }, [dateRange]);

  // Signup funnel
  const funnel = useMemo(() => {
    const total = profiles?.length ?? 0;
    const completed = profiles?.filter(p => p.profile_complete).length ?? 0;
    const senderIds = new Set(offers?.map(o => o.sender_id));
    const recipientIds = new Set(offers?.map(o => o.recipient_id));
    const offeredUsers = new Set([...senderIds, ...recipientIds]);
    const bookedUsers = new Set([...(bookings?.map(b => b.artist_id) ?? []), ...(bookings?.map(b => b.promoter_id) ?? [])]);

    return [
      { step: "signups", count: total },
      { step: "profile complete", count: completed },
      { step: "sent/received offer", count: offeredUsers.size },
      { step: "first booking", count: bookedUsers.size },
    ];
  }, [profiles, offers, bookings]);

  // Weekly signups trend
  const weeklySignups = useMemo(() => {
    const weeks: Record<string, number> = {};
    profiles?.filter(p => new Date(p.created_at) >= cutoff).forEach(p => {
      const d = new Date(p.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks[key] = (weeks[key] || 0) + 1;
    });
    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  }, [profiles, cutoff]);

  // Role ratio
  const roleRatio = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles?.forEach(p => { counts[p.role || "none"] = (counts[p.role || "none"] || 0) + 1; });
    return counts;
  }, [profiles]);

  const artistCount = roleRatio.artist ?? 0;
  const promoterCount = roleRatio.promoter ?? 0;
  const ratio = promoterCount > 0 ? (artistCount / promoterCount).toFixed(1) : "∞";

  // Geographic breakdown
  const geoData = useMemo(() => {
    const cities: Record<string, number> = {};
    profiles?.forEach(p => {
      if (p.city) {
        const key = p.state ? `${p.city}, ${p.state}` : p.city;
        cities[key] = (cities[key] || 0) + 1;
      }
    });
    return Object.entries(cities)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [profiles]);

  // Retention (simplified: % of users who created at least one offer within 7/30/90 days of signup)
  const retention = useMemo(() => {
    if (!profiles || !offers) return { d7: 0, d30: 0, d90: 0 };
    const offerDates: Record<string, Date> = {};
    offers.forEach(o => {
      if (!offerDates[o.sender_id] || new Date(o.created_at) < offerDates[o.sender_id]) {
        offerDates[o.sender_id] = new Date(o.created_at);
      }
    });

    let total = 0, r7 = 0, r30 = 0, r90 = 0;
    profiles.forEach(p => {
      const signupDate = new Date(p.created_at);
      const now = new Date();
      const daysSinceSignup = (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSignup < 7) return; // Too new to measure
      total++;
      const firstOffer = offerDates[p.user_id];
      if (firstOffer) {
        const daysToOffer = (firstOffer.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysToOffer <= 7) r7++;
        if (daysToOffer <= 30) r30++;
        if (daysToOffer <= 90) r90++;
      }
    });

    return {
      d7: total > 0 ? Math.round((r7 / total) * 100) : 0,
      d30: total > 0 ? Math.round((r30 / total) * 100) : 0,
      d90: total > 0 ? Math.round((r90 / total) * 100) : 0,
    };
  }, [profiles, offers]);

  const ROLE_COLORS: Record<string, string> = {
    artist: "#C8FF3E", promoter: "#FF5C8A", venue: "#FFB83E",
    production: "#7B5CF0", photo_video: "#3EC8FF", none: "#5A6478",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-syne font-bold text-xl text-[#F0F2F7] lowercase">growth</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32 bg-[#0E1420] border-white/[0.06] text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">last 30 days</SelectItem>
            <SelectItem value="90">last 90 days</SelectItem>
            <SelectItem value="365">last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Signup funnel */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5 mb-6">
        <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">signup funnel</h2>
        <div className="flex items-center gap-2">
          {funnel.map((f, i) => {
            const prevCount = i > 0 ? funnel[i - 1].count : f.count;
            const convRate = prevCount > 0 ? Math.round((f.count / prevCount) * 100) : 100;
            return (
              <div key={f.step} className="flex items-center gap-2 flex-1">
                <div className="flex-1 bg-[#141B28] rounded-lg p-3 text-center">
                  <p className="text-lg font-syne font-bold text-[#F0F2F7] tabular-nums">{f.count}</p>
                  <p className="text-[10px] text-[#5A6478] lowercase">{f.step}</p>
                  {i > 0 && (
                    <p className={`text-[10px] font-syne font-bold mt-1 ${convRate >= 50 ? "text-[#3EFFBE]" : convRate >= 20 ? "text-[#FFB83E]" : "text-[#FF5C5C]"}`}>
                      {convRate}%
                    </p>
                  )}
                </div>
                {i < funnel.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[#5A6478] shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly signups chart */}
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">weekly signups</h2>
          {weeklySignups.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklySignups}>
                <XAxis dataKey="week" tick={{ fill: "#5A6478", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5A6478", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#141B28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" fill="#C8FF3E" radius={[4, 4, 0, 0]} name="Signups" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-[#5A6478] text-center py-8">no data in selected range</p>
          )}
        </div>

        {/* Retention */}
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">user retention (first offer sent)</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "7-day", value: retention.d7 },
              { label: "30-day", value: retention.d30 },
              { label: "90-day", value: retention.d90 },
            ].map(r => (
              <div key={r.label} className="bg-[#141B28] rounded-lg p-4 text-center">
                <p className={`text-2xl font-syne font-bold tabular-nums ${r.value >= 30 ? "text-[#3EFFBE]" : r.value >= 15 ? "text-[#FFB83E]" : "text-[#FF5C5C]"}`}>
                  {r.value}%
                </p>
                <p className="text-[10px] text-[#5A6478] mt-1">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Role breakdown */}
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">users by role</h2>
          <div className="space-y-2 mb-4">
            {Object.entries(roleRatio)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => {
                const max = Math.max(...Object.values(roleRatio));
                return (
                  <div key={role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#8892A4] capitalize">{role.replace("_", "/")}</span>
                      <span className="text-xs font-syne font-bold text-[#F0F2F7] tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04]">
                      <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: ROLE_COLORS[role] ?? "#8892A4" }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141B28]">
            <Users className="w-3.5 h-3.5 text-[#C8FF3E]" />
            <span className="text-xs text-[#8892A4]">artist:promoter ratio</span>
            <span className={`text-xs font-syne font-bold ml-auto ${Number(ratio) >= 1.5 && Number(ratio) <= 3 ? "text-[#3EFFBE]" : "text-[#FFB83E]"}`}>
              {ratio}:1
            </span>
            <span className="text-[10px] text-[#5A6478]">(ideal: ~2:1)</span>
          </div>
        </div>

        {/* Geographic breakdown */}
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> top cities
          </h2>
          <div className="space-y-2">
            {geoData.map((g, i) => {
              const max = geoData[0]?.count || 1;
              return (
                <div key={g.city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#8892A4]">
                      <span className="text-[#5A6478] mr-1.5 tabular-nums">{i + 1}.</span>
                      {g.city}
                    </span>
                    <span className="text-xs font-syne font-bold text-[#F0F2F7] tabular-nums">{g.count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.04]">
                    <div className="h-full rounded-full bg-[#3EC8FF]" style={{ width: `${(g.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {geoData.length === 0 && <p className="text-xs text-[#5A6478] text-center py-4">no location data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
