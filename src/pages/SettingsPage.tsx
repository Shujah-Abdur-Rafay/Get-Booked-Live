import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  User, Bell, CreditCard, Shield, Plug, Link2, AlertTriangle,
  Camera, Loader2, Check, Copy, ExternalLink, Lock, Download, Trash2,
  Music, Instagram, Globe, Youtube
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "smart-link", label: "Smart Link", icon: Link2 },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  return (
    <div className="min-h-screen pt-[60px] bg-background">
      <SEO title="Account Settings | GetBooked.Live" description="Manage your profile, notifications, subscription, and integrations on GetBooked.Live." />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="mb-8">
          <span className="section-label">settings</span>
          <h1 className="section-heading">account settings</h1>
          <p className="section-subtext">Manage your profile, preferences, and integrations.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar — horizontal scroll on mobile, vertical on desktop */}
          <nav className="md:w-[240px] shrink-0" aria-label="Settings sections">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-body transition-colors shrink-0 min-h-[44px] ${
                      isActive
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    } ${s.id === "danger" ? "md:mt-4 md:border-t md:border-destructive/20 md:pt-3" : ""}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${s.id === "danger" ? "text-destructive" : ""}`} />
                    <span className={s.id === "danger" ? "text-destructive" : ""}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {activeSection === "profile" && <ProfileSection />}
            {activeSection === "notifications" && <NotificationsSection />}
            {activeSection === "subscription" && <SubscriptionSection />}
            {activeSection === "security" && <SecuritySection />}
            {activeSection === "integrations" && <IntegrationsSection />}
            {activeSection === "smart-link" && <SmartLinkSection />}
            {activeSection === "danger" && <DangerSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section 1: Profile ─── */
function ProfileSection() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [stateName, setStateName] = useState((profile as any)?.state ?? "");
  const [website, setWebsite] = useState((profile as any)?.website ?? "");
  const [instagram, setInstagram] = useState((profile as any)?.instagram ?? "");
  const [twitter, setTwitter] = useState((profile as any)?.twitter ?? "");
  const [youtube, setYoutube] = useState(profile?.youtube ?? "");
  const [spotify, setSpotify] = useState((profile as any)?.spotify ?? "");
  const [soundcloud, setSoundcloud] = useState((profile as any)?.soundcloud ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: displayName,
        bio,
        city,
        state: stateName,
        website,
        instagram,
        twitter,
        youtube,
        spotify,
        soundcloud,
        avatar_url: avatarUrl,
      }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6" aria-label="Profile settings">
      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-6">
        <h2 className="text-lg font-display font-semibold text-foreground">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full bg-secondary border border-white/10 overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" width={64} height={64} />
            ) : (
              <span className="text-xl font-display font-bold text-foreground">{(displayName || "?")[0].toUpperCase()}</span>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              aria-label="Upload avatar"
            >
              {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <div>
            <p className="text-sm font-body text-foreground">Profile photo</p>
            <p className="text-xs text-muted-foreground font-body">JPG, PNG. Max 5MB.</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground font-body">Display name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-body">Email</Label>
            <Input value={user?.email ?? ""} disabled className="mt-1 opacity-60" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-body">City</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-body">State</Label>
            <Input value={stateName} onChange={e => setStateName(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-body">Bio</Label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="mt-1" />
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs text-muted-foreground font-body mb-3">Social & Music Links</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Website", val: website, set: setWebsite, icon: Globe },
              { label: "Instagram", val: instagram, set: setInstagram, icon: Instagram },
              { label: "X / Twitter", val: twitter, set: setTwitter, icon: Globe },
              { label: "YouTube", val: youtube, set: setYoutube, icon: Youtube },
              { label: "Spotify", val: spotify, set: setSpotify, icon: Music },
              { label: "SoundCloud", val: soundcloud, set: setSoundcloud, icon: Music },
            ].map(f => (
              <div key={f.label}>
                <Label className="text-xs text-muted-foreground font-body">{f.label}</Label>
                <Input value={f.val} onChange={e => f.set(e.target.value)} placeholder={`Your ${f.label} URL`} className="mt-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-foreground/60 font-body">
            Last updated {profile ? format(new Date((profile as any).updated_at ?? Date.now()), "MMM d, yyyy 'at' h:mm a") : "—"}
          </p>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground font-display font-bold text-sm min-h-[44px] px-6 active:scale-[0.96]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 2: Notifications ─── */
function NotificationsSection() {
  const { user, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    offer_received: true,
    offer_accepted: true,
    offer_declined: true,
    new_message: false,
    in_app: true,
    weekly_digest: true,
  });
  const [frequency, setFrequency] = useState("instant");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("email_preferences").eq("user_id", user.id).single();
      if (data?.email_preferences) {
        setPrefs(prev => ({ ...prev, ...(data.email_preferences as Record<string, boolean>) }));
        setFrequency((data.email_preferences as any).frequency ?? "instant");
      }
      setLoaded(true);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        email_preferences: { ...prefs, frequency } as any,
      }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggles = [
    { key: "offer_received", label: "Email when I receive an offer", defaultOn: true },
    { key: "offer_accepted", label: "Email when my offer is accepted", defaultOn: true },
    { key: "offer_declined", label: "Email when my offer is declined", defaultOn: true },
    { key: "new_message", label: "Email for new messages", defaultOn: false },
    { key: "in_app", label: "In-app notifications", defaultOn: true },
    { key: "weekly_digest", label: "Weekly platform digest", defaultOn: true },
  ];

  if (!loaded) return <SectionLoading />;

  return (
    <section className="space-y-6" aria-label="Notification settings">
      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold text-foreground">Notifications</h2>

        <div className="space-y-4">
          {toggles.map(t => (
            <div key={t.key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-body text-foreground cursor-pointer" htmlFor={`notif-${t.key}`}>{t.label}</label>
              <Switch
                id={`notif-${t.key}`}
                checked={prefs[t.key] ?? t.defaultOn}
                onCheckedChange={v => setPrefs(p => ({ ...p, [t.key]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs text-muted-foreground font-body mb-2">Notification frequency</p>
          <div className="flex gap-2">
            {(["instant", "hourly", "daily"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-3 py-2 rounded-lg text-xs font-body capitalize min-h-[44px] transition-colors ${
                  frequency === f
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "instant" ? "Instant" : f === "hourly" ? "Hourly digest" : "Daily digest"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground font-display font-bold text-sm min-h-[44px] px-6 active:scale-[0.96]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save preferences"}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 3: Subscription ─── */
function SubscriptionSection() {
  const { profile, subscription } = useAuth();
  const plan = profile?.subscription_plan ?? "free";
  const navigate = useNavigate();

  const planMeta: Record<string, { name: string; price: string; features: string[] }> = {
    free: { name: "Free", price: "$0/mo", features: ["3 offers/month", "20% platform fee", "Basic analytics"] },
    pro: { name: "Pro", price: "$29/mo", features: ["Unlimited offers", "10% platform fee", "Advanced analytics", "Priority support"] },
    agency: { name: "Agency", price: "$99/mo", features: ["25 profiles", "5–7% platform fee", "Team management", "API access"] },
  };
  const meta = planMeta[plan] ?? planMeta.free;

  return (
    <section className="space-y-6" aria-label="Subscription settings">
      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold text-foreground">Subscription</h2>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-base font-display font-bold text-foreground">{meta.name} Plan</p>
            <p className="text-sm text-muted-foreground font-body">{meta.price}</p>
            {subscription?.subscription_end && (
              <p className="text-xs text-muted-foreground font-body mt-1">
                Next billing: {format(new Date(subscription.subscription_end), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs text-muted-foreground font-body mb-2">Features included</p>
          <ul className="space-y-1.5">
            {meta.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm font-body text-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {plan === "free" ? (
            <Button onClick={() => navigate("/pricing")} className="bg-primary text-primary-foreground font-display font-bold text-sm min-h-[44px] px-6 active:scale-[0.96]">
              Upgrade plan
            </Button>
          ) : (
            <Button variant="outline" className="text-sm min-h-[44px] font-body" onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("customer-portal");
                if (error) throw error;
                if (data?.url) window.open(data.url, "_blank");
              } catch { toast.error("Could not open billing portal"); }
            }}>
              Manage billing
            </Button>
          )}
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs text-muted-foreground font-body mb-3">Billing history</p>
          <div className="bg-secondary/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground font-body">No invoices yet</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 4: Security ─── */
function SecuritySection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};
    if (!newPw || newPw.length < 8) errs.newPw = "Password must be at least 8 characters";
    if (newPw !== confirmPw) errs.confirmPw = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6" aria-label="Security settings">
      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold text-foreground">Change password</h2>

        <div className="space-y-4 max-w-md">
          <div>
            <Label className="text-xs text-muted-foreground font-body">Current password</Label>
            <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="mt-1" autoComplete="current-password" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-body">New password</Label>
            <Input
              type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="mt-1"
              autoComplete="new-password" aria-invalid={!!errors.newPw} aria-describedby={errors.newPw ? "new-pw-error" : undefined}
            />
            {errors.newPw && <p id="new-pw-error" role="alert" className="text-destructive text-xs mt-1 font-body">{errors.newPw}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-body">Confirm new password</Label>
            <Input
              type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="mt-1"
              autoComplete="new-password" aria-invalid={!!errors.confirmPw} aria-describedby={errors.confirmPw ? "confirm-pw-error" : undefined}
            />
            {errors.confirmPw && <p id="confirm-pw-error" role="alert" className="text-destructive text-xs mt-1 font-body">{errors.confirmPw}</p>}
          </div>
          <Button onClick={handleChangePassword} disabled={saving} className="bg-primary text-primary-foreground font-display font-bold text-sm min-h-[44px] px-6 active:scale-[0.96]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Two-factor authentication</h2>
        <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-4">
          <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-body text-foreground">2FA is not yet available</p>
            <p className="text-xs text-muted-foreground font-body">We'll notify you when this feature launches.</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs min-h-[44px] font-body" onClick={() => toast.success("We'll notify you when 2FA is available!")}>
            Notify me
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 5: Integrations ─── */
function IntegrationsSection() {
  const { user, profile } = useAuth();
  const hasSpotify = !!(profile as any)?.streaming_stats?.source;
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    onboarding_complete: boolean;
    payouts_enabled: boolean;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const isArtist = (profile as any)?.role === "artist";

  const fetchStripeStatus = useCallback(async () => {
    if (!user) return;
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status");
      if (error) throw error;
      setStripeStatus(data);
    } catch {
      setStripeStatus({ connected: false, onboarding_complete: false, payouts_enabled: false });
    } finally {
      setStripeLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isArtist) fetchStripeStatus();
  }, [isArtist, fetchStripeStatus]);

  // Handle return from Stripe Connect onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_connect") === "success") {
      toast.success("Stripe account connected!");
      fetchStripeStatus();
      window.history.replaceState({}, "", "/settings");
    }
  }, [fetchStripeStatus]);

  const handleConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start Stripe Connect");
    } finally {
      setConnectLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setDashboardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-dashboard");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open Stripe dashboard");
    } finally {
      setDashboardLoading(false);
    }
  };

  const integrations = [
    { name: "Spotify", emoji: "🎵", desc: "Sync streaming stats and top tracks", connected: hasSpotify, phase: 1 },
    { name: "Google Calendar", emoji: "📅", desc: "Sync bookings to your calendar", connected: false, phase: 1 },
    { name: "Instagram", emoji: "📸", desc: "Verify your profile badge", connected: false, phase: 1 },
    { name: "Apple Music", emoji: "🍎", desc: "Import listener analytics", connected: false, phase: 2 },
    { name: "Mailchimp", emoji: "📧", desc: "Sync fan email lists", connected: false, phase: 2 },
    { name: "TikTok", emoji: "🎶", desc: "Pull engagement metrics", connected: false, phase: 2 },
    { name: "SoundCloud", emoji: "☁️", desc: "Import play counts", connected: false, phase: 2 },
  ];

  return (
    <section className="space-y-6" aria-label="Integrations settings">
      {/* Stripe Connect — artists only */}
      {isArtist && (
        <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#635BFF]" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Stripe Connect</h2>
              <p className="text-xs text-muted-foreground font-body">Receive payments directly to your bank account</p>
            </div>
          </div>

          {stripeLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-body">Checking status…</span>
            </div>
          ) : stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-body text-emerald-400 font-medium">Stripe account connected</p>
                  <p className="text-xs text-emerald-400/70 font-body">
                    {stripeStatus.payouts_enabled ? "Payouts enabled — you can receive payments" : "Account connected — payouts pending verification"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs min-h-[44px] font-body"
                  onClick={handleOpenDashboard}
                  disabled={dashboardLoading}
                >
                  {dashboardLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <ExternalLink className="w-3 h-3 mr-1.5" />}
                  View Stripe dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs min-h-[44px] font-body"
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                >
                  {connectLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                  Update account
                </Button>
              </div>
            </div>
          ) : stripeStatus?.connected && !stripeStatus?.onboarding_complete ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-body text-amber-400 font-medium">Onboarding incomplete</p>
                  <p className="text-xs text-amber-400/70 font-body">Complete your Stripe account setup to start receiving payments.</p>
                </div>
              </div>
              <Button
                onClick={handleConnectStripe}
                disabled={connectLoading}
                className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white font-display font-bold text-sm min-h-[44px] px-6 active:scale-[0.96]"
              >
                {connectLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Complete Stripe setup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-body text-muted-foreground">
                  Not connected — connect your bank account to receive payments from bookings.
                </p>
              </div>
              <Button
                onClick={handleConnectStripe}
                disabled={connectLoading}
                className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white font-display font-bold text-sm min-h-[44px] px-6 active:scale-[0.96]"
              >
                {connectLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Connect Stripe account
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Other integrations */}
      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold text-foreground">Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {integrations.map(i => (
            <div key={i.name} className={`rounded-xl border p-4 flex items-start gap-3 ${i.phase === 2 ? "border-white/[0.04] opacity-50" : "border-white/[0.06]"}`}>
              <span className="text-2xl">{i.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-display font-semibold text-foreground">{i.name}</p>
                  {i.phase === 2 && (
                    <span className="text-[9px] font-display font-bold bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">Coming soon</span>
                  )}
                  {i.connected && (
                    <span className="text-[9px] font-display font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-body mt-0.5">{i.desc}</p>
              </div>
              {i.phase === 1 && (
                <Button
                  variant={i.connected ? "outline" : "default"}
                  size="sm"
                  className={`text-xs min-h-[44px] font-body shrink-0 ${!i.connected ? "bg-primary text-primary-foreground font-display font-bold" : ""}`}
                  onClick={() => {
                    if (i.connected) toast.success(`${i.name} disconnected`);
                    else toast("Integration coming soon — use Profile Setup to connect Spotify.", { icon: "🔗" });
                  }}
                >
                  {i.connected ? "Disconnect" : "Connect"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section 6: Smart Link ─── */
function SmartLinkSection() {
  const { profile } = useAuth();
  const slug = (profile as any)?.slug ?? "";
  const [copied, setCopied] = useState(false);
  const smartUrl = `${window.location.origin}/p/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(smartUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-6" aria-label="Smart link settings">
      <div className="bg-card rounded-xl border border-white/[0.06] p-5 md:p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold text-foreground">Smart Link</h2>

        <div>
          <Label className="text-xs text-muted-foreground font-body">Your profile URL</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input value={smartUrl} readOnly className="text-sm font-body flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] shrink-0"
              onClick={handleCopy}
              aria-label="Copy link to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] shrink-0"
              onClick={() => window.open(smartUrl, "_blank")}
              aria-label="Preview profile"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground font-body">Username</Label>
          <Input value={slug} readOnly className="mt-1 opacity-60" />
          <p className="text-[11px] text-muted-foreground/60 font-body mt-1">Username is generated from your display name. Edit your display name in the Profile section to change it.</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 7: Danger Zone ─── */
function DangerSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const [profileRes, offersRes, bookingsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("offers").select("*").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`),
        supabase.from("bookings").select("*").or(`artist_id.eq.${user.id},promoter_id.eq.${user.id}`),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data,
        offers: offersRes.data,
        bookings: bookingsRes.data,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `getbooked-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Could not export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmEmail !== user?.email) {
      toast.error("Email does not match");
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
      navigate("/");
      toast.success("Account deleted");
    } catch (err: any) {
      toast.error(err.message || "Could not delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-6" aria-label="Danger zone">
      <div className="bg-card rounded-xl border border-destructive/30 p-5 md:p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold text-destructive">Danger Zone</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-secondary/50">
          <div>
            <p className="text-sm font-body font-medium text-foreground">Export my data</p>
            <p className="text-xs text-muted-foreground font-body">Download all your profile, offers, and bookings as JSON.</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px] font-body text-xs shrink-0" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            {exporting ? "Exporting…" : "Export data"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/10">
          <div>
            <p className="text-sm font-body font-medium text-foreground">Delete my account</p>
            <p className="text-xs text-destructive/80 font-body">This is permanent and cannot be undone.</p>
          </div>
          {!showDeleteConfirm ? (
            <Button variant="destructive" size="sm" className="min-h-[44px] font-body text-xs shrink-0" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete account
            </Button>
          ) : (
            <div className="w-full sm:w-auto space-y-2">
              <p className="text-xs text-destructive font-body font-medium">Type your email to confirm:</p>
              <Input
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
                placeholder={user?.email}
                className="text-sm"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="min-h-[44px] font-body text-xs flex-1" onClick={() => { setShowDeleteConfirm(false); setConfirmEmail(""); }}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="min-h-[44px] font-body text-xs flex-1" disabled={deleting || confirmEmail !== user?.email} onClick={handleDelete}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently delete"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Shared ─── */
function SectionLoading() {
  return (
    <div className="bg-card rounded-xl border border-white/[0.06] p-6 flex items-center justify-center min-h-[200px]" aria-busy="true">
      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" role="status" aria-label="Loading" />
    </div>
  );
}
