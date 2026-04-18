import { useEffect, useState } from "react";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useParams, Link } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Globe, ExternalLink, Share2, CalendarDays, Check, X, Send,
  Users, Star, Heart, Clock, Music, Headphones, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import ShowNightMode from "@/components/ShowNightMode";
import TranslateButton from "@/components/TranslateButton";
import ReelDisplay from "@/components/ReelDisplay";
import TopTracksSection from "@/components/TopTracksSection";
import DemandMap from "@/components/DemandMap";
import { Download } from "lucide-react";
import SEO from "@/components/SEO";

// ─── Types ───
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
  booking_venue?: string | null;
};

type ProfileData = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  genre: string | null;
  role: string | null;
  website: string | null;
  instagram: string | null;
  spotify: string | null;
  apple_music: string | null;
  soundcloud: string | null;
  youtube: string | null;
  tiktok: string | null;
  bandcamp: string | null;
  beatport: string | null;
  bandsintown: string | null;
  songkick: string | null;
  facebook: string | null;
  twitter: string | null;
  threads: string | null;
  is_verified: boolean | null;
  slug: string | null;
  rate_min: number | null;
  rate_max: number | null;
  created_at: string | null;
  streaming_stats: {
    monthly_listeners?: number;
    followers?: number;
    top_city?: string;
    top_track?: string;
    top_tracks?: { name: string; album: string; album_art: string; popularity: number; spotify_url: string; uri: string }[];
    top_cities?: { city: string; listeners: number }[];
    source?: string;
  } | null;
  pitch_card_url: string | null;
};

type AvailDate = { date: string; is_available: boolean };
type PastShow = { id: string; venue_name: string; event_date: string; city?: string };
type SimilarArtist = { user_id: string; display_name: string | null; avatar_url: string | null; genre: string | null; city: string | null; slug: string | null };

const SITE_URL = "https://getbooked.live";
const SITE_NAME = "GetBooked.Live";

const roleColorMap: Record<string, string> = {
  artist: "bg-role-artist/10 text-role-artist border-role-artist/20",
  promoter: "bg-role-promoter/10 text-role-promoter border-role-promoter/20",
  venue: "bg-role-venue/10 text-role-venue border-role-venue/20",
  production: "bg-role-production/10 text-role-production border-role-production/20",
  photo_video: "bg-role-photo/10 text-role-photo border-role-photo/20",
};

// ─── Social link helper ───
function SocialPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
    >
      <SEO title="Artist Profile | GetBooked.Live" description="View this artist's profile, music, and booking availability on GetBooked.Live." />
      {label}
    </a>
  );
}

