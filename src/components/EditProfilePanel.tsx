import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Save, CheckCircle, Trash2, Music, ExternalLink, ImageIcon, Bell } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

const SOCIAL_LINKS = [
  { key: "instagram", label: "Instagram", placeholder: "@handle", icon: "📸" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/...", icon: "🔵" },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/...", icon: "✖️" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@...", icon: "🧵" },
  { key: "website", label: "Website", placeholder: "https://...", icon: "🌐" },
] as const;

const MUSIC_LINKS = [
  { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/...", icon: "🟢" },
  { key: "apple_music", label: "Apple Music", placeholder: "https://music.apple.com/artist/...", icon: "🍎" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/...", icon: "🟠" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@...", icon: "🔴" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@...", icon: "🎵" },
  { key: "bandcamp", label: "Bandcamp", placeholder: "https://yourname.bandcamp.com", icon: "🔵" },
  { key: "beatport", label: "Beatport", placeholder: "https://beatport.com/artist/...", icon: "💚" },
  { key: "bandsintown", label: "Bandsintown", placeholder: "https://bandsintown.com/...", icon: "🎤" },
  { key: "songkick", label: "Songkick", placeholder: "https://songkick.com/artists/...", icon: "🎪" },
] as const;

type SocialKey = typeof SOCIAL_LINKS[number]["key"];
type MusicLinkKey = typeof MUSIC_LINKS[number]["key"];

export default function EditProfilePanel() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [genre, setGenre] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [emailPrefs, setEmailPrefs] = useState({
    offer_received: true,
    offer_accepted: true,
    offer_declined: true,
    booking_confirmed: true,
    new_message: false,
  });

  const [socialLinks, setSocialLinks] = useState<Record<SocialKey, string>>(
    Object.fromEntries(SOCIAL_LINKS.map(l => [l.key, ""])) as Record<SocialKey, string>
  );
  const [musicLinks, setMusicLinks] = useState<Record<MusicLinkKey, string>>(
    Object.fromEntries(MUSIC_LINKS.map(l => [l.key, ""])) as Record<MusicLinkKey, string>
  );

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setState(profile.state ?? "");
    setGenre(profile.genre ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setRateMin(profile.rate_min?.toString() ?? "");
    setRateMax(profile.rate_max?.toString() ?? "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("website, instagram, facebook, twitter, threads, spotify, apple_music, soundcloud, youtube, tiktok, bandcamp, beatport, bandsintown, songkick, banner_url, email_preferences")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setBannerUrl(d.banner_url ?? "");
          if (d.email_preferences) {
            setEmailPrefs(prev => ({ ...prev, ...(d.email_preferences as any) }));
          }
          setSocialLinks({
            instagram: d.instagram ?? "",
            facebook: d.facebook ?? "",
            twitter: d.twitter ?? "",
            threads: d.threads ?? "",
            website: d.website ?? "",
          });
          setMusicLinks({
            spotify: d.spotify ?? "",
            apple_music: d.apple_music ?? "",
            soundcloud: d.soundcloud ?? "",
            youtube: d.youtube ?? "",
            tiktok: d.tiktok ?? "",
            bandcamp: d.bandcamp ?? "",
            beatport: d.beatport ?? "",
            bandsintown: d.bandsintown ?? "",
            songkick: d.songkick ?? "",
          });
        }
      });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    setUploading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBanner(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/banner.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploadingBanner(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setBannerUrl(urlData.publicUrl + "?t=" + Date.now());
    setUploadingBanner(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, any> = {
      display_name: displayName || null,
      bio: bio || null,
      city: city || null,
      state: state || null,
      genre: genre || null,
      avatar_url: avatarUrl || null,
      banner_url: bannerUrl || null,
      rate_min: rateMin ? parseFloat(rateMin) : null,
      rate_max: rateMax ? parseFloat(rateMax) : null,
      ...Object.fromEntries(SOCIAL_LINKS.map(l => [l.key, socialLinks[l.key] || null])),
      ...Object.fromEntries(MUSIC_LINKS.map(l => [l.key, musicLinks[l.key] || null])),
      email_preferences: emailPrefs,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) { toast.error(error.message); } else {
      toast.success("Profile updated!");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await signOut();
      toast.success("Your account has been deleted.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const role = profile?.role;
  const showMusicLinks = role === "artist" || role === "production" || role === "photo_video";

  return (
    <div className="space-y-5">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">edit profile</h2>

      {/* Banner */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] overflow-hidden">
        <button
          onClick={() => bannerInputRef.current?.click()}
          className="relative w-full h-32 bg-white/[0.02] flex items-center justify-center hover:bg-white/[0.04] transition-colors group"
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="w-5 h-5" />
              <span className="text-[10px]">upload banner image</span>
            </div>
          )}
          {uploadingBanner && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
          {bannerUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">change banner</span>
            </div>
          )}
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />

        {/* Avatar overlapping banner */}
        <div className="px-4 pb-4 -mt-10">
          <div className="flex items-end gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-xl bg-[#0e1420] border-2 border-[#0e1420] overflow-hidden flex items-center justify-center hover:border-white/[0.12] transition-colors active:scale-[0.97] shrink-0 ring-2 ring-[#0e1420]"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Camera className="w-5 h-5 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                </div>
              )}
            </button>
            <div className="pb-1">
              <p className="text-sm font-medium">{displayName || "Your name"}</p>
              <p className="text-[11px] text-muted-foreground">{role ?? "member"}</p>
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
      </div>

      {/* Basic info */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-3">
        <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">basic info</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">city</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">state</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
          </div>
          {(role === "artist" || role === "production" || role === "photo_video") && (
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">genre / specialty</Label>
              <Input value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
            </div>
          )}
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 text-xs bg-[#080C14] border-white/[0.06] min-h-[60px]" maxLength={500} />
        </div>
      </div>

      {/* Links & socials */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest">links & socials</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SOCIAL_LINKS.map((link) => (
            <div key={link.key}>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span>{link.icon}</span> {link.label}
              </Label>
              <Input
                value={socialLinks[link.key]}
                onChange={(e) => setSocialLinks(prev => ({ ...prev, [link.key]: e.target.value }))}
                placeholder={link.placeholder}
                className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Music & streaming links */}
      {showMusicLinks && (
        <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest">music & streaming</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {MUSIC_LINKS.map((link) => (
              <div key={link.key}>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>{link.icon}</span> {link.label}
                </Label>
                <Input
                  value={musicLinks[link.key]}
                  onChange={(e) => setMusicLinks(prev => ({ ...prev, [link.key]: e.target.value }))}
                  placeholder={link.placeholder}
                  className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate range */}
      {(role === "artist" || role === "production" || role === "photo_video") && (
        <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-3">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">rate range</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">minimum ($)</Label>
              <Input type="number" value={rateMin} onChange={(e) => setRateMin(e.target.value)} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">maximum ($)</Label>
              <Input type="number" value={rateMax} onChange={(e) => setRateMax(e.target.value)} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full h-9 text-[11px] lowercase active:scale-[0.97] bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90">
        {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : saved ? <CheckCircle className="w-3 h-3 mr-1" /> : <Save className="w-3 h-3 mr-1" />}
        {saving ? "saving..." : saved ? "saved!" : "save changes"}
      </Button>

      {/* Email Preferences */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-[#C8FF3E]" />
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">email notifications</h3>
        </div>
        {[
          { key: "offer_received" as const, label: "Email me when I receive an offer", desc: "Get notified immediately about new booking offers" },
          { key: "offer_accepted" as const, label: "Email me when an offer is accepted", desc: "Know right away when an artist accepts your offer" },
          { key: "offer_declined" as const, label: "Email me when an offer is declined", desc: "Stay informed about offer status changes" },
          { key: "booking_confirmed" as const, label: "Email me when a booking is confirmed", desc: "Get booking confirmation details" },
          { key: "new_message" as const, label: "Email me for new messages", desc: "Digest mode — off by default to reduce noise" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between gap-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#F0F2F7]">{item.label}</p>
              <p className="text-[10px] text-[#5A6478] mt-0.5">{item.desc}</p>
            </div>
            <Switch
              checked={emailPrefs[item.key]}
              onCheckedChange={(checked) =>
                setEmailPrefs(prev => ({ ...prev, [item.key]: checked }))
              }
              className="data-[state=checked]:bg-[#C8FF3E] shrink-0"
            />
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-4 space-y-3 mt-8">
        <h3 className="text-[10px] text-red-400 uppercase tracking-widest font-medium">danger zone</h3>
        <p className="text-[11px] text-muted-foreground">permanently delete your account and all associated data. this action cannot be undone.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-[11px] lowercase border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 active:scale-[0.97]">
              <Trash2 className="w-3 h-3 mr-1" />
              delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#0e1420] border-white/[0.06]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-syne text-red-400">delete account?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-xs">
                this will permanently remove your profile, bookings, offers, and all associated data. you will be signed out immediately. this cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">type DELETE to confirm</Label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06] font-mono"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirm("")} className="h-8 text-[11px] lowercase bg-transparent border-white/[0.06] hover:bg-white/[0.04]">cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="h-8 text-[11px] lowercase bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                {deleting ? "deleting..." : "yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
