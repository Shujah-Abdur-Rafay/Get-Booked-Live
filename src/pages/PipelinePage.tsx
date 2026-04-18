import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Calendar, DollarSign, GripVertical, Filter, Loader2, X, ArrowRightLeft, CheckCircle, XCircle, TrendingUp, Clock, Handshake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NegotiationThread from "@/components/NegotiationThread";
import CounterOfferDialog from "@/components/CounterOfferDialog";
import SEO from "@/components/SEO";

const COLUMNS = [
  { key: "pending", label: "Pending", color: "#FFB83E" },
  { key: "negotiating", label: "Negotiating", color: "#3EC8FF" },
  { key: "accepted", label: "Accepted", color: "#3EFFBE" },
  { key: "declined", label: "Declined", color: "#FF5C5C" },
  { key: "expired", label: "Expired", color: "#5A6478" },
] as const;

type ColumnKey = typeof COLUMNS[number]["key"];

interface OfferCard {
  id: string;
  status: string;
  guarantee: number;
  event_date: string;
  event_time: string | null;
  venue_name: string;
  recipient_id: string;
  sender_id: string;
  door_split: number | null;
  merch_split: number | null;
  recipient_name: string | null;
  recipient_avatar: string | null;
}

export default function Pipeline() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<OfferCard | null>(null);
  const [counterDialogOffer, setCounterDialogOffer] = useState<OfferCard | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role !== "promoter") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  const fetchOffers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("offers")
      .select("id, status, guarantee, event_date, event_time, venue_name, recipient_id, sender_id, door_split, merch_split")
      .eq("sender_id", user.id)
      .order("event_date", { ascending: true });

    if (dateFilter) {
      query = query.eq("event_date", dateFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load offers");
      setLoading(false);
      return;
    }

    const recipientIds = [...new Set((data || []).map((o) => o.recipient_id))];
    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};

    if (recipientIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles" as any)
        .select("user_id, display_name, avatar_url")
        .in("user_id", recipientIds);

      for (const p of (profiles as any[]) || []) {
        profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
    }

    setOffers(
      (data || []).map((o) => ({
        ...o,
        event_time: o.event_time ?? null,
        door_split: o.door_split ?? null,
        merch_split: o.merch_split ?? null,
        recipient_name: profileMap[o.recipient_id]?.display_name ?? null,
        recipient_avatar: profileMap[o.recipient_id]?.avatar_url ?? null,
      }))
    );
    setLoading(false);
  }, [user, dateFilter]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleDragStart = (id: string) => setDragItem(id);
  const handleDragEnd = () => { setDragItem(null); setDragOverCol(null); };

  const handleDrop = async (targetStatus: string) => {
    if (!dragItem) return;
    const offer = offers.find((o) => o.id === dragItem);
    if (!offer || offer.status === targetStatus) { handleDragEnd(); return; }

    const allowedTransitions: Record<string, string[]> = {
      pending: ["negotiating", "declined"],
      negotiating: ["accepted", "declined"],
      accepted: [],
      declined: [],
      expired: [],
    };

    if (!allowedTransitions[offer.status]?.includes(targetStatus)) {
      toast.error(`Cannot move from ${offer.status} to ${targetStatus}`);
      handleDragEnd();
      return;
    }

    setOffers((prev) => prev.map((o) => (o.id === dragItem ? { ...o, status: targetStatus } : o)));
    handleDragEnd();

    const { error } = await supabase.from("offers").update({ status: targetStatus }).eq("id", dragItem);
    if (error) {
      toast.error("Failed to update offer status");
      fetchOffers();
    } else {
      toast.success(`Offer moved to ${targetStatus}`);
    }
  };

  const handleAccept = async (offerId: string) => {
    setActionLoading(offerId);
    const { error } = await supabase.from("offers").update({ status: "accepted" }).eq("id", offerId);
    if (error) { toast.error("Failed to accept offer"); }
    else {
      setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, status: "accepted" } : o));
      if (selectedOffer?.id === offerId) setSelectedOffer((prev) => prev ? { ...prev, status: "accepted" } : null);
      toast.success("Offer accepted!");
    }
    setActionLoading(null);
  };

  const handleDecline = async (offerId: string) => {
    setActionLoading(offerId);
    const { error } = await supabase.from("offers").update({ status: "declined" }).eq("id", offerId);
    if (error) { toast.error("Failed to decline offer"); }
    else {
      setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, status: "declined" } : o));
      if (selectedOffer?.id === offerId) setSelectedOffer((prev) => prev ? { ...prev, status: "declined" } : null);
      toast("Offer declined.");
    }
    setActionLoading(null);
  };

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = offers.filter((o) => o.status === col.key);
    return acc;
  }, {} as Record<ColumnKey, OfferCard[]>);

  // Summary stats
  const totalPipeline = offers.filter((o) => ["pending", "negotiating"].includes(o.status)).reduce((s, o) => s + Number(o.guarantee), 0);
  const totalWon = offers.filter((o) => o.status === "accepted").reduce((s, o) => s + Number(o.guarantee), 0);
  const pendingCount = grouped.pending.length + grouped.negotiating.length;
  const winRate = offers.length > 0 ? Math.round((grouped.accepted.length / offers.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F0F2F7]">
      <SEO title="Booking Pipeline | GetBooked.Live" description="Track your booking pipeline and deal stages on GetBooked.Live." />
      <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-syne font-extrabold text-xl lowercase tracking-tight">booking pipeline</h1>
            <p className="text-[11px] text-[#5A6478] mt-0.5">drag cards to update status · click to open deal</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6478]" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 pl-8 text-xs bg-[#0E1420] border-white/[0.06] w-36"
              />
            </div>
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="h-8 w-8 p-0 text-[#5A6478] hover:text-[#F0F2F7]">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "pipeline value", value: `$${totalPipeline.toLocaleString()}`, icon: TrendingUp, color: "#C8FF3E" },
            { label: "won value", value: `$${totalWon.toLocaleString()}`, icon: Handshake, color: "#3EFFBE" },
            { label: "open deals", value: pendingCount, icon: Clock, color: "#FFB83E" },
            { label: "win rate", value: `${winRate}%`, icon: CheckCircle, color: "#3EC8FF" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-[#0E1420] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="font-syne font-bold text-base">{stat.value}</p>
                  <p className="text-[10px] text-[#5A6478] lowercase">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#C8FF3E]" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const cards = grouped[col.key];
              const total = cards.reduce((s, c) => s + Number(c.guarantee), 0);
              return (
                <div
                  key={col.key}
                  className={cn(
                    "flex-shrink-0 w-64 rounded-xl border border-white/[0.06] bg-[#0E1420] flex flex-col",
                    dragOverCol === col.key && "ring-1 ring-[#C8FF3E]/40"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => handleDrop(col.key)}
                >
                  {/* Column header */}
                  <div className="px-3 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#F0F2F7]">{col.label}</span>
                      <span className="text-[10px] text-[#5A6478] ml-0.5">{cards.length}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8892A4]">${total.toLocaleString()}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto max-h-[60vh]">
                    {cards.length === 0 ? (
                      <p className="text-[11px] text-[#5A6478] text-center py-8">No offers</p>
                    ) : (
                      cards.map((card) => (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={() => handleDragStart(card.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedOffer(card)}
                          className={cn(
                            "rounded-lg bg-[#141B28] border border-white/[0.06] p-3 cursor-pointer transition-all hover:border-white/[0.2] hover:bg-[#1a2235] active:scale-[0.97]",
                            dragItem === card.id && "opacity-40",
                            selectedOffer?.id === card.id && "border-[#C8FF3E]/30 bg-[#C8FF3E]/[0.04]"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <GripVertical className="w-3.5 h-3.5 text-[#5A6478] mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                {card.recipient_avatar ? (
                                  <img src={card.recipient_avatar} alt="" className="w-5 h-5 rounded-full object-cover" loading="lazy" width={20} height={20} />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#1C2535] flex items-center justify-center text-[9px] font-bold text-[#8892A4]">
                                    {(card.recipient_name ?? "?")[0]?.toUpperCase()}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-[#F0F2F7] truncate">{card.recipient_name ?? "Unknown"}</span>
                              </div>
                              <p className="text-[11px] text-[#8892A4] truncate mb-1.5">{card.venue_name}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-[11px] text-[#5A6478]">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(card.event_date), "MMM d")}
                                </div>
                                <div className="flex items-center gap-0.5 font-syne font-bold text-sm text-[#F0F2F7]">
                                  <DollarSign className="w-3 h-3 text-[#C8FF3E]" />
                                  {Number(card.guarantee).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Offer Detail Drawer */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOffer(null)} />
          <div className="relative z-10 w-full sm:max-w-lg bg-[#0E1420] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">

            {/* Drawer header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedOffer.recipient_avatar ? (
                    <img src={selectedOffer.recipient_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1C2535] flex items-center justify-center text-xs font-bold text-[#8892A4]">
                      {(selectedOffer.recipient_name ?? "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <h2 className="font-syne font-bold text-base lowercase">{selectedOffer.recipient_name ?? "Unknown Artist"}</h2>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${COLUMNS.find((c) => c.key === selectedOffer.status)?.color ?? "#5A6478"}20`,
                      color: COLUMNS.find((c) => c.key === selectedOffer.status)?.color ?? "#5A6478",
                    }}
                  >
                    {selectedOffer.status}
                  </span>
                </div>
                <p className="text-[12px] text-[#8892A4]">{selectedOffer.venue_name}</p>
              </div>
              <button onClick={() => setSelectedOffer(null)} className="text-[#5A6478] hover:text-[#F0F2F7] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deal terms */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "guarantee", value: `$${Number(selectedOffer.guarantee).toLocaleString()}` },
                { label: "date", value: format(parseISO(selectedOffer.event_date), "MMM d, yyyy") },
                { label: "door split", value: selectedOffer.door_split != null ? `${selectedOffer.door_split}%` : "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-[#141B28] border border-white/[0.06] px-3 py-2.5 text-center">
                  <p className="font-syne font-bold text-sm">{item.value}</p>
                  <p className="text-[10px] text-[#5A6478] mt-0.5 lowercase">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Action buttons for active offers */}
            {["pending", "negotiating"].includes(selectedOffer.status) && (
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  className="flex-1 h-9 text-xs bg-[#3EFFBE]/10 text-[#3EFFBE] border border-[#3EFFBE]/20 hover:bg-[#3EFFBE]/20"
                  onClick={() => handleAccept(selectedOffer.id)}
                  disabled={actionLoading === selectedOffer.id}
                >
                  {actionLoading === selectedOffer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Accept</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => setCounterDialogOffer(selectedOffer)}
                  disabled={actionLoading === selectedOffer.id}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Counter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDecline(selectedOffer.id)}
                  disabled={actionLoading === selectedOffer.id}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Decline
                </Button>
              </div>
            )}

            {/* Negotiation thread */}
            {selectedOffer.status === "negotiating" && (
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] text-[#5A6478] uppercase tracking-wider mb-3">negotiation thread</p>
                <NegotiationThread
                  offerId={selectedOffer.id}
                  offer={{
                    guarantee: selectedOffer.guarantee,
                    door_split: selectedOffer.door_split,
                    merch_split: selectedOffer.merch_split,
                    event_date: selectedOffer.event_date,
                    event_time: selectedOffer.event_time,
                    venue_name: selectedOffer.venue_name,
                    sender_id: selectedOffer.sender_id,
                    recipient_id: selectedOffer.recipient_id,
                  }}
                  onOfferUpdated={(newStatus, updatedTerms) => {
                    setOffers((prev) => prev.map((o) => o.id === selectedOffer.id ? { ...o, status: newStatus, ...(updatedTerms ?? {}) } : o));
                    setSelectedOffer((prev) => prev ? { ...prev, status: newStatus, ...(updatedTerms ?? {}) } : null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Counter Offer Dialog */}
      {counterDialogOffer && (
        <CounterOfferDialog
          open={!!counterDialogOffer}
          onOpenChange={(open) => { if (!open) setCounterDialogOffer(null); }}
          offerId={counterDialogOffer.id}
          currentTerms={{
            guarantee: counterDialogOffer.guarantee,
            doorSplit: counterDialogOffer.door_split,
            merchSplit: counterDialogOffer.merch_split,
            eventDate: counterDialogOffer.event_date,
            eventTime: counterDialogOffer.event_time,
            venueName: counterDialogOffer.venue_name,
          }}
          onCountered={() => {
            setOffers((prev) => prev.map((o) => o.id === counterDialogOffer.id ? { ...o, status: "negotiating" } : o));
            setSelectedOffer((prev) => prev?.id === counterDialogOffer.id ? { ...prev, status: "negotiating" } : prev);
            setCounterDialogOffer(null);
          }}
        />
      )}
    </div>
  );
}
