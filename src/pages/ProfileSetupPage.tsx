import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Mic2, Megaphone, Building2, Wrench, Camera as CameraIcon, Music, Youtube } from "lucide-react";
import toast from "react-hot-toast";
import BackButton from "@/components/BackButton";
import Breadcrumbs from "@/components/Breadcrumbs";
import SEO from "@/components/SEO";

const ROLE_META: Record<string, { icon: any; label: string; accent: string; stepLabel: string }> = {
  artist: { icon: Mic2, label: "Artist", accent: "text-[hsl(var(--role-artist))]", stepLabel: "Set up your artist profile" },
  promoter: { icon: Megaphone, label: "Promoter", accent: "text-[hsl(var(--role-promoter))]", stepLabel: "Set up your promoter profile" },
  venue: { icon: Building2, label: "Venue", accent: "text-[hsl(var(--role-venue))]", stepLabel: "Set up your venue profile" },
  production: { icon: Wrench, label: "Production", accent: "text-[hsl(var(--role-production))]", stepLabel: "Set up your production profile" },
  photo_video: { icon: CameraIcon, label: "Creative", accent: "text-[hsl(var(--role-photo))]", stepLabel: "Set up your creative profile" },
};

export default function ProfileSetup() {
  const { user, profile, refreshProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Admin users should never go through the role onboarding flow
  useEffect(() => {
    if (isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, navigate]);
  const role = profile?.role ?? "artist";
  const meta = ROLE_META[role] ?? ROLE_META.artist;
  const RoleIcon = meta.icon;

  // Shared fields
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [state, setState] = useState(profile?.state ?? "");
  const [country, setCountry] = useState((profile as any)?.country ?? "");
  const [timezone, setTimezone] = useState("America/New_York");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Artist-specific
  const [genre, setGenre] = useState(profile?.genre ?? "");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [spotify, setSpotify] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState(profile?.youtube ?? "");
  const [rateMin, setRateMin] = useState(profile?.rate_min?.toString() ?? "");
  // Promoter-specific
  const [companyName, setCompanyName] = useState("");
  const [eventTypes, setEventTypes] = useState("");
  // Venue-specific
  const [venueName, setVenueName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [amenities, setAmenities] = useState("");
  // Production-specific
  const [productionType, setProductionType] = useState("");
  const [crewSize, setCrewSize] = useState("");
  // Photo/Video-specific
  const [specialty, setSpecialty] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      setAvatarUrl(publicUrl);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
        const baseUpdate: Record<string, any> = {
        display_name: displayName || null,
        bio, city, state, country: country || null,
        profile_complete: true,
        avatar_url: avatarUrl || null, timezone,
      };

      if (role === "artist") {
        baseUpdate.genre = genre;
        baseUpdate.website = website || null;
        baseUpdate.instagram = instagram || null;
        baseUpdate.spotify = spotify || null;
        baseUpdate.youtube = youtubeUrl || null;
        baseUpdate.rate_min = rateMin ? parseFloat(rateMin) : null;
      }

      if (role === "promoter") {
        if (companyName.trim()) baseUpdate.display_name = companyName.trim();
        // Reuse genre field to store event types for promoters
        if (eventTypes.trim()) baseUpdate.genre = eventTypes.trim();
      }

      if (role === "production") {
        // Reuse genre field to store production type
        if (productionType.trim()) baseUpdate.genre = productionType.trim();
        baseUpdate.rate_min = rateMin ? parseFloat(rateMin) : null;
      }

      if (role === "photo_video") {
        // Reuse genre field to store specialty
        if (specialty.trim()) baseUpdate.genre = specialty.trim();
        // Reuse website field to store portfolio URL
        if (portfolioUrl.trim()) baseUpdate.website = portfolioUrl.trim();
        baseUpdate.rate_min = rateMin ? parseFloat(rateMin) : null;
      }

      if (role === "venue" && venueName.trim()) {
        baseUpdate.display_name = venueName.trim();
      }

      const { error } = await supabase
        .from("profiles")
        .update(baseUpdate as any)
        .eq("user_id", user.id);
      if (error) throw error;

      if (role === "venue" && venueName.trim()) {
        const { error: venueError } = await supabase
          .from("venue_listings")
          .upsert(
            {
              name: venueName.trim(),
              city: city || null,
              state: state || null,
              capacity: capacity ? parseInt(capacity) : null,
              amenities: amenities ? amenities.split(",").map((a) => a.trim()).filter(Boolean) : null,
              description: bio || null,
              claimed_by: user.id,
              claim_status: "approved",
            } as any,
            { onConflict: "claimed_by" }
          );
        if (venueError) {
          toast.error("Could not save venue profile — please try again.");
        }
      }
      await refreshProfile();
      toast.success("Profile saved!");

      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = (profile?.display_name ?? "?")[0].toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <SEO title="Set Up Your Profile | GetBooked.Live" description="Complete your GetBooked.Live profile to start receiving or sending booking offers." />
      <div className="w-full max-w-lg">
        <Breadcrumbs items={[
          { label: "Home", to: "/" },
          { label: "Profile Setup" },
        ]} />
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.accent.replace("text-", "bg-")}/10`}>
            <RoleIcon className={`w-5 h-5 ${meta.accent}`} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{meta.stepLabel}</h1>
            <p className="text-muted-foreground text-sm">Tell us a bit about yourself to get started.</p>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 mt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* FIX 5: Avatar upload — 120px circular with camera overlay and motivational text */}
            <div className="flex flex-col items-center mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative rounded-full bg-secondary border-2 border-border hover:border-primary/30 transition-colors overflow-hidden group active:scale-[0.97] flex items-center justify-center"
                style={{ width: 120, height: 120 }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="font-display font-bold text-3xl text-foreground">{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-white" />
                      <span className="text-[10px] text-white font-body">Upload photo</span>
                    </>
                  )}
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <p className="text-[11px] text-muted-foreground mt-2 font-body text-center">
                {avatarUrl ? "Photo uploaded ✓" : "Profiles with photos get 3× more engagement"}
              </p>
            </div>

            {/* Display Name */}
            <div>
              <Label className="text-sm">{role === "artist" ? "Artist / Stage name" : role === "venue" ? "Venue name" : "Display name"}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={
                role === "artist" ? "Your artist or stage name" :
                role === "venue" ? "The Ryman, House of Blues..." :
                "Your name or brand"
              } className="mt-1.5 bg-background border-border" />
            </div>

            {/* Bio */}
            <div>
              <Label className="text-sm">Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={
                role === "artist" ? "Tell promoters about your sound, style, and live show energy..." :
                role === "promoter" ? "Describe your events, markets, and what artists can expect..." :
                role === "venue" ? "Describe your space, vibe, and what makes it special..." :
                role === "production" ? "Share your experience, gear, and specialties..." :
                "Tell people about your style, equipment, and past work..."
              } className="mt-1.5 bg-background border-border" rows={3} />
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Nashville" className="mt-1.5 bg-background border-border" />
              </div>
              <div>
                <Label className="text-sm">State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="TN" className="mt-1.5 bg-background border-border" />
              </div>
              <div>
                <Label className="text-sm">Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" className="mt-1.5 bg-background border-border" />
              </div>
            </div>

            {/* ── ARTIST-SPECIFIC ── */}
            {role === "artist" && (
              <>
                <div>
                  <Label className="text-sm">Genre</Label>
                  <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Rock, Hip-Hop, Country..." className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Your booking fee (starting from $)</Label>
                  <Input type="number" value={rateMin} onChange={(e) => setRateMin(e.target.value)} placeholder="500" className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Website</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#E1306C]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                  </Label>
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourhandle" className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-[#FF0000]" />
                    YouTube channel URL
                  </Label>
                  <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@yourchannel" className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-[#1DB954]" />
                    Spotify profile URL
                  </Label>
                  <Input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/artist/..." className="mt-1.5 bg-background border-border" />
                </div>
              </>
            )}

            {/* ── PROMOTER-SPECIFIC ── */}
            {role === "promoter" && (
              <>
                <div>
                  <Label className="text-sm">Company / Organization</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Live Nation, independent, etc." className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Event types you book</Label>
                  <Input value={eventTypes} onChange={(e) => setEventTypes(e.target.value)} placeholder="Concerts, festivals, private events..." className="mt-1.5 bg-background border-border" />
                </div>
              </>
            )}

            {/* ── VENUE-SPECIFIC ── */}
            {role === "venue" && (
              <>
                <div>
                  <Label className="text-sm">Venue name</Label>
                  <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="The Ryman, House of Blues..." className="mt-1.5 bg-background border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Capacity</Label>
                    <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="500" className="mt-1.5 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-sm">Amenities</Label>
                    <Input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Green room, PA, lighting..." className="mt-1.5 bg-background border-border" />
                  </div>
                </div>
              </>
            )}

            {/* ── PRODUCTION-SPECIFIC ── */}
            {role === "production" && (
              <>
                <div>
                  <Label className="text-sm">Production type</Label>
                  <Input value={productionType} onChange={(e) => setProductionType(e.target.value)} placeholder="Sound engineer, lighting, stage manager..." className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Crew size</Label>
                  <Input value={crewSize} onChange={(e) => setCrewSize(e.target.value)} placeholder="Solo, 2-3, full crew..." className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Day rate (starting from $)</Label>
                  <Input type="number" value={rateMin} onChange={(e) => setRateMin(e.target.value)} placeholder="300" className="mt-1.5 bg-background border-border" />
                </div>
              </>
            )}

            {/* ── PHOTO/VIDEO-SPECIFIC ── */}
            {role === "photo_video" && (
              <>
                <div>
                  <Label className="text-sm">Specialty</Label>
                  <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Concert photography, music videos, live stream..." className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Portfolio URL</Label>
                  <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" className="mt-1.5 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-sm">Day rate (starting from $)</Label>
                  <Input type="number" value={rateMin} onChange={(e) => setRateMin(e.target.value)} placeholder="200" className="mt-1.5 bg-background border-border" />
                </div>
              </>
            )}

            {/* Timezone */}
            <div>
              <Label className="text-sm">Timezone</Label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Berlin", "America/Sao_Paulo", "Asia/Tokyo", "Australia/Sydney"].map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11 active:scale-[0.97] transition-transform">
              {loading ? "Saving..." : "Save & continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
