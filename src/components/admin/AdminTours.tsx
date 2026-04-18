import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function AdminTours() {
  const { data: tours } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      const { data } = await supabase.from("tours").select("*").order("created_at", { ascending: false });
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

  const { data: stopCounts } = useQuery({
    queryKey: ["admin-tour-stop-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("tour_stops").select("tour_id, guarantee");
      const counts: Record<string, { stops: number; totalGuarantee: number }> = {};
      data?.forEach(s => {
        if (!counts[s.tour_id]) counts[s.tour_id] = { stops: 0, totalGuarantee: 0 };
        counts[s.tour_id].stops++;
        counts[s.tour_id].totalGuarantee += Number(s.guarantee || 0);
      });
      return counts;
    },
    staleTime: 30_000,
  });

  const getName = (id: string) => profiles?.[id] ?? "—";

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">tours</h1>

      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["artist", "tour name", "stops", "start", "end", "total guarantee", "status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tours?.map(t => {
                const sc = stopCounts?.[t.id];
                return (
                  <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[#F0F2F7]">{getName(t.user_id)}</td>
                    <td className="px-4 py-3 text-[#F0F2F7] font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-[#C8FF3E] font-syne font-semibold">{sc?.stops ?? 0}</td>
                    <td className="px-4 py-3 text-[#8892A4]">{t.start_date ? new Date(t.start_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-[#8892A4]">{t.end_date ? new Date(t.end_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-[#F0F2F7] font-syne font-semibold">${(sc?.totalGuarantee ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]" style={{ color: t.status === "active" ? "#3EFFBE" : "#FFB83E", borderColor: (t.status === "active" ? "#3EFFBE" : "#FFB83E") + "40" }}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {(!tours || tours.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#5A6478]">no tours yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
