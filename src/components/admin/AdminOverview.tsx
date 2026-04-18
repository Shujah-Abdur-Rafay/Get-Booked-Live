import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Send, CalendarCheck, DollarSign } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[#8892A4] font-display lowercase">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-syne font-bold text-[#F0F2F7]">{value}</p>
    </div>
  );
}

export default function AdminOverview() {
  const { data: roleCounts } = useQuery({
    queryKey: ["admin-role-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("role");
      const counts: Record<string, number> = { artist: 0, promoter: 0, venue: 0, production: 0, photo_video: 0, total: 0 };
      data?.forEach(p => {
        counts.total++;
        if (p.role && counts[p.role] !== undefined) counts[p.role]++;
      });
      return counts;
    },
    staleTime: 30_000,
  });

  const { data: weeklyOffers } = useQuery({
    queryKey: ["admin-weekly-offers"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase.from("offers").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: confirmedBookings } = useQuery({
    queryKey: ["admin-confirmed-bookings"],
    queryFn: async () => {
      const { count } = await supabase.from("bookings").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: totalCommission } = useQuery({
    queryKey: ["admin-total-commission"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("commission_amount").not("commission_amount", "is", null);
      return data?.reduce((sum, o) => sum + (Number(o.commission_amount) || 0), 0) ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const items: { id: string; text: string; time: string; type: string }[] = [];

      const { data: signups } = await supabase.from("profiles").select("id, display_name, role, created_at").order("created_at", { ascending: false }).limit(10);
      signups?.forEach(p => items.push({ id: `signup-${p.id}`, text: `${p.display_name || "user"} signed up as ${p.role || "unknown"}`, time: p.created_at, type: "signup" }));

      const { data: offers } = await supabase.from("offers").select("id, venue_name, created_at, status").order("created_at", { ascending: false }).limit(10);
      offers?.forEach(o => items.push({ id: `offer-${o.id}`, text: `offer sent for ${o.venue_name}`, time: o.created_at, type: "offer" }));

      const { data: bookings } = await supabase.from("bookings").select("id, venue_name, created_at").order("created_at", { ascending: false }).limit(10);
      bookings?.forEach(b => items.push({ id: `booking-${b.id}`, text: `booking confirmed at ${b.venue_name}`, time: b.created_at, type: "booking" }));

      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
    },
    staleTime: 30_000,
  });

  const rc = roleCounts ?? { artist: 0, promoter: 0, venue: 0, production: 0, photo_video: 0, total: 0 };

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">platform overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="total users" value={rc.total} icon={Users} color="#C8FF3E" />
        <StatCard label="offers this week" value={weeklyOffers ?? 0} icon={Send} color="#FF5C8A" />
        <StatCard label="confirmed bookings" value={confirmedBookings ?? 0} icon={CalendarCheck} color="#3EFFBE" />
        <StatCard label="total commission" value={`$${(totalCommission ?? 0).toLocaleString()}`} icon={DollarSign} color="#FFB83E" />
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {[
          { label: "artists", count: rc.artist, color: "#C8FF3E" },
          { label: "promoters", count: rc.promoter, color: "#FF5C8A" },
          { label: "venues", count: rc.venue, color: "#FFB83E" },
          { label: "production", count: rc.production, color: "#7B5CF0" },
          { label: "photo/video", count: rc.photo_video, color: "#3EC8FF" },
        ].map(r => (
          <div key={r.label} className="bg-[#141B28] border border-white/[0.06] rounded-lg p-3 text-center">
            <p className="text-lg font-syne font-bold" style={{ color: r.color }}>{r.count}</p>
            <p className="text-[10px] text-[#8892A4] font-display lowercase">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
        <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-4 lowercase">recent activity</h2>
        <div className="space-y-2">
          {recentActivity?.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${item.type === "signup" ? "bg-[#C8FF3E]" : item.type === "offer" ? "bg-[#FF5C8A]" : "bg-[#3EFFBE]"}`} />
                <span className="text-xs text-[#F0F2F7] font-display lowercase">{item.text}</span>
              </div>
              <span className="text-[10px] text-[#5A6478] font-display">{new Date(item.time).toLocaleDateString()}</span>
            </div>
          ))}
          {(!recentActivity || recentActivity.length === 0) && (
            <p className="text-xs text-[#5A6478] text-center py-4">no recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
