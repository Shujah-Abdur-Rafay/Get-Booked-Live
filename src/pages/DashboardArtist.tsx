import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { SkeletonCard } from "@/components/SkeletonCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Inbox, CheckCircle, XCircle, FileText, Loader2, Download, PenLine, ArrowRightLeft, ChevronLeft, ChevronRight, Shield, Users, BarChart3, Banknote, TrendingUp, Music2, Bot, UserCog, CalendarDays, Disc3, ArrowRight, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import OpenForBookingsToggle from "@/components/OpenForBookingsToggle";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import AIAgentPanel, { AgentActiveBanner } from "@/components/AIAgentPanel";
import SignContractDialog from "@/components/SignContractDialog";
import CounterOfferDialog from "@/components/CounterOfferDialog";
import NegotiationThread from "@/components/NegotiationThread";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import ContractReviewDialog from "@/components/ContractReviewDialog";
import AttendanceReportDialog from "@/components/AttendanceReportDialog";
import BookkeepingSection from "@/components/BookkeepingSection";
import AdvanceRequestDialog from "@/components/AdvanceRequestDialog";
import InsuranceOfferCard from "@/components/InsuranceOfferCard";
import { openSignedContract, downloadSignedContract } from "@/lib/db-call";
import DepositPaymentButton from "@/components/DepositPaymentButton";
import FreeOfferBanner from "@/components/FreeOfferBanner";
import EditProfilePanel from "@/components/EditProfilePanel";
import ProfileCompletionRing from "@/components/ProfileCompletionRing";
import StreamingStatsPills from "@/components/StreamingStatsPills";
import EventsTab from "@/components/EventsTab";
import SpotifyAnalytics from "@/components/SpotifyAnalytics";
import PresaleSection from "@/components/PresaleSection";
import PlatformConnectionCards from "@/components/PlatformConnectionCards";
import OfferScoreCard from "@/components/OfferScoreCard";
import EmptyState from "@/components/EmptyState";
import ThreadSummary from "@/components/ThreadSummary";
import TrialBanner from "@/components/TrialBanner";
import SEO from "@/components/SEO";

type ArtistView = "overview" | "offers" | "events" | "analytics" | "bookkeeping" | "agent" | "profile";

type Offer = {
  id: string;
  venue_name: string;
  event_date: string;
  event_time: string | null;
  guarantee: number;
  door_split: number | null;
  merch_split: number | null;
  commission_amount: number | null;
  notes: string | null;
  status: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
};

type Booking = {
  id: string;
  offer_id: string;
  contract_url: string | null;
  status: string;
  artist_id: string;
  promoter_id: string;
  venue_name: string;
  event_date: string;
  guarantee: number;
};

const ACCENT = "#C8FF3E";

const STATUS_DOT: Record<string, string> = {
  pending: "bg-yellow-400",
  accepted: "bg-green-400",
  declined: "bg-red-400",
  negotiating: "bg-amber-400",
};

const navItems: NavItem<ArtistView>[] = [
  { title: "overview", value: "overview", icon: Inbox },
  { title: "offers", value: "offers", icon: Inbox },
  { title: "events", value: "events", icon: CalendarDays },
  { title: "analytics", value: "analytics", icon: Disc3 },
  { title: "bookkeeping", value: "bookkeeping", icon: BarChart3 },
  { title: "ai agent", value: "agent", icon: Bot },
  { title: "edit profile", value: "profile", icon: UserCog },
];

