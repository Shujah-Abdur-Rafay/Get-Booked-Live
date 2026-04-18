import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, ArrowRight, Check, DollarSign, Music, MapPin, Clock, Globe, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import OfferIntelligence from "@/components/OfferIntelligence";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEO from "@/components/SEO";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CURRENCIES, toUSD } from "@/lib/exchangeRates";

type ArtistOption = { user_id: string; display_name: string | null; genre: string | null; city: string | null };

const STEPS = [
  { label: "Artist", icon: Music },
  { label: "Venue", icon: MapPin },
  { label: "Date & Time", icon: CalendarIcon },
  { label: "Financials", icon: DollarSign },
  { label: "Details", icon: Clock },
  { label: "Review", icon: Check },
];

const RATE_MAP: Record<string, number> = { free: 0.20, pro: 0.10, agency: 0.06 };

// CURRENCIES and FX rate logic have been moved to src/lib/exchangeRates.ts
// and are fetched dynamically via the useExchangeRates hook.

export default function OfferFlow() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedArtist = searchParams.get("artist");

  // ── Live exchange rates (cached daily in localStorage) ───────────────────
  const {
    rates: fxRates,
    loading: fxLoading,
    isFallback: fxIsFallback,
    fetchedOn: fxFetchedOn,
    refresh: fxRefresh,
  } = useExchangeRates();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [artistSearch, setArtistSearch] = useState("");

  // Form state
  const [recipientId, setRecipientId] = useState(preselectedArtist ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventTime, setEventTime] = useState("");
  const [guarantee, setGuarantee] = useState("");
  const [doorSplit, setDoorSplit] = useState("");
  const [merchSplit, setMerchSplit] = useState("");
  const [hospitality, setHospitality] = useState("");
  const [backline, setBackline] = useState("");
  const [notes, setNotes] = useState("");
  const [commissionRate, setCommissionRate] = useState(0.20);
  const [currency, setCurrency] = useState("USD");
  // Restore draft from localStorage
  const draftKey = `offer-draft-${recipientId || "new"}`;
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.venueName) setVenueName(draft.venueName);
        if (draft.eventDate) setEventDate(new Date(draft.eventDate));
        if (draft.eventTime) setEventTime(draft.eventTime);
        if (draft.guarantee) setGuarantee(draft.guarantee);
        if (draft.doorSplit) setDoorSplit(draft.doorSplit);
        if (draft.merchSplit) setMerchSplit(draft.merchSplit);
        if (draft.hospitality) setHospitality(draft.hospitality);
        if (draft.backline) setBackline(draft.backline);
        if (draft.notes) setNotes(draft.notes);
      } catch {}
    }
  }, [draftKey]);

  // Save draft on form changes
  useEffect(() => {
    const draft = { venueName, eventDate: eventDate?.toISOString(), eventTime, guarantee, doorSplit, merchSplit, hospitality, backline, notes };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [venueName, eventDate, eventTime, guarantee, doorSplit, merchSplit, hospitality, backline, notes, draftKey]);

  const guaranteeNum = parseFloat(guarantee) || 0;
  // Use live rates from the hook; toUSD handles the inversion math
  const guaranteeUsd = toUSD(guaranteeNum, currency as any, fxRates);
  const commission = guaranteeUsd * commissionRate;
  const artistPayout = guaranteeNum - (guaranteeNum * commissionRate);
  const currencyInfo = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id:id, display_name, genre, city")
        .eq("role", "artist" as any);
      setArtists((data as ArtistOption[]) ?? []);
      if (preselectedArtist && data) {
        const found = data.find((a: any) => a.user_id === preselectedArtist);
        if (found) setRecipientName((found as any).display_name ?? "");
      }
    };
    fetchArtists();
  }, [preselectedArtist]);

  // Fetch recipient's subscription plan for dynamic commission
  useEffect(() => {
    if (!recipientId) return;
    const fetchPlan = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("user_id", recipientId)
        .single();
      const plan = (data as any)?.subscription_plan ?? "free";
      setCommissionRate(RATE_MAP[plan] ?? 0.20);
    };
    fetchPlan();
  }, [recipientId]);

  const filteredArtists = artists.filter((a) => {
    if (!artistSearch) return true;
    const s = artistSearch.toLowerCase();
    return a.display_name?.toLowerCase().includes(s) || a.genre?.toLowerCase().includes(s) || a.city?.toLowerCase().includes(s);
  });

  const [stepError, setStepError] = useState("");

  const canProceed = () => {
    switch (step) {
      case 0: return !!recipientId;
      case 1: return venueName.trim().length > 0;
      case 2: return !!eventDate;
      case 3: return guaranteeNum > 0;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const validateStep = () => {
    setStepError("");
    // No step-specific validation beyond canProceed for now
    return true;
  };

  const goNext = () => {
    if (!canProceed() || !validateStep()) return;
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user || !eventDate) return;
    setLoading(true);
    try {
      const offerId = crypto.randomUUID();
      const { error } = await supabase.from("offers").insert({
        id: offerId,
        sender_id: user.id,
        recipient_id: recipientId,
        venue_name: venueName.trim(),
        event_date: format(eventDate, "yyyy-MM-dd"),
        event_time: eventTime || null,
        guarantee: guaranteeNum,
        door_split: parseFloat(doorSplit) || null,
        merch_split: parseFloat(merchSplit) || null,
        hospitality: hospitality.trim() || null,
        backline: backline.trim() || null,
        notes: notes.trim() || null,
        // commission_rate is set server-side by trigger
      });
      if (error) throw error;

      // Send email notification to artist about new offer
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "new-offer-received",
            recipientEmail: recipientId, // Edge function resolves user_id → email
            idempotencyKey: `new-offer-${offerId}`,
            templateData: {
              venueName: venueName.trim(),
              eventDate: format(eventDate, "MMM d, yyyy"),
              guarantee: guaranteeNum,
            },
          },
        });
      } catch {
        // Email is best-effort, don't block the flow
      }

      localStorage.removeItem(draftKey);
      toast.success("Offer sent successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 pb-24 sm:pb-12">
      <SEO title="Send a Booking Offer | GetBooked.Live" description="Create and send a structured booking offer to an artist on GetBooked.Live." />
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="font-display text-2xl font-bold mb-1">Send an Offer</h1>
          <p className="text-muted-foreground text-sm">Walk through each step to build your offer.</p>
        </div>

        {/* ── FX Rate Status Banner ─────────────────────────────────────────── */}
        {fxIsFallback && !fxLoading && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {fxFetchedOn === "offline"
                  ? "Using estimated exchange rates — unable to reach the rates API."
                  : `Using cached rates from ${fxFetchedOn} — refresh for live data.`}
              </span>
            </div>
            <button
              onClick={fxRefresh}
              className="flex items-center gap-1 text-xs font-medium text-yellow-500 hover:text-yellow-400 transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}
        {fxLoading && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Fetching live exchange rates…</span>
          </div>
        )}
        {!fxIsFallback && !fxLoading && fxFetchedOn !== "pending" && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              Live rates as of <span className="font-medium text-foreground">{fxFetchedOn}</span> · Updates daily
            </span>
          </div>
        )}

        {/* Step indicator */}
        {/* Step indicator — mobile: current step only; desktop: all steps */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: show current step */}
          <div className="flex sm:hidden items-center gap-2 px-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-bold">{step + 1}</span>
            <span className="text-sm font-display font-medium">{STEPS[step].label}</span>
            <span className="text-xs text-muted-foreground ml-auto">of {STEPS.length}</span>
          </div>
          {/* Desktop: full step bar */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-[44px]",
                    i === step ? "bg-primary text-primary-foreground" :
                    i < step ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                    "bg-secondary text-muted-foreground"
                  )}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <div className={cn("w-4 h-px mx-0.5", i < step ? "bg-primary/40" : "bg-border")} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-xl bg-card border border-border p-4 sm:p-6 mb-6">
          {/* Step 0: Select Artist */}
          {step === 0 && (
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">Who are you booking?</h2>
              <p className="text-sm text-muted-foreground mb-4">Search and select an artist from the directory.</p>
              <Input
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
                placeholder="Search by name, genre, or city..."
                className="bg-background border-border mb-3 h-11 sm:h-10 text-base sm:text-sm"
              />
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {filteredArtists.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No artists found.</p>
                ) : (
                  filteredArtists.map((a) => (
                    <button
                      key={a.user_id}
                      onClick={() => { setRecipientId(a.user_id); setRecipientName(a.display_name ?? ""); }}
                      className={cn(
                        "w-full text-left px-4 py-3.5 sm:py-3 rounded-lg border transition-all active:scale-[0.98]",
                        recipientId === a.user_id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border/80 bg-background"
                      )}
                    >
                      <span className="font-medium text-sm">{a.display_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {[a.genre, a.city].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 1: Venue */}
          {step === 1 && (
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">Where's the show?</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter the venue name for this booking.</p>
              <Label className="text-sm">Venue name</Label>
              <Input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="The Ryman Auditorium"
                className="mt-1.5 bg-background border-border"
                maxLength={200}
              />
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">When's the show?</h2>
              <p className="text-sm text-muted-foreground mb-4">Pick the event date and optionally set a time.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Event date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1.5 bg-background border-border", !eventDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={eventDate}
                        onSelect={setEventDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm">Show time (optional)</Label>
                  <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="mt-1.5 bg-background border-border" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Financials */}
          {step === 3 && (
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">Set the deal terms</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter the financial details for this offer.</p>

              {/* AI Offer Intelligence */}
              {recipientId && (
                <OfferIntelligence
                  artistId={recipientId}
                  genre={artists.find((a) => a.user_id === recipientId)?.genre ?? null}
                  city={artists.find((a) => a.user_id === recipientId)?.city ?? null}
                />
              )}

              <div className="space-y-4">
                {/* Currency selector */}
                <div>
                  <Label className="text-sm flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="mt-1.5 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.flag} {c.code} — {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Guarantee ({currencyInfo.symbol})</Label>
                  <Input type="number" min="0" step="50" value={guarantee} onChange={(e) => setGuarantee(e.target.value)} placeholder="2500" className="mt-1.5 bg-background border-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Door split (%)</Label>
                    <Input type="number" min="0" max="100" value={doorSplit} onChange={(e) => setDoorSplit(e.target.value)} placeholder="80" className="mt-1.5 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-sm">Merch split (%)</Label>
                    <Input type="number" min="0" max="100" value={merchSplit} onChange={(e) => setMerchSplit(e.target.value)} placeholder="100" className="mt-1.5 bg-background border-border" />
                  </div>
                </div>

                {/* Commission calculator */}
                {guaranteeNum > 0 && (
                  <div className="rounded-lg bg-background border border-border p-4 space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Commission Breakdown</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Guarantee</span>
                      <span className="font-medium">{currencyInfo.symbol}{guaranteeNum.toLocaleString()}</span>
                    </div>
                    {currency !== "USD" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">≈ USD equivalent</span>
                        <span className="text-muted-foreground">${guaranteeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform fee ({(commissionRate * 100).toFixed(0)}%)</span>
                      <span className="font-medium text-destructive">-{currencyInfo.symbol}{(guaranteeNum * commissionRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {currency !== "USD" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">≈ ${commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD commission</span>
                        <span />
                      </div>
                    )}
                    <div className="border-t border-border my-1" />
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">Artist payout</span>
                      <span className="font-bold text-primary">{currencyInfo.symbol}{artistPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* Commission upgrade warning for Free tier users on $1,000+ offers */}
                {guaranteeUsd >= 1000 && commissionRate >= 0.20 && profile?.subscription_plan === "free" && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-500 mb-1">
                          You're about to pay ${(guaranteeUsd * 0.20).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in commission
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Upgrade to <span className="text-primary font-semibold">Pro Yearly ($276/year)</span> and pay only ${(guaranteeUsd * 0.10).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} on this booking. That's a <span className="text-primary font-semibold">${(guaranteeUsd * 0.10).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} savings</span> — the upgrade pays for itself in one deal.
                        </p>
                        <Link
                          to="/pricing"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                          Upgrade to Pro <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {step === 4 && (
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">Additional details</h2>
              <p className="text-sm text-muted-foreground mb-4">Optional info to include with the offer.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Hospitality</Label>
                  <Textarea value={hospitality} onChange={(e) => setHospitality(e.target.value)} placeholder="Dressing room, catering, drink tickets..." className="mt-1.5 bg-background border-border" rows={2} maxLength={500} />
                </div>
                <div>
                  <Label className="text-sm">Backline provided</Label>
                  <Textarea value={backline} onChange={(e) => setBackline(e.target.value)} placeholder="Full drum kit, bass amp, guitar amps..." className="mt-1.5 bg-background border-border" rows={2} maxLength={500} />
                </div>
                <div>
                  <Label className="text-sm">Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any other details or special requests..." className="mt-1.5 bg-background border-border" rows={3} maxLength={1000} />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">Review your offer</h2>
              <p className="text-sm text-muted-foreground mb-4">Confirm everything looks good before sending.</p>
              <div className="space-y-3">
                <ReviewRow label="Artist" value={recipientName} />
                <ReviewRow label="Venue" value={venueName} />
                <ReviewRow label="Date" value={eventDate ? format(eventDate, "MMMM d, yyyy") : "—"} />
                {eventTime && <ReviewRow label="Time" value={eventTime} />}
                <ReviewRow label="Guarantee" value={`${currencyInfo.symbol}${guaranteeNum.toLocaleString()}${currency !== "USD" ? ` (≈ $${guaranteeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD)` : ""}`} />
                <ReviewRow label="Currency" value={`${currencyInfo.flag} ${currency}`} />
                {doorSplit && <ReviewRow label="Door split" value={`${doorSplit}%`} />}
                {merchSplit && <ReviewRow label="Merch split" value={`${merchSplit}%`} />}
                {hospitality && <ReviewRow label="Hospitality" value={hospitality} />}
                {backline && <ReviewRow label="Backline" value={backline} />}
                {notes && <ReviewRow label="Notes" value={notes} />}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span className="text-destructive font-medium">-{currencyInfo.symbol}{(guaranteeNum * commissionRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {currency !== "USD" && (
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-muted-foreground">≈ ${commission.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
                      <span />
                    </div>
                  )}
                  <div className="flex justify-between text-sm mt-1">
                    <span className="font-semibold">Artist receives</span>
                    <span className="font-bold text-primary">{currencyInfo.symbol}{artistPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation — fixed bottom on mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3 container mx-auto max-w-2xl">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0} className="border-border active:scale-[0.97] transition-transform h-12 sm:h-10 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {stepError && <p className="text-xs text-destructive self-center">{stepError}</p>}
            {step < 5 ? (
              <Button onClick={goNext} disabled={!canProceed()} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform h-12 sm:h-10 w-full sm:w-auto">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform h-12 sm:h-10 w-full sm:w-auto">
                {loading ? "Sending..." : "Send Offer"} <Check className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
