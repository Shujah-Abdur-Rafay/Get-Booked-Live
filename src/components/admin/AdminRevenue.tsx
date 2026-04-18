import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, CreditCard, Users, ArrowUp, ArrowDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PLAN_PRICES: Record<string, number> = { pro: 29, agency: 99 };
const ROLE_COLORS: Record<string, string> = {
  artist: "#C8FF3E",
  promoter: "#FF5C8A",
  venue: "#FFB83E",
  production: "#7B5CF0",
  photo_video: "#3EC8FF",
};
const PIE_COLORS = ["#5A6478", "#C8FF3E", "#7B5CF0"];

export default function AdminRevenue() {
  const { data: profiles } = useQuery({
    queryKey: ["admin-revenue-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name, subscription_plan, role, created_at");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: commissions } = useQuery({
    queryKey: ["admin-commission-all"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("commission_amount, created_at, recipient_id").not("commission_amount", "is", null);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: topBookings } = useQuery({
    queryKey: ["admin-top-bookings-20"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*").order("guarantee", { ascending: false }).limit(20);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles?.forEach(p => { m[p.user_id] = p.display_name || "unnamed"; });
    return m;
  }, [profiles]);

  // Subscription breakdown
  const subBreakdown = useMemo(() => {
    const counts = { free: 0, pro: 0, agency: 0 };
    profiles?.forEach(p => {
      const plan = p.subscription_plan as keyof typeof counts;
      if (plan in counts) counts[plan]++;
      else counts.free++;
    });
    return counts;
  }, [profiles]);

  const currentMRR = (subBreakdown.pro * 29) + (subBreakdown.agency * 99);

  // Previous month MRR estimate (profiles created before last month)
  const prevMRR = useMemo(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    let mrr = 0;
    profiles?.forEach(p => {
      if (new Date(p.created_at) < lastMonth) {
        if (p.subscription_plan === "pro") mrr += 29;
        if (p.subscription_plan === "agency") mrr += 99;
      }
    });
    return mrr;
  }, [profiles]);

  const mrrChange = prevMRR > 0 ? ((currentMRR - prevMRR) / prevMRR * 100) : 0;

  // Commission stats
  const totalCommission = commissions?.reduce((s, o) => s + Number(o.commission_amount || 0), 0) ?? 0;
  const avgCommission = commissions && commissions.length > 0 ? totalCommission / commissions.length : 0;

  // Monthly revenue chart (last 12 months)
  const monthlyData = useMemo(() => {
    const months: Record<string, { sub: number; commission: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months[key] = { sub: 0, commission: 0 };
    }
    // Add subscription MRR to each month (simplified: current MRR applied)
    Object.keys(months).forEach(k => { months[k].sub = currentMRR; });
    commissions?.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (months[key]) months[key].commission += Number(o.commission_amount || 0);
    });
    return Object.entries(months).map(([month, v]) => ({ month, subscription: v.sub, commission: v.commission, total: v.sub + v.commission }));
  }, [commissions, currentMRR]);

  // Revenue per role
  const revenueByRole = useMemo(() => {
    const roleRev: Record<string, number> = {};
    const recipientRoles: Record<string, string> = {};
    profiles?.forEach(p => { recipientRoles[p.user_id] = p.role || "unknown"; });
    commissions?.forEach(o => {
      const role = recipientRoles[o.recipient_id] || "unknown";
      roleRev[role] = (roleRev[role] || 0) + Number(o.commission_amount || 0);
    });
    return Object.entries(roleRev).map(([role, amount]) => ({ role, amount })).sort((a, b) => b.amount - a.amount);
  }, [commissions, profiles]);

  // Projected ARR (last 3 months avg × 12)
  const projectedARR = useMemo(() => {
    const last3 = monthlyData.slice(-3);
    const avg = last3.reduce((s, m) => s + m.total, 0) / (last3.length || 1);
    return avg * 12;
  }, [monthlyData]);

  // Subscription pie
  const pieData = [
    { name: "Free", value: subBreakdown.free },
    { name: "Pro", value: subBreakdown.pro },
    { name: "Agency", value: subBreakdown.agency },
  ].filter(d => d.value > 0);

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">revenue</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={<CreditCard className="w-4 h-4 text-[#7B5CF0]" />} label="subscription mrr" value={`$${currentMRR.toLocaleString()}`}
          badge={mrrChange !== 0 ? { value: `${mrrChange > 0 ? "+" : ""}${mrrChange.toFixed(1)}%`, positive: mrrChange > 0 } : undefined} />
        <KPICard icon={<DollarSign className="w-4 h-4 text-[#C8FF3E]" />} label="total commissions" value={`$${totalCommission.toLocaleString()}`} />
        <KPICard icon={<TrendingUp className="w-4 h-4 text-[#3EFFBE]" />} label="avg commission" value={`$${avgCommission.toFixed(0)}`} />
        <KPICard icon={<DollarSign className="w-4 h-4 text-[#FFB83E]" />} label="projected arr" value={`$${Math.round(projectedARR).toLocaleString()}`} />
      </div>

      {/* Monthly revenue chart */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5 mb-6">
        <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">monthly revenue (last 12 months)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" tick={{ fill: "#5A6478", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#5A6478", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: "#141B28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#8892A4" }} />
            <Bar dataKey="subscription" stackId="a" fill="#7B5CF0" radius={[0, 0, 0, 0]} name="Subscriptions" />
            <Bar dataKey="commission" stackId="a" fill="#C8FF3E" radius={[4, 4, 0, 0]} name="Commissions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Subscription breakdown */}
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">subscription breakdown</h2>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {[
                { label: "free", count: subBreakdown.free, color: PIE_COLORS[0] },
                { label: "pro ($29/mo)", count: subBreakdown.pro, color: PIE_COLORS[1] },
                { label: "agency ($99/mo)", count: subBreakdown.agency, color: PIE_COLORS[2] },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs text-[#8892A4]">{s.label}</span>
                  <span className="text-xs font-syne font-bold text-[#F0F2F7] ml-auto tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue per role */}
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">commission revenue by role</h2>
          <div className="space-y-3">
            {revenueByRole.map(r => {
              const max = revenueByRole[0]?.amount || 1;
              return (
                <div key={r.role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#8892A4] capitalize">{r.role.replace("_", "/")}</span>
                    <span className="text-xs font-syne font-bold text-[#F0F2F7] tabular-nums">${r.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(r.amount / max) * 100}%`, background: ROLE_COLORS[r.role] ?? "#8892A4" }} />
                  </div>
                </div>
              );
            })}
            {revenueByRole.length === 0 && <p className="text-xs text-[#5A6478] text-center py-4">no commission data yet</p>}
          </div>
        </div>
      </div>

      {/* Top 20 bookings */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
        <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">top 20 highest-value bookings</h2>
        <div className="space-y-1.5">
          {topBookings?.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#5A6478] w-5 text-right font-syne tabular-nums">{i + 1}</span>
                <div>
                  <p className="text-xs text-[#F0F2F7] font-medium">{b.venue_name}</p>
                  <p className="text-[10px] text-[#5A6478]">{profileMap[b.artist_id] ?? "—"} × {profileMap[b.promoter_id] ?? "—"} · {new Date(b.event_date).toLocaleDateString()}</p>
                </div>
              </div>
              <span className="text-sm font-syne font-bold text-[#C8FF3E] tabular-nums">${Number(b.guarantee).toLocaleString()}</span>
            </div>
          ))}
          {(!topBookings || topBookings.length === 0) && <p className="text-xs text-[#5A6478] text-center py-4">no bookings yet</p>}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: { value: string; positive: boolean } }) {
  return (
    <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] text-[#5A6478] font-display lowercase">{label}</span>
        {badge && (
          <span className={`ml-auto text-[10px] font-syne font-bold flex items-center gap-0.5 ${badge.positive ? "text-[#3EFFBE]" : "text-[#FF5C5C]"}`}>
            {badge.positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {badge.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-syne font-bold text-[#F0F2F7] tabular-nums">{value}</p>
    </div>
  );
}