export default function ArtistDashboard() {
  const { user, profile } = useAuth();
  const [activeView, setActiveView] = useState<ArtistView>("overview");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [generatingContract, setGeneratingContract] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string[]>>({});
  const [signDialogBooking, setSignDialogBooking] = useState<{ id: string; venueName: string; eventDate: string; guarantee: number } | null>(null);
  const [counterDialogOffer, setCounterDialogOffer] = useState<Offer | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewOffer, setReviewOffer] = useState<Offer | null>(null);
  const [attendanceBooking, setAttendanceBooking] = useState<Booking | null>(null);
  const [attendanceReported, setAttendanceReported] = useState<Set<string>>(new Set());
  const [advanceBooking, setAdvanceBooking] = useState<Booking | null>(null);
  const [advanceRequested, setAdvanceRequested] = useState<Set<string>>(new Set());
  const [availability, setAvailability] = useState<{ date: string; is_available: boolean; notes: string | null }[]>([]);

  const fetchSignatures = async (bookingIds: string[]) => {
    if (bookingIds.length === 0) return;
    const { data } = await supabase
      .from("contract_signatures")
      .select("booking_id, user_id")
      .in("booking_id", bookingIds);
    const sigMap: Record<string, string[]> = {};
    (data ?? []).forEach((s: any) => {
      if (!sigMap[s.booking_id]) sigMap[s.booking_id] = [];
      sigMap[s.booking_id].push(s.user_id);
    });
    setSignatures(sigMap);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [offersRes, bookingsRes, availRes] = await Promise.all([
        supabase.from("offers").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        supabase.from("bookings").select("id, offer_id, contract_url, status, artist_id, promoter_id, venue_name, event_date, guarantee").eq("artist_id", user.id),
        supabase.from("artist_availability").select("date, is_available, notes").eq("artist_id", user.id).gte("date", today).order("date", { ascending: true }).limit(8),
      ]);
      const fetchedOffers = (offersRes.data as Offer[]) ?? [];
      setHasMore(fetchedOffers.length === PAGE_SIZE);
      setOffers(fetchedOffers);
      const bks = (bookingsRes.data as Booking[]) ?? [];
      setBookings(bks);
      setAvailability((availRes.data as any[]) ?? []);
      await fetchSignatures(bks.map((b) => b.id));
      setLoading(false);
    };
    fetchData();
  }, [user, page]);

  const handleRespond = async (offerId: string, status: "accepted" | "declined", addedClauses?: string[]) => {
    if (!user) return;
    setActionLoading(offerId);
    const { error } = await supabase.from("offers").update({ status }).eq("id", offerId);
    if (error) { toast.error(error.message); setActionLoading(null); return; }
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status } : o)));

    if (status === "accepted") {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) return;
      let notes = offer.notes || "";
      if (addedClauses && addedClauses.length > 0) {
        notes = (notes ? notes + "\n\n" : "") + "AI-Suggested Clauses:\n" + addedClauses.join("\n");
      }
      const { data: booking, error: bookingErr } = await supabase
        .from("bookings")
        .insert({ offer_id: offerId, artist_id: user.id, promoter_id: offer.sender_id, venue_name: offer.venue_name, event_date: offer.event_date, event_time: offer.event_time, guarantee: offer.guarantee } as any)
        .select().single();
      if (bookingErr) { toast.error("Offer accepted but booking creation failed: " + bookingErr.message); return; }
      const newBooking = booking as unknown as Booking;
      setBookings((prev) => [...prev, newBooking]);
      toast.success("Offer accepted! Deal Room is now open.");
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: { templateName: "offer-accepted", recipientEmail: offer.sender_id, idempotencyKey: `offer-accepted-${newBooking.id}`, templateData: { venueName: offer.venue_name, eventDate: offer.event_date, guarantee: offer.guarantee } },
        });
      } catch { /* best-effort */ }
      setGeneratingContract(newBooking.id);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("generate-contract", { body: { booking_id: newBooking.id } });
        if (fnErr) throw fnErr;
        if (data?.contract_url) {
          setBookings((prev) => prev.map((b) => (b.id === newBooking.id ? { ...b, contract_url: data.contract_url } : b)));
          toast.success("Contract generated!");
        }
      } catch { toast.error("Contract generation failed — you can retry later."); }
      finally { setGeneratingContract(null); }
    } else { toast("Offer declined."); }
    setActionLoading(null);
  };

  const getBookingForOffer = (offerId: string) => bookings.find((b) => b.offer_id === offerId);
  const pendingCount = offers.filter((o) => o.status === "pending").length;
  const acceptedCount = offers.filter((o) => o.status === "accepted").length;
  const totalGuarantee = offers.filter((o) => o.status === "accepted").reduce((s, o) => s + o.guarantee, 0);
  const nextShow = bookings.filter((b) => new Date(b.event_date) >= new Date()).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0];

  // Update nav item counts
  const navWithCounts = navItems.map((n) => n.value === "offers" ? { ...n, count: pendingCount } : n);

  const renderOfferCard = (offer: Offer) => {
    const booking = getBookingForOffer(offer.id);
    const isGenerating = generatingContract === booking?.id;

    return (
      <div key={offer.id} className="group rounded-lg border border-white/[0.06] bg-[#0e1420] hover:border-white/[0.12] transition-colors">
        {/* Compact header row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[offer.status] ?? "bg-muted"}`} />
          <span className="font-display text-sm font-semibold lowercase truncate flex-1">{offer.venue_name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">{offer.status}</span>
          <span className="font-display text-sm font-bold tabular-nums shrink-0" style={{ color: ACCENT }}>${offer.guarantee.toLocaleString()}</span>
        </div>
        <div className="px-4 pb-1 -mt-1">
          <p className="text-[11px] text-muted-foreground pl-5">
            {new Date(offer.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Actions */}
        {offer.status === "pending" && (
          <div className="px-4 pb-3 pt-2 border-t border-white/[0.04] mt-2 space-y-2">
            <OfferScoreCard offerId={offer.id} />
            <div className="flex flex-col sm:flex-row gap-1.5">
              <Button size="sm" disabled={actionLoading === offer.id} onClick={() => setReviewOffer(offer)} className="h-9 sm:h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white active:scale-[0.97] transition-transform px-2.5 w-full sm:w-auto">
                {actionLoading === offer.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Shield className="w-3 h-3 mr-1" />} review
              </Button>
              <Button size="sm" variant="ghost" disabled={actionLoading === offer.id} onClick={() => setCounterDialogOffer(offer)} className="h-9 sm:h-7 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 active:scale-[0.97] px-2.5 w-full sm:w-auto">
                <ArrowRightLeft className="w-3 h-3 mr-1" /> counter
              </Button>
              <Button size="sm" variant="ghost" disabled={actionLoading === offer.id} onClick={() => handleRespond(offer.id, "declined")} className="h-9 sm:h-7 text-[11px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 active:scale-[0.97] px-2.5 w-full sm:w-auto">
                <XCircle className="w-3 h-3 mr-1" /> decline
              </Button>
            </div>
          </div>
        )}

        {offer.status === "negotiating" && (
          <div className="px-4 pb-3 border-t border-white/[0.04] mt-2 pt-2 space-y-2">
            <ThreadSummary offerId={offer.id} />
            <NegotiationThread offerId={offer.id} offer={offer} onOfferUpdated={(newStatus, updatedTerms) => { setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, status: newStatus, ...(updatedTerms ?? {}) } : o)); }} />
          </div>
        )}

        {offer.status === "accepted" && booking && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 border-t border-white/[0.04] mt-2 pt-2">
            {isGenerating ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1"><Loader2 className="w-3 h-3 animate-spin" /> generating contract...</div>
            ) : booking.contract_url ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => openSignedContract(booking.contract_url!)} className="h-7 text-[11px] hover:bg-white/5 active:scale-[0.97] px-2.5" style={{ color: ACCENT }}>
                  <FileText className="w-3 h-3 mr-1" /> contract
                </Button>
                <Button size="sm" variant="ghost" onClick={() => downloadSignedContract(booking.contract_url!)} className="h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-[0.97] px-2.5">
                  <Download className="w-3 h-3 mr-1" /> download
                </Button>
                {user && signatures[booking.id]?.includes(user.id) ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ color: ACCENT, backgroundColor: `${ACCENT}12` }}>
                    <CheckCircle className="w-3 h-3" /> signed
                  </span>
                ) : (
                  <Button size="sm" onClick={() => setSignDialogBooking({ id: booking.id, venueName: offer.venue_name, eventDate: offer.event_date, guarantee: offer.guarantee })} className="h-7 text-[11px] active:scale-[0.97] px-2.5" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                    <PenLine className="w-3 h-3 mr-1" /> sign
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 px-2.5" onClick={async () => {
                setGeneratingContract(booking.id);
                try { const { data } = await supabase.functions.invoke("generate-contract", { body: { booking_id: booking.id } }); if (data?.contract_url) { setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, contract_url: data.contract_url } : b))); toast.success("Contract generated!"); } } catch { toast.error("Generation failed"); } finally { setGeneratingContract(null); }
              }}>
                <FileText className="w-3 h-3 mr-1" /> generate contract
              </Button>
            )}
            {new Date(offer.event_date) < new Date() && !attendanceReported.has(booking.id) && (
              <Button size="sm" variant="ghost" onClick={() => setAttendanceBooking(booking)} className="h-7 text-[11px] text-[#FFB83E] hover:bg-[#FFB83E]/10 active:scale-[0.97] px-2.5">
                <Users className="w-3 h-3 mr-1" /> attendance
              </Button>
            )}
            {attendanceReported.has(booking.id) && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3EFFBE] font-medium px-2.5 py-1"><CheckCircle className="w-3 h-3" /> reported</span>
            )}
            {booking.status === "confirmed" && new Date(offer.event_date) > new Date() && !advanceRequested.has(booking.id) && (
              <Button size="sm" variant="ghost" onClick={() => setAdvanceBooking(booking)} className="h-7 text-[11px] text-[#3EC8FF] hover:bg-[#3EC8FF]/10 active:scale-[0.97] px-2.5">
                <Banknote className="w-3 h-3 mr-1" /> advance
              </Button>
            )}
            {advanceRequested.has(booking.id) && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3EC8FF] font-medium px-2.5 py-1"><CheckCircle className="w-3 h-3" /> advance requested</span>
            )}
            {/* Payment status badges */}
            {(booking as any).payment_status === "deposit_paid" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium px-2.5 py-1 bg-amber-400/10 rounded-full border border-amber-400/20">
                <DollarSign className="w-3 h-3" /> deposit paid
              </span>
            )}
            {(booking as any).payment_status === "fully_paid" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3EFFBE] font-medium px-2.5 py-1 bg-[#3EFFBE]/10 rounded-full border border-[#3EFFBE]/20">
                <CheckCircle className="w-3 h-3" /> fully paid
              </span>
            )}
            {/* Deposit button — only when unpaid */}
            {(!(booking as any).payment_status || (booking as any).payment_status === "unpaid") && (
              <DepositPaymentButton bookingId={booking.id} guarantee={booking.guarantee} onSuccess={() => { setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, payment_status: "deposit_paid" } as any : b)); }} />
            )}
            {user && signatures[booking.id]?.includes(user.id) && (signatures[booking.id]?.length ?? 0) >= 2 && (
              <div className="w-full mt-1 space-y-1.5">
                <InsuranceOfferCard bookingId={booking.id} guarantee={offer.guarantee} userRole="artist" />
                <PresaleSection bookingId={booking.id} isArtist={true} isPro={profile?.subscription_plan === "pro" || profile?.subscription_plan === "agency"} />
                <Link to="/directory?role=photo_video" className="flex items-center gap-1.5 text-[11px] text-[#3EC8FF] hover:text-[#3EC8FF]/80 transition-colors mt-1">
                  <Camera className="w-3 h-3" /> book a photographer for this show →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarProvider>
      <SEO title="Artist Dashboard | GetBooked.Live" description="Manage your offers, bookings, events, and analytics as an artist." />
      <div className="min-h-screen flex w-full bg-[#080C14]">
        <DashboardSidebar
          items={navWithCounts}
          activeView={activeView}
          onViewChange={setActiveView as (view: string) => void}
          accentColor={ACCENT}
          roleLabel="artist"
          roleIcon={Music2}
          displayName={profile?.display_name ?? undefined}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6 pt-14">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="text-[11px] text-muted-foreground lowercase">
              {activeView === "overview" ? "dashboard" : activeView}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-5">

              {/* ─── Overview ─── */}
              {activeView === "overview" && (
                <>
                  {loading ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} height="h-20" />)}
                      </div>
                      {[1, 2, 3].map((i) => <SkeletonCard key={i} height="h-40" />)}
                    </div>
                  ) : (
                    <>
                   <DashboardOnboarding />
                   <TrialBanner />
                   <OpenForBookingsToggle />
                   <ProfileCompletionRing />
                   <GettingStartedChecklist variant="artist" />

                  {/* Compact stats strip */}
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] grid grid-cols-2 md:grid-cols-4 divide-y divide-white/[0.06] md:divide-y-0 md:divide-x md:divide-white/[0.06]">
                    {[
                      { label: "pending", value: loading ? "—" : pendingCount, color: "#FBBF24" },
                      { label: "confirmed", value: loading ? "—" : acceptedCount, color: "#4ADE80" },
                      { label: "revenue", value: loading ? "—" : `$${totalGuarantee.toLocaleString()}`, color: ACCENT },
                      { label: "next show", value: loading ? "—" : (nextShow ? `${nextShow.venue_name.toLowerCase().slice(0, 16)} · ${new Date(nextShow.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"), color: "#FFB83E" },
                    ].map((stat) => (
                      <div key={stat.label} className="px-4 py-3.5 sm:py-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="font-display text-base sm:text-lg font-bold tabular-nums truncate" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Streaming Stats Pills */}
                  <StreamingStatsPills onNavigateToAnalytics={() => setActiveView("analytics")} />

                  {/* Recent offers */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">recent offers</h2>
                      <button onClick={() => setActiveView("offers")} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors lowercase">view all →</button>
                    </div>
                    {loading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <SkeletonCard key={i} height="h-40" />)}
                      </div>
                    ) : offers.length === 0 ? (
                      <EmptyState
                        emoji="📥"
                        title="No offers yet — but they are coming"
                        description="Promoters find you through your profile. Complete your profile to appear in search."
                        actionLabel="Complete your profile →"
                        actionHref="/setup"
                      />
                    ) : (
                      <div className="space-y-1.5">{offers.slice(0, 5).map(renderOfferCard)}</div>
                    )}
                  </div>
                    </>
                  )}
                </>
              )}

              {/* ─── Offers ─── */}
              {activeView === "offers" && (
                <>
                  <AgentActiveBanner />
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">all offers</h2>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{offers.length} total</span>
                  </div>
                  <FreeOfferBanner mode="received" />
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <SkeletonCard key={i} height="h-40" />)}
                    </div>
                   ) : offers.length === 0 ? (
                    <EmptyState
                      emoji="📥"
                      title="No offers yet — but they are coming"
                      description="Promoters find you through your profile. Complete your profile to appear in search."
                      actionLabel="Complete your profile →"
                      actionHref="/setup"
                    />
                  ) : (
                    <>
                      <div className="space-y-1.5">{offers.map(renderOfferCard)}</div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-7 text-[11px] text-muted-foreground hover:text-foreground active:scale-[0.97]">
                          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> prev
                        </Button>
                        <span className="text-[11px] text-muted-foreground tabular-nums">page {page + 1}</span>
                        <Button size="sm" variant="ghost" disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="h-7 text-[11px] text-muted-foreground hover:text-foreground active:scale-[0.97]">
                          next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ─── Events ─── */}
              {activeView === "events" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">events & availability</h2>
                  <EventsTab bookings={bookings} loading={loading} />
                  <div className="mt-6">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">availability calendar</h2>
                    <AvailabilityCalendar />
                  </div>
                </>
              )}

              {/* ─── Analytics ─── */}
              {activeView === "analytics" && (
                <>
                  <PlatformConnectionCards />
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-6">spotify analytics</h2>
                  <SpotifyAnalytics />
                </>
              )}




              {/* ─── Bookkeeping ─── */}
              {activeView === "bookkeeping" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">bookkeeping</h2>
                  <BookkeepingSection />
                </>
              )}

              {/* ─── Agent ─── */}
              {activeView === "agent" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">ai booking agent</h2>
                  <AIAgentPanel />
                </>
              )}

              {/* ─── Profile ─── */}
              {activeView === "profile" && (
                <>
                  <EditProfilePanel />
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Dialogs */}
      {attendanceBooking && <AttendanceReportDialog open={!!attendanceBooking} onOpenChange={(open) => { if (!open) setAttendanceBooking(null); }} booking={attendanceBooking} onReported={() => { setAttendanceReported((prev) => new Set([...prev, attendanceBooking.id])); }} />}
      {signDialogBooking && <SignContractDialog open={!!signDialogBooking} onOpenChange={(open) => { if (!open) setSignDialogBooking(null); }} bookingId={signDialogBooking.id} venueName={signDialogBooking.venueName} eventDate={signDialogBooking.eventDate} guarantee={signDialogBooking.guarantee} onSigned={() => { if (user) { setSignatures((prev) => ({ ...prev, [signDialogBooking.id]: [...(prev[signDialogBooking.id] ?? []), user.id] })); } }} />}
      {counterDialogOffer && <CounterOfferDialog open={!!counterDialogOffer} onOpenChange={(open) => { if (!open) setCounterDialogOffer(null); }} offerId={counterDialogOffer.id} currentTerms={{ guarantee: counterDialogOffer.guarantee, doorSplit: counterDialogOffer.door_split, merchSplit: counterDialogOffer.merch_split, eventDate: counterDialogOffer.event_date, eventTime: counterDialogOffer.event_time, venueName: counterDialogOffer.venue_name }} onCountered={() => { setOffers((prev) => prev.map((o) => o.id === counterDialogOffer.id ? { ...o, status: "negotiating" } : o)); }} />}
      {reviewOffer && <ContractReviewDialog open={!!reviewOffer} onOpenChange={(open) => { if (!open) setReviewOffer(null); }} offerId={reviewOffer.id} onProceed={(addedClauses) => { handleRespond(reviewOffer.id, "accepted", addedClauses); setReviewOffer(null); }} />}
      {advanceBooking && <AdvanceRequestDialog open={!!advanceBooking} onOpenChange={(open) => { if (!open) setAdvanceBooking(null); }} booking={{ id: advanceBooking.id, guarantee: advanceBooking.guarantee, venue_name: advanceBooking.venue_name, event_date: advanceBooking.event_date, promoter_id: advanceBooking.promoter_id }} onRequested={() => { setAdvanceRequested((prev) => new Set([...prev, advanceBooking.id])); }} />}
    </SidebarProvider>
  );
}
