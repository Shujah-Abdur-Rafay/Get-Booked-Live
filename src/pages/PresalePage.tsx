import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Music2, Ticket } from "lucide-react";
import { presaleSignupSchema } from "@/lib/publicInputValidation";

const ACCENT = "#C8FF3E";

type BookingInfo = {
  id: string;
  venue_name: string;
  event_date: string;
  presale_open: boolean;
  presale_ticket_url: string | null;
  artist_name: string | null;
  artist_avatar: string | null;
};

export default function PresalePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", city: "" });
  const [signupCount, setSignupCount] = useState(0);

  useEffect(() => {
    if (!bookingId) { setNotFound(true); setLoading(false); return; }
    const fetch = async () => {
      // Fetch booking info (use service role via edge function or public view)
      // Since bookings have RLS, we use a lightweight approach
      const { data: b, error } = await supabase
        .from("bookings")
        .select("id, venue_name, event_date, presale_open, presale_ticket_url, artist_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (error || !b) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Get artist name from public_profiles
      const { data: artistProfile } = await supabase
        .from("public_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", (b as any).artist_id)
        .maybeSingle();

      // Get signup count
      const { count } = await supabase
        .from("presale_signups")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", bookingId);

      setBooking({
        id: b.id,
        venue_name: b.venue_name,
        event_date: b.event_date,
        presale_open: (b as any).presale_open ?? false,
        presale_ticket_url: (b as any).presale_ticket_url ?? null,
        artist_name: artistProfile?.display_name ?? null,
        artist_avatar: artistProfile?.avatar_url ?? null,
      });
      setSignupCount(count ?? 0);
      setLoading(false);
    };
    fetch();
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;

    const parsed = presaleSignupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details and try again.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("presale_signups").insert({
      booking_id: bookingId,
      ...parsed.data,
    } as any);
    if (error) {
      toast.error("Failed to sign up. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSignupCount((c) => c + 1);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4">
        <div className="text-center">
          <Ticket className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold text-foreground mb-1">show not found</h1>
          <p className="text-sm text-muted-foreground">this presale page doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const eventDate = new Date(booking.event_date);
  const formattedDate = eventDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {booking.artist_avatar ? (
            <img src={booking.artist_avatar} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-white/10" loading="lazy" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1C2535] flex items-center justify-center mx-auto mb-4 border-2 border-white/10">
              <Music2 className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {booking.artist_name && (
            <h1 className="font-display text-2xl font-bold text-foreground mb-1 lowercase">{booking.artist_name}</h1>
          )}
          <p className="text-base text-foreground font-medium">{booking.venue_name}</p>
          <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: `${ACCENT}18`, color: ACCENT }}>
            <Ticket className="w-3 h-3" />
            {signupCount} {signupCount === 1 ? "fan" : "fans"} signed up
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-6">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: ACCENT }} />
              <h2 className="font-display text-lg font-bold text-foreground mb-1">you're on the list!</h2>
              <p className="text-sm text-muted-foreground">we'll email you when presale tickets go live.</p>
              {booking.presale_ticket_url && (
                <a href={booking.presale_ticket_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-9 px-5 rounded-lg text-sm font-medium mt-4 transition-all active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                  Get Tickets Now
                </a>
              )}
            </div>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold text-foreground mb-1 text-center">get presale access</h2>
              <p className="text-[13px] text-muted-foreground text-center mb-5">
                sign up to get early access to tickets before they go on sale to the public.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">name</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@email.com" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">city</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Miami, FL" required className="mt-1" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-10 font-medium active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                  {submitting ? "Signing up..." : "Sign Up for Presale"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          powered by <span className="font-display font-semibold">GetBooked.Live</span>
        </p>
      </div>
    </div>
  );
}
