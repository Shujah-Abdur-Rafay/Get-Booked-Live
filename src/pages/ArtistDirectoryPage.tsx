import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonCard } from "@/components/SkeletonCard";
import BackButton from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Music, Star, Send, Instagram, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";

// ─── Types ───
type DirectoryArtist = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
  city: string | null;
  state: string | null;
  tier: string | null;
  bookscore: number | null;
  fee_min: number | null;
  fee_max: number | null;
  instagram: string | null;
  spotify: string | null;
  tiktok: string | null;
  website: string | null;
  is_claimed: boolean | null;
  listing_type: string | null;
};

const SITE_URL = "https://getbooked.live";
const SITE_NAME = "GetBooked.Live";

const TIER_COLORS: Record<string, string> = {
  headliner: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  national: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  regional: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  independent: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  emerging: "text-lime-400 bg-lime-400/10 border-lime-400/20",
};

// ─── Social pill ───
function SocialPill({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
    >
      <SEO title="Artist Directory | GetBooked.Live" description="Browse and discover artists available for booking on GetBooked.Live." />
      {icon}
      {label}
    </a>
  );
}

// ─── Component ───
export default function ArtistDirectoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<DirectoryArtist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);

      // Use the RPC function which bypasses PostgREST schema cache issues
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "get_artist_by_slug",
        { p_slug: slug }
      );

      if (!rpcError && rpcData && rpcData.length > 0) {
        setArtist(rpcData[0] as DirectoryArtist);
        setLoading(false);
        return;
      }

      // Fallback: direct table query (works once PostgREST cache is refreshed)
      const { data, error } = await (supabase as any)
        .from("directory_listings")
        .select("id, name, slug, avatar_url, bio, genres, city, state, tier, bookscore, fee_min, fee_max, instagram, spotify, tiktok, website, is_claimed, listing_type")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setArtist(data as DirectoryArtist);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <SkeletonCard height="h-48" />
          <SkeletonCard height="h-24" />
          <SkeletonCard height="h-32" />
        </div>
      </div>
    );
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <Helmet><title>Artist Not Found | {SITE_NAME}</title></Helmet>
        <h1 className="font-syne text-2xl font-bold mb-2">Artist not found</h1>
        <p className="text-muted-foreground">This artist profile doesn't exist or the link is broken.</p>
        <Link to="/browse" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Browse
        </Link>
      </div>
    );
  }

  const name = artist.name;
  const locationParts = [artist.city, artist.state].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;
  const genres = artist.genres ?? [];
  const pageTitle = `${name} — ${genres[0] ?? "Artist"} | ${SITE_NAME}`;
  const pageDescription = [
    `Book ${name}`,
    genres.length > 0 ? `(${genres[0]})` : null,
    location ? `based in ${location}` : null,
    "on GetBooked.Live — the music booking marketplace.",
  ].filter(Boolean).join(" ");
  const canonicalUrl = `${SITE_URL}/artist/${artist.slug}`;
  const ogImage = artist.avatar_url ?? `${SITE_URL}/og-default.png`;

  // Build social links
  const socialLinks = [
    artist.instagram && {
      href: `https://instagram.com/${artist.instagram.replace("@", "")}`,
      label: "Instagram",
      icon: <Instagram className="w-3.5 h-3.5" />,
    },
    artist.spotify && {
      href: artist.spotify.startsWith("http") ? artist.spotify : `https://open.spotify.com/artist/${artist.spotify}`,
      label: "Spotify",
      icon: <Music className="w-3.5 h-3.5" />,
    },
    artist.tiktok && {
      href: artist.tiktok.startsWith("http") ? artist.tiktok : `https://tiktok.com/@${artist.tiktok.replace("@", "")}`,
      label: "TikTok",
      icon: <ExternalLink className="w-3.5 h-3.5" />,
    },
    artist.website && {
      href: artist.website.startsWith("http") ? artist.website : `https://${artist.website}`,
      label: "Website",
      icon: <ExternalLink className="w-3.5 h-3.5" />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

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
            name,
            description: artist.bio ?? "",
            genre: genres.length > 0 ? genres : undefined,
            url: canonicalUrl,
            image: artist.avatar_url ?? undefined,
            location: location ? { "@type": "Place", name: location } : undefined,
            sameAs: [
              artist.instagram ? `https://instagram.com/${artist.instagram.replace("@", "")}` : null,
              artist.spotify ?? null,
              artist.tiktok ? (artist.tiktok.startsWith("http") ? artist.tiktok : `https://tiktok.com/@${artist.tiktok.replace("@", "")}`) : null,
              artist.website ?? null,
            ].filter(Boolean),
          })}
        </script>
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <BackButton fallback="/browse" />

        {/* ════════════ HERO ════════════ */}
        <div className="rounded-2xl bg-[#0E1420] border border-white/[0.06] p-5 sm:p-7 mb-4">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {artist.avatar_url ? (
                <img
                  src={artist.avatar_url}
                  alt={`${name} profile photo`}
                  loading="lazy"
                  width={120}
                  height={120}
                  className="w-[120px] h-[120px] rounded-full object-cover border-2 border-white/[0.08]"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full bg-[#141B28] border border-white/[0.06] flex items-center justify-center text-4xl font-syne font-bold text-muted-foreground">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-syne text-2xl sm:text-3xl font-bold leading-tight">{name}</h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className="text-[10px] capitalize">Artist</Badge>
                {artist.tier && (
                  <Badge variant="outline" className={cn("text-[10px] capitalize", TIER_COLORS[artist.tier] ?? "")}>
                    {artist.tier}
                  </Badge>
                )}
                {location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {location}
                  </span>
                )}
                {artist.bookscore && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-[#C8FF3E]/10 text-[#C8FF3E] border border-[#C8FF3E]/20">
                    <Star className="w-3 h-3 fill-current" /> {artist.bookscore}
                  </span>
                )}
              </div>

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {socialLinks.map((l) => (
                    <SocialPill key={l.label} href={l.href} label={l.label} icon={l.icon} />
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            {!artist.is_claimed && (
              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                <Button asChild className="flex-1 sm:flex-initial bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 font-semibold h-11 px-6 text-sm">
                  <Link to="/auth">
                    <Send className="w-4 h-4 mr-2" /> Claim Profile
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

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
        {artist.bio && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{artist.bio}</p>
          </div>
        )}

        {/* ════════════ FEE ════════════ */}
        {(artist.fee_min || artist.fee_max) && (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-5 mb-4">
            <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Booking Fee</h2>
            <p className="font-syne text-xl font-bold text-[#C8FF3E]">
              {artist.fee_min && artist.fee_max
                ? `$${artist.fee_min.toLocaleString()} – $${artist.fee_max.toLocaleString()}`
                : artist.fee_min
                ? `From $${artist.fee_min.toLocaleString()}`
                : `Up to $${artist.fee_max!.toLocaleString()}`}
            </p>
            <p className="text-xs text-[#5A6478] mt-1">Price varies by event type and location.</p>
          </div>
        )}

        {/* ════════════ CLAIM CTA ════════════ */}
        {!artist.is_claimed && (
          <div className="rounded-xl bg-[#0E1420] border border-primary/20 p-5 mb-4">
            <h2 className="font-syne text-sm font-semibold text-primary mb-1">Is this your profile?</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Claim this profile to manage your bookings, set your availability, and connect with promoters on GetBooked.Live.
            </p>
            <Button asChild size="sm" className="bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 font-semibold">
              <Link to="/auth">Claim This Profile — It's Free</Link>
            </Button>
          </div>
        )}

        {/* ════════════ BACK TO BROWSE ════════════ */}
        <div className="text-center mt-8">
          <Link to="/browse" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Browse All Artists
          </Link>
        </div>
      </div>
    </div>
  );
}
