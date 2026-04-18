import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFB83E",
  accepted: "#3EFFBE",
  declined: "#FF5C5C",
  negotiating: "#7B5CF0",
  expired: "#5A6478",
};

export default function AdminOffers() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  const { data: offers } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
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

  const filtered = offers?.filter(o => statusFilter === "all" || o.status === statusFilter) ?? [];
  const getName = (id: string) => profiles?.[id] ?? "—";

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">offers</h1>

      <div className="flex gap-3 mb-5">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-[#0E1420] border-white/[0.06] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all statuses</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="accepted">accepted</SelectItem>
            <SelectItem value="declined">declined</SelectItem>
            <SelectItem value="negotiating">negotiating</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-[#5A6478] self-center font-display">{filtered.length} offers</p>
      </div>

      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["promoter", "recipient", "venue", "date", "amount", "commission", "status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr
                  key={o.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => setSelectedOffer(o)}
                >
                  <td className="px-4 py-3 text-[#F0F2F7]">{getName(o.sender_id)}</td>
                  <td className="px-4 py-3 text-[#F0F2F7]">{getName(o.recipient_id)}</td>
                  <td className="px-4 py-3 text-[#F0F2F7]">{o.venue_name}</td>
                  <td className="px-4 py-3 text-[#8892A4]">{new Date(o.event_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#F0F2F7] font-syne font-semibold">${Number(o.guarantee).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#FFB83E]">${Number(o.commission_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]" style={{ color: STATUS_COLORS[o.status] ?? "#8892A4", borderColor: (STATUS_COLORS[o.status] ?? "#8892A4") + "40" }}>
                      {o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#5A6478]">no offers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="bg-[#0E1420] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="font-syne text-[#F0F2F7] lowercase">offer details</DialogTitle>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-3 text-xs text-[#F0F2F7]">
              <Row label="venue" value={selectedOffer.venue_name} />
              <Row label="promoter" value={getName(selectedOffer.sender_id)} />
              <Row label="recipient" value={getName(selectedOffer.recipient_id)} />
              <Row label="guarantee" value={`$${Number(selectedOffer.guarantee).toLocaleString()}`} />
              <Row label="commission" value={`$${Number(selectedOffer.commission_amount || 0).toLocaleString()} (${(Number(selectedOffer.commission_rate) * 100).toFixed(0)}%)`} />
              <Row label="date" value={new Date(selectedOffer.event_date).toLocaleDateString()} />
              <Row label="status" value={selectedOffer.status} />
              {selectedOffer.door_split && <Row label="door split" value={`${selectedOffer.door_split}%`} />}
              {selectedOffer.merch_split && <Row label="merch split" value={`${selectedOffer.merch_split}%`} />}
              {selectedOffer.hospitality && <Row label="hospitality" value={selectedOffer.hospitality} />}
              {selectedOffer.backline && <Row label="backline" value={selectedOffer.backline} />}
              {selectedOffer.notes && <Row label="notes" value={selectedOffer.notes} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/[0.04] pb-2">
      <span className="text-[#5A6478] font-display lowercase">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
