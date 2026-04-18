import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

export default function AdminBookings() {
  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name");
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.display_name || "unnamed"; });
      return map;
    },
    staleTime: 60_000,
  });

  const { data: offerCommissions } = useQuery({
    queryKey: ["admin-offer-commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("id, commission_amount");
      const map: Record<string, number> = {};
      data?.forEach(o => { map[o.id] = Number(o.commission_amount || 0); });
      return map;
    },
    staleTime: 60_000,
  });

  const getName = (id: string) => profiles?.[id] ?? "—";
  const totalCommission = bookings?.reduce((sum, b) => sum + (offerCommissions?.[b.offer_id] || 0), 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-syne font-bold text-xl text-[#F0F2F7] lowercase">bookings</h1>
        <div className="flex items-center gap-2 bg-[#0E1420] border border-white/[0.06] rounded-lg px-4 py-2">
          <DollarSign className="w-4 h-4 text-[#C8FF3E]" />
          <div>
            <p className="text-[10px] text-[#5A6478] font-display lowercase">total commission earned</p>
            <p className="text-lg font-syne font-bold text-[#C8FF3E]">${totalCommission.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["artist", "promoter", "venue", "date", "guarantee", "commission", "status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings?.map(b => (
                <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[#F0F2F7]">{getName(b.artist_id)}</td>
                  <td className="px-4 py-3 text-[#F0F2F7]">{getName(b.promoter_id)}</td>
                  <td className="px-4 py-3 text-[#F0F2F7]">{b.venue_name}</td>
                  <td className="px-4 py-3 text-[#8892A4]">{new Date(b.event_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#F0F2F7] font-syne font-semibold">${Number(b.guarantee).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#FFB83E]">${(offerCommissions?.[b.offer_id] || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]" style={{ color: b.status === "confirmed" ? "#3EFFBE" : "#FFB83E", borderColor: (b.status === "confirmed" ? "#3EFFBE" : "#FFB83E") + "40" }}>
                      {b.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(!bookings || bookings.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#5A6478]">no bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
