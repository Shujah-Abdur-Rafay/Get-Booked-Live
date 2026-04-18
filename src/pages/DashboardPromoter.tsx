import { useEffect, useState } from "react";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Users, Plus, PenLine, CheckCircle, FileText, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Megaphone, Loader2, UserCog, ArrowRight } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import SignContractDialog from "@/components/SignContractDialog";
import NegotiationThread from "@/components/NegotiationThread";
import RecommendedArtists from "@/components/RecommendedArtists";
import AIRecommendationPanel from "@/components/AIRecommendationPanel";
import AttendanceReportDialog from "@/components/AttendanceReportDialog";
import InsuranceOfferCard from "@/components/InsuranceOfferCard";
import DepositPaymentButton from "@/components/DepositPaymentButton";
import FinancingOption from "@/components/FinancingOption";
import { openSignedContract } from "@/lib/db-call";
import FreeOfferBanner from "@/components/FreeOfferBanner";
import EditProfilePanel from "@/components/EditProfilePanel";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import ThreadSummary from "@/components/ThreadSummary";
import TrialBanner from "@/components/TrialBanner";
import SEO from "@/components/SEO";

type PromoterView = "overview" | "offers" | "discover" | "profile";
type Offer = { id: string; venue_name: string; event_date: string; event_time: string | null; guarantee: number; door_split: number | null; merch_split: number | null; status: string; recipient_id: string; sender_id: string; created_at: string };
type Booking = { id: string; offer_id: string; contract_url: string | null; status: string; artist_id: string; promoter_id: string; venue_name: string; event_date: string; guarantee: number };

const ACCENT = "#FF5C8A";
const STATUS_DOT: Record<string, string> = { pending: "bg-yellow-400", accepted: "bg-green-400", declined: "bg-red-400", negotiating: "bg-amber-400" };

const navItems: NavItem<PromoterView>[] = [
  { title: "overview", value: "overview", icon: Megaphone },
  { title: "offers", value: "offers", icon: Send },
  { title: "discover", value: "discover", icon: Users },
  { title: "edit profile", value: "profile", icon: UserCog },
];