// ─── Component ───
export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [availability, setAvailability] = useState<AvailDate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [pastShows, setPastShows] = useState<PastShow[]>([]);
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [saved, setSaved] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [acceptanceRate, setAcceptanceRate] = useState<number | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      // 1. Fetch profile
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const p = data as unknown as ProfileData;
      setProfile(p);

      const uid = p.user_id;
      if (!uid) { setLoading(false); return; }

      // Member since
      if (p.created_at) {
        setMemberSince(new Date(p.created_at).getFullYear().toString());
      }

      // Parallel fetches
      const today = format(startOfToday(), "yyyy-MM-dd");

      // 2. Availability (artists)
      const availPromise = p.role === "artist"
        ? supabase
            .from("artist_availability")
            .select("date, is_available")
            .eq("artist_id", uid)
            .gte("date", today)
            .eq("is_available", true)
            .order("date")
            .limit(8)
        : null;

      // 3. Booking count
      const bookingCountPromise = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", uid)
        .eq("status", "confirmed");

      // Acceptance rate
      const offersPromise = supabase
        .from("offers")
        .select("status")
        .eq("recipient_id", uid);

      // 4. Past shows
      const pastShowsPromise = supabase
        .from("bookings")
        .select("id, venue_name, event_date")
        .eq("artist_id", uid)
        .eq("status", "confirmed")
        .lt("event_date", today)
        .order("event_date", { ascending: false })
        .limit(6);

      // 5. Reviews
      const reviewsPromise = supabase
        .from("reviews" as any)
        .select("id, rating, comment, created_at, reviewer_id, booking_id")
        .eq("reviewee_id", uid)
        .order("created_at", { ascending: false })
        .limit(5);

      // 6. Similar artists
      const firstGenre = p.role === "artist" && p.genre ? p.genre.split(",")[0]?.trim() : null;
      const similarPromise = firstGenre
        ? supabase
            .from("public_profiles" as any)
            .select("user_id, display_name, avatar_url, genre, city, slug")
            .eq("role", "artist")
            .ilike("genre", `%${firstGenre}%`)
            .neq("user_id", uid)
            .limit(3)
        : null;

      const [availRes, bookingCountRes, offersRes, pastShowsRes, reviewsRes, similarRes] = await Promise.all([
        availPromise,
        bookingCountPromise,
        offersPromise,
        pastShowsPromise,
        reviewsPromise,
        similarPromise,
      ]);

      if (availRes?.data) setAvailability(availRes.data as AvailDate[]);
      setBookingCount(bookingCountRes.count ?? 0);

      if (offersRes.data && offersRes.data.length > 0) {
        const accepted = offersRes.data.filter((o: any) => o.status === "accepted").length;
        setAcceptanceRate(Math.round((accepted / offersRes.data.length) * 100));
      }

      setPastShows((pastShowsRes.data as PastShow[]) ?? []);

      if (reviewsRes.data && (reviewsRes.data as any[]).length > 0) {
        const rd = reviewsRes.data as any[];
        const reviewerIds = [...new Set(rd.map((r: any) => r.reviewer_id))];
        const bookingIds = [...new Set(rd.map((r: any) => r.booking_id).filter(Boolean))];
        const [profilesRes2, bookingsRes2] = await Promise.all([
          supabase.from("public_profiles" as any).select("user_id, display_name, avatar_url").in("user_id", reviewerIds),
          bookingIds.length > 0 ? supabase.from("bookings").select("id, venue_name").in("id", bookingIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const profileMap = new Map((profilesRes2.data as any[] || []).map((pp: any) => [pp.user_id, pp]));
        const bookingMap = new Map((bookingsRes2.data as any[] || []).map((b: any) => [b.id, b]));
        setReviews(rd.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: profileMap.get(r.reviewer_id)?.display_name || "Anonymous",
          reviewer_avatar: profileMap.get(r.reviewer_id)?.avatar_url || null,
          booking_venue: bookingMap.get(r.booking_id)?.venue_name || null,
        })));
      }

      if (similarRes?.data) setSimilarArtists((similarRes.data as unknown as SimilarArtist[]) ?? []);

      
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleShare = () => {
    const url = `${SITE_URL}/p/${profile?.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied!");
  };

  // ─── Computed values ───
  const name = profile?.display_name ?? "Artist";
  const locationParts = [profile?.city, profile?.state].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;
  const pageTitle = `${name} — ${profile?.genre ?? "Artist"} | ${SITE_NAME}`;
  const pageDescription = [
    `Book ${name}`,
    profile?.genre ? `(${profile.genre})` : null,
    location ? `based in ${location}` : null,
    "on GetBooked.Live — the music booking marketplace.",
  ].filter(Boolean).join(" ");
  const canonicalUrl = `${SITE_URL}/p/${profile?.slug ?? slug}`;
  const ogImage = profile?.avatar_url ?? `${SITE_URL}/og-default.png`;
  const genres = profile?.genre?.split(",").map((g) => g.trim()).filter(Boolean) ?? [];
  const isOwnProfile = user?.id === profile?.user_id;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const bookScore = avgRating ? Math.round(parseFloat(avgRating) * 20) : null;
  const bioText = profile?.bio ?? "";
  const bioTruncated = bioText.length > 200 && !bioExpanded;

  // Social links array
  const socialLinks = [
    profile?.website && { href: profile.website, label: "Website" },
    profile?.instagram && { href: `https://instagram.com/${profile.instagram.replace("@", "")}`, label: "Instagram" },
    profile?.spotify && { href: profile.spotify, label: "Spotify" },
    profile?.apple_music && { href: profile.apple_music, label: "Apple Music" },
    profile?.soundcloud && { href: profile.soundcloud, label: "SoundCloud" },
    profile?.youtube && { href: profile.youtube, label: "YouTube" },
    profile?.tiktok && { href: profile.tiktok.startsWith("http") ? profile.tiktok : `https://tiktok.com/@${profile.tiktok.replace("@", "")}`, label: "TikTok" },
    profile?.bandcamp && { href: profile.bandcamp, label: "Bandcamp" },
    profile?.beatport && { href: profile.beatport, label: "Beatport" },
    profile?.bandsintown && { href: profile.bandsintown, label: "Bandsintown" },
    profile?.songkick && { href: profile.songkick, label: "Songkick" },
    profile?.facebook && { href: profile.facebook, label: "Facebook" },
    profile?.twitter && { href: profile.twitter, label: "X" },
    profile?.threads && { href: profile.threads, label: "Threads" },
  ].filter(Boolean) as { href: string; label: string }[];

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <SkeletonCard height="h-48" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} height="h-16" />)}
          </div>
          <SkeletonCard height="h-24" />
          <SkeletonCard height="h-32" />
          <SkeletonCard height="h-20" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <Helmet><title>Profile Not Found | {SITE_NAME}</title></Helmet>
        <h1 className="font-syne text-2xl font-bold mb-2">Profile not found</h1>
        <p className="text-muted-foreground">This profile doesn't exist or the link is broken.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicGroup",
            name: name,
            description: profile?.bio ?? "",
            genre: genres.length > 0 ? genres : undefined,
            url: canonicalUrl,
            image: profile?.avatar_url ?? undefined,
            location: location ? { "@type": "Place", name: location } : undefined,
          })}
        </script>
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <BackButton fallback="/directory" />

        {/* ════════════ HERO SECTION ════════════ */}
        <div className="rounded-2xl bg-[#0E1420] border border-white/[0.06] p-5 sm:p-7 mb-4">
          {/* Banner */}
          {profile?.banner_url && (
            <div className="w-full h-36 sm:h-48 rounded-xl overflow-hidden -mt-1 mb-5">
              <img src={profile.banner_url} alt={`${name} banner`} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${name} profile photo`}
                  loading="lazy"
                  width={120}
                  height={120}
                  className={cn(
                    "w-[120px] h-[120px] rounded-full object-cover border-2 border-white/[0.08]",
                    profile.banner_url && "-mt-16 ring-4 ring-[#0E1420]"
                  )}
                />
              ) : (
                <div className={cn(
                  "w-[120px] h-[120px] rounded-full bg-[#141B28] border border-white/[0.06] flex items-center justify-center text-4xl font-syne font-bold text-muted-foreground",
                  profile?.banner_url && "-mt-16 ring-4 ring-[#0E1420]"
                )}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-syne text-2xl sm:text-3xl font-bold leading-tight">{name}</h1>
                {profile?.is_verified && (
                  <Badge className="bg-[#3EFFBE]/10 text-[#3EFFBE] border-[#3EFFBE]/20 text-[10px] px-2 py-0.5">
                    ✓ Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {profile?.role && (
                  <Badge variant="outline" className={cn("text-[10px] capitalize", roleColorMap[profile.role] ?? "")}>
                    {profile.role.replace("_", "/")}
                  </Badge>
                )}
                {location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {location}
                  </span>
                )}
                {bookScore && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-[#C8FF3E]/10 text-[#C8FF3E] border border-[#C8FF3E]/20">
                    <Star className="w-3 h-3 fill-current" /> {bookScore}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-[#5A6478]">
                  <Clock className="w-3 h-3" /> Responds in ~4hrs
                </span>
              </div>

              {/* Social links (compact on mobile) */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {socialLinks.slice(0, 6).map((l) => (
                    <SocialPill key={l.label} href={l.href} label={l.label} />
                  ))}
                  {socialLinks.length > 6 && (
                    <span className="text-[10px] text-muted-foreground self-center">+{socialLinks.length - 6} more</span>
                  )}
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/[0.06] text-muted-foreground hover:text-foreground transition-colors active:scale-[0.97]"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                </div>
              )}
            </div>

            {/* CTA Column */}
            {!isOwnProfile && profile?.role === "artist" && (
              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                <Button asChild className="flex-1 sm:flex-initial bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 font-semibold h-11 px-6 text-sm active:scale-[0.97]">
                  <Link to={`/offer?artist=${profile?.user_id}`}>
                    <Send className="w-4 h-4 mr-2" /> Send Offer
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-11 w-11 border-white/[0.06] active:scale-[0.97]",
                    saved && "text-red-400 border-red-400/20"
                  )}
                  onClick={() => { setSaved(!saved); toast.success(saved ? "Removed from saved" : "Saved!"); }}
                >
                  <Heart className={cn("w-4 h-4", saved && "fill-current")} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ════════════ STATS ROW ════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: "bookings", value: bookingCount.toString(), color: "#C8FF3E" },
            { label: "acceptance", value: acceptanceRate != null ? `${acceptanceRate}%` : "—", color: "#3EFFBE" },
            { label: "avg response", value: "~4hrs", color: "#3EC8FF" },
            { label: "member since", value: memberSince ?? "—", color: "#FFB83E" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-[#0E1420] border border-white/[0.06] px-4 py-3 text-center">
              <p className="font-syne text-lg font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] text-[#5A6478] uppercase tracking-widest mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ════════════ FEE SECTION ════════════ */}
        {profile?.role === "artist" && ((profile as any)?.rate_min > 0 || (profile as any)?.rate_max > 0) && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Booking Fee</h2>
            <p className="font-syne text-xl font-bold text-[#C8FF3E]">
              ${((profile as any).rate_min ?? 0).toLocaleString()} – ${((profile as any).rate_max ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-[#5A6478] mt-1">Price varies by event type and location.</p>
          </div>
        )}

        {/* ════════════ GENRES ════════════ */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {genres.map((g) => (
              <span key={g} className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#C8FF3E]/10 text-[#C8FF3E] border border-[#C8FF3E]/20">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* ════════════ BIO ════════════ */}
        {bioText && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h2>
            <p className="text-sm text-foreground leading-relaxed" style={{ textWrap: "pretty" }}>
              {bioTruncated ? bioText.slice(0, 200) + "…" : bioText}
            </p>
            {bioText.length > 200 && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="flex items-center gap-1 mt-2 text-xs text-[#C8FF3E] hover:text-[#C8FF3E]/80 transition-colors"
              >
                {bioExpanded ? (
                  <><ChevronUp className="w-3 h-3" /> Read less</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> Read more</>
                )}
              </button>
            )}
            <TranslateButton text={bioText} className="mt-2" />
          </div>
        )}

        {/* ════════════ STREAMING STATS ════════════ */}
        {profile?.streaming_stats && (profile.streaming_stats.monthly_listeners || profile.streaming_stats.top_track) && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-4 h-4 text-[#1DB954]" />
              <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Streaming</h2>
              {profile.streaming_stats.source === "spotify_api" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[#1DB954]/20 text-[#1DB954] ml-auto">
                  ✓ Spotify verified
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.streaming_stats.monthly_listeners && (
                <div>
                  <p className="font-syne text-lg font-bold text-[#1DB954] tabular-nums">
                    {profile.streaming_stats.monthly_listeners >= 1_000_000
                      ? `${(profile.streaming_stats.monthly_listeners / 1_000_000).toFixed(1)}M`
                      : profile.streaming_stats.monthly_listeners >= 1_000
                      ? `${Math.round(profile.streaming_stats.monthly_listeners / 1_000)}K`
                      : profile.streaming_stats.monthly_listeners}
                  </p>
                  <p className="text-[10px] text-[#5A6478] uppercase tracking-widest">monthly listeners</p>
                </div>
              )}
              {profile.streaming_stats.top_city && (
                <div>
                  <p className="text-sm font-medium text-foreground">{profile.streaming_stats.top_city}</p>
                  <p className="text-[10px] text-[#5A6478] uppercase tracking-widest">top city</p>
                </div>
              )}
              {profile.streaming_stats.top_track && (
                <div>
                  <p className="text-sm font-medium text-foreground truncate">{profile.streaming_stats.top_track}</p>
                  <p className="text-[10px] text-[#5A6478] uppercase tracking-widest">#1 track</p>
                </div>
              )}
            </div>
            {profile.spotify && (
              <a
                href={profile.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 transition-colors"
              >
                <Music className="w-3.5 h-3.5" /> Listen on Spotify
              </a>
            )}
          </div>
        )}

        {/* Reel */}
        {profile?.role === "artist" && profile?.user_id && (
          <ReelDisplay userId={profile.user_id} />
        )}

        {/* Top Tracks */}
        {profile?.role === "artist" && (
          <TopTracksSection
            tracks={(profile.streaming_stats as any)?.top_tracks ?? []}
            spotifyUrl={profile.spotify}
          />
        )}

        {/* Demand Map */}
        {profile?.role === "artist" && (profile.streaming_stats as any)?.top_cities && (
          <DemandMap cities={(profile.streaming_stats as any).top_cities} />
        )}

        {/* EPK */}
        {profile?.role === "artist" && (profile as any)?.pitch_card_url && (
          <div className="mb-4">
            <a href={(profile as any).pitch_card_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 text-xs border-white/[0.06] hover:bg-white/5 active:scale-[0.97]">
                <Download className="w-3 h-3 mr-1.5" /> Download EPK
              </Button>
            </a>
          </div>
        )}

        {/* Show Night Mode */}
        {profile?.role === "artist" && profile?.user_id && (
          <ShowNightMode artistUserId={profile.user_id} artistName={name} isOwner={isOwnProfile} />
        )}

        {/* ════════════ AVAILABILITY STRIP ════════════ */}
        {profile?.role === "artist" && availability.length > 0 && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-[#C8FF3E]" />
              <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Availability</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {availability.map((a) => {
                const d = new Date(a.date + "T00:00:00");
                return (
                  <div
                    key={a.date}
                    className={cn(
                      "flex-shrink-0 w-14 rounded-lg border text-center py-2 transition-colors",
                      a.is_available
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}
                  >
                    <div className="text-[10px] font-medium uppercase opacity-70">{format(d, "EEE")}</div>
                    <div className="text-sm font-bold">{format(d, "d")}</div>
                    <div className="text-[10px] uppercase opacity-70">{format(d, "MMM")}</div>
                    <div className="mt-0.5">
                      {a.is_available ? <Check className="w-3 h-3 mx-auto" /> : <X className="w-3 h-3 mx-auto" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ PAST SHOWS ════════════ */}
        {pastShows.length > 0 && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past Shows</h2>
              {pastShows.length >= 6 && (
                <span className="text-[11px] text-[#C8FF3E] cursor-pointer hover:underline">View all shows →</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pastShows.map((show) => (
                <div key={show.id} className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#C8FF3E]/10 flex items-center justify-center flex-shrink-0">
                    <Music className="w-4 h-4 text-[#C8FF3E]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{show.venue_name}</p>
                    <p className="text-[11px] text-[#5A6478]">
                      {format(new Date(show.event_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════ REVIEWS ════════════ */}
        {reviews.length > 0 && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reviews</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                <span className="font-semibold text-foreground">{avgRating} ★</span> ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="space-y-4">
              {reviews.map((r) => {
                // Format reviewer name as "First L."
                const parts = (r.reviewer_name ?? "Anonymous").split(" ");
                const displayReviewerName = parts.length > 1
                  ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
                  : parts[0];

                return (
                  <div key={r.id} className="flex gap-3">
                    {r.reviewer_avatar ? (
                      <img src={r.reviewer_avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" loading="lazy" width={36} height={36} />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#141B28] flex items-center justify-center text-xs font-syne font-bold text-muted-foreground flex-shrink-0">
                        {(r.reviewer_name ?? "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium">{displayReviewerName}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-3 h-3",
                                i < r.rating ? "text-primary fill-primary" : "text-white/10"
                              )}
                            />
                          ))}
                        </div>
                        <Badge className="bg-[#3EFFBE]/10 text-[#3EFFBE] border-[#3EFFBE]/20 text-[9px] px-1.5 py-0">
                          ✓ Verified booking
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {r.booking_venue && (
                          <span className="text-[10px] text-muted-foreground">at {r.booking_venue}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                          {format(new Date(r.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ SIMILAR ARTISTS ════════════ */}
        {similarArtists.length > 0 && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Similar Artists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {similarArtists.map((a) => (
                <Link
                  key={a.user_id}
                  to={`/p/${a.slug}`}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:bg-white/[0.04] transition-colors"
                >
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" width={40} height={40} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#141B28] flex items-center justify-center text-sm font-syne font-bold text-muted-foreground flex-shrink-0">
                      {(a.display_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.display_name}</p>
                    <p className="text-[11px] text-[#5A6478] truncate">
                      {[a.genre?.split(",")[0], a.city].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ════════════ FOOTER CTA ════════════ */}
        {!isOwnProfile && profile?.role === "artist" && (
          <div className="text-center py-8">
            <p className="text-sm text-[#5A6478] mb-3">Ready to book {name}?</p>
            <Button asChild className="bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 font-semibold h-12 px-10 text-base active:scale-[0.97] transition-transform">
              <Link to={`/offer?artist=${profile?.user_id}`}>
                <Send className="w-4 h-4 mr-2" /> Send Booking Offer
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