export default function PromoterDashboard() {
  const { user, profile } = useAuth();
  const [activeView, setActiveView] = useState<PromoterView>("overview");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [signatures, setSignatures] = useState<Record<string, string[]>>({});
  const [signDialogBooking, setSignDialogBooking] = useState<{ id: string; venueName: string; eventDate: string; guarantee: number } | null>(null);
  const [attendanceBooking, setAttendanceBooking] = useState<Booking | null>(null);
  const [attendanceReported, setAttendanceReported] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [offersRes, bookingsRes] = await Promise.all([
        supabase.from("offers").select("*").eq("sender_id", user.id).order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        supabase.from("bookings").select("id, offer_id, contract_url, status, artist_id, promoter_id, venue_name, event_date, guarantee").eq("promoter_id", user.id),
      ]);
      const fetchedOffers = (offersRes.data as Offer[]) ?? [];
      setHasMore(fetchedOffers.length === PAGE_SIZE);
      setOffers(fetchedOffers);
      const bks = (bookingsRes.data as Booking[]) ?? [];
      setBookings(bks);
      if (bks.length > 0) {
        const { data: sigData } = await supabase.from("contract_signatures").select("booking_id, user_id").in("booking_id", bks.map((b) => b.id));
        const sigMap: Record<string, string[]> = {};
        (sigData ?? []).forEach((s: any) => { if (!sigMap[s.booking_id]) sigMap[s.booking_id] = []; sigMap[s.booking_id].push(s.user_id); });
        setSignatures(sigMap);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, page]);

  const getBookingForOffer = (offerId: string) => bookings.find((b) => b.offer_id === offerId);
  const sentCount = offers.length;
  const acceptedCount = offers.filter((o) => o.status === "accepted").length;
  const pendingCount = offers.filter((o) => o.status === "pending").length;
  const totalSpend = offers.filter((o) => o.status === "accepted").reduce((s, o) => s + o.guarantee, 0);
  const nextEvent = bookings.filter((b) => new Date(b.event_date) >= new Date()).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0];

  const navWithCounts = navItems.map((n) => n.value === "offers" ? { ...n, count: pendingCount } : n);

  const renderOfferCard = (offer: Offer) => {
    const booking = getBookingForOffer(offer.id);
    return (
      <div key={offer.id} className="group rounded-lg border border-white/[0.06] bg-[#0e1420] hover:border-white/[0.12] transition-colors">
      <SEO title="Promoter Dashboard | GetBooked.Live" description="Manage your offers, bookings, and artist pipeline as a promoter." />
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

        {offer.status === "negotiating" && (
          <div className="px-4 pb-3 border-t border-white/[0.04] mt-2 pt-2 space-y-2">
            <ThreadSummary offerId={offer.id} />
            <NegotiationThread offerId={offer.id} offer={offer} onOfferUpdated={(newStatus, updatedTerms) => { setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, status: newStatus, ...(updatedTerms ?? {}) } : o)); }} />
          </div>
        )}

        {offer.status === "accepted" && booking && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 border-t border-white/[0.04] mt-2 pt-2">
            {booking.contract_url && (
              <Button size="sm" variant="ghost" onClick={() => openSignedContract(booking.contract_url!)} className="h-7 text-[11px] hover:bg-white/5 active:scale-[0.97] px-2.5" style={{ color: ACCENT }}>
                <FileText className="w-3 h-3 mr-1" /> contract
              </Button>
            )}
            {user && signatures[booking.id]?.includes(user.id) ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ color: ACCENT, backgroundColor: `${ACCENT}12` }}>
                <CheckCircle className="w-3 h-3" /> signed
              </span>
            ) : booking.contract_url ? (
              <Button size="sm" onClick={() => setSignDialogBooking({ id: booking.id, venueName: offer.venue_name, eventDate: offer.event_date, guarantee: offer.guarantee })} className="h-7 text-[11px] active:scale-[0.97] px-2.5" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                <PenLine className="w-3 h-3 mr-1" /> sign
              </Button>
            ) : null}
            {new Date(offer.event_date) < new Date() && !attendanceReported.has(booking.id) && (
              <Button size="sm" variant="ghost" onClick={() => setAttendanceBooking(booking)} className="h-7 text-[11px] text-[#FFB83E] hover:bg-[#FFB83E]/10 active:scale-[0.97] px-2.5">
                <Users className="w-3 h-3 mr-1" /> attendance
              </Button>
            )}
            {attendanceReported.has(booking.id) && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3EFFBE] font-medium px-2.5 py-1"><CheckCircle className="w-3 h-3" /> reported</span>
            )}
            {booking.status !== "deposit_paid" && booking.status !== "completed" && (
              <DepositPaymentButton bookingId={booking.id} guarantee={booking.guarantee} onSuccess={() => { setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "deposit_paid" } : b)); }} />
            )}
            {booking.status === "deposit_paid" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3EFFBE] font-medium px-2.5 py-1"><CheckCircle className="w-3 h-3" /> deposit paid</span>
            )}
            {booking.status === "completed" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3EFFBE] font-medium px-2.5 py-1"><CheckCircle className="w-3 h-3" /> paid in full</span>
            )}
            {user && signatures[booking.id]?.includes(user.id) && (signatures[booking.id]?.length ?? 0) >= 2 && (
              <div className="w-full mt-1 space-y-2">
                <InsuranceOfferCard bookingId={booking.id} guarantee={offer.guarantee} userRole="promoter" />
                <FinancingOption bookingId={booking.id} guarantee={offer.guarantee} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#080C14]">
        <DashboardSidebar items={navWithCounts} activeView={activeView} onViewChange={setActiveView as (v: string) => void} accentColor={ACCENT} roleLabel="promoter" roleIcon={Megaphone} displayName={profile?.display_name ?? undefined} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6 pt-14">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="text-[11px] text-muted-foreground lowercase">{activeView === "overview" ? "dashboard" : activeView}</span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-5">

              <DashboardOnboarding />
              {activeView === "overview" && (
                <>
                  <TrialBanner />
                  <GettingStartedChecklist variant="promoter" />
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] grid grid-cols-2 lg:grid-cols-4 divide-y divide-white/[0.06] lg:divide-y-0 lg:divide-x lg:divide-white/[0.06]">
                    {[
                      { label: "sent", value: loading ? "—" : sentCount, color: ACCENT },
                      { label: "accepted", value: loading ? "—" : acceptedCount, color: "#4ADE80" },
                      { label: "total spend", value: loading ? "—" : `$${totalSpend.toLocaleString()}`, color: "#FBBF24" },
                      { label: "next event", value: loading ? "—" : (nextEvent ? `${nextEvent.venue_name.toLowerCase().slice(0, 16)} · ${new Date(nextEvent.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"), color: "#FFB83E" },
                    ].map((stat) => (
                      <div key={stat.label} className="px-4 py-3.5 sm:py-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="font-display text-base sm:text-lg font-bold tabular-nums truncate" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Link to="/directory">
                      <Button size="sm" className="h-7 text-[11px] active:scale-[0.97] px-3 lowercase" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                        <Plus className="w-3 h-3 mr-1" /> find artists
                      </Button>
                    </Link>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">recent offers</h2>
                      <button onClick={() => setActiveView("offers")} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors lowercase">view all →</button>
                    </div>
                    {loading ? (
                      <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg bg-[#0e1420]" />)}</div>
                    ) : offers.length === 0 ? (
                      <EmptyState
                        emoji="🎯"
                        title="Your first booking is one offer away"
                        description="Browse verified artists and send a structured offer in minutes."
                        actionLabel="Browse artists →"
                        actionHref="/directory"
                      />
                    ) : (
                      <div className="space-y-1.5">{offers.slice(0, 5).map(renderOfferCard)}</div>
                    )}
                  </div>
                </>
              )}

              {activeView === "offers" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">all offers</h2>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{offers.length} total</span>
                  </div>
                  <FreeOfferBanner mode="sent" />
                  {loading ? (
                    <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg bg-[#0e1420]" />)}</div>
                   ) : offers.length === 0 ? (
                    <EmptyState
                      emoji="🎯"
                      title="Your first booking is one offer away"
                      description="Browse verified artists and send a structured offer in minutes."
                      actionLabel="Browse artists →"
                      actionHref="/directory"
                    />
                  ) : (
                    <>
                      <div className="space-y-1.5">{offers.map(renderOfferCard)}</div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-7 text-[11px] text-muted-foreground active:scale-[0.97]"><ChevronLeft className="w-3.5 h-3.5 mr-1" /> prev</Button>
                        <span className="text-[11px] text-muted-foreground tabular-nums">page {page + 1}</span>
                        <Button size="sm" variant="ghost" disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="h-7 text-[11px] text-muted-foreground active:scale-[0.97]">next <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeView === "discover" && (
                <>
                  <AIRecommendationPanel />
                  <div className="border-t border-white/[0.06] pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">browse directory</h2>
                      <Link to="/directory"><Button variant="ghost" size="sm" className="text-[11px] lowercase h-7 text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3 mr-1" /> full directory</Button></Link>
                    </div>
                    <RecommendedArtists />
                  </div>
                </>
              )}

              {activeView === "profile" && <EditProfilePanel />}
            </div>
          </main>
        </div>
      </div>

      {attendanceBooking && <AttendanceReportDialog open={!!attendanceBooking} onOpenChange={(open) => { if (!open) setAttendanceBooking(null); }} booking={attendanceBooking} onReported={() => { setAttendanceReported((prev) => new Set([...prev, attendanceBooking.id])); }} />}
      {signDialogBooking && <SignContractDialog open={!!signDialogBooking} onOpenChange={(open) => { if (!open) setSignDialogBooking(null); }} bookingId={signDialogBooking.id} venueName={signDialogBooking.venueName} eventDate={signDialogBooking.eventDate} guarantee={signDialogBooking.guarantee} onSigned={() => { if (user) { setSignatures((prev) => ({ ...prev, [signDialogBooking.id]: [...(prev[signDialogBooking.id] ?? []), user.id] })); } }} />}
    </SidebarProvider>
  );
}
