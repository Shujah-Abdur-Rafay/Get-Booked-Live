import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Music, User, Star, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProfileCard = {
  id: string;
  user_id?: string;
  display_name: string | null;
  avatar_url: string | null;
  genre: string | null;
  city: string | null;
  state: string | null;
  role: string | null;
  slug: string | null;
  is_verified: boolean | null;
  bio: string | null;
  bookscore?: number | null;
  tier?: string | null;
  fee_min?: number | null;
  fee_max?: number | null;
  is_claimed?: boolean;
  source?: "live" | "directory";
  listing_type?: string;
  genres?: string[];
};

const ROLE_FILTERS = [
  { value: "all", label: "All" },
  { value: "artist", label: "Artists" },
  { value: "venue", label: "Venues" },
  { value: "promoter", label: "Promoters" },
  { value: "production", label: "Production" },
  { value: "photo_video", label: "Creatives" },
];

const TIER_COLORS: Record<string, string> = {
  headliner: "text-yellow-400 bg-yellow-400/10",
  national: "text-purple-400 bg-purple-400/10",
  regional: "text-blue-400 bg-blue-400/10",
  independent: "text-teal-400 bg-teal-400/10",
  emerging: "text-lime-400 bg-lime-400/10",
};

export default function BrowsePage() {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  // Track which card is expanded — Unclaimed badge + Claim button only show when expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, [roleFilter]);

  async function fetchProfiles() {
    setLoading(true);

    // Fetch real signed-up profiles
    let liveQuery = supabase
      .from("public_profiles")
      .select("id, user_id, display_name, avatar_url, genre, city, state, role, slug, is_verified, bio")
      .order("display_name", { ascending: true })
      .limit(60);

    if (roleFilter !== "all") {
      liveQuery = liveQuery.eq("role", roleFilter as "artist" | "promoter" | "venue" | "production" | "photo_video");
    }

    const { data: liveData } = await liveQuery;
    const liveProfiles: ProfileCard[] = (liveData || []).map((p: any) => ({
      ...p,
      source: "live" as const,
      is_claimed: true,
    }));

    // For non-artist/venue filters, only show live profiles
    if (roleFilter !== "all" && roleFilter !== "artist" && roleFilter !== "venue") {
      setProfiles(liveProfiles);
      setLoading(false);
      return;
    }

    // Fetch directory listings (unclaimed profiles from spreadsheet data)
    let dirQuery = (supabase
      .from("directory_listings" as any)
      .select("id, name, avatar_url, genres, city, state, listing_type, slug, bio, bookscore, tier, fee_min, fee_max, is_claimed, instagram, spotify, tiktok, website") as any)
      .eq("is_claimed", false)
      .order("bookscore", { ascending: false })
      .limit(200);

    if (roleFilter === "artist") {
      dirQuery = dirQuery.eq("listing_type", "artist");
    } else if (roleFilter === "venue") {
      dirQuery = dirQuery.eq("listing_type", "venue");
    }

    const { data: dirData } = await dirQuery;
    const dirProfiles: ProfileCard[] = (dirData || []).map((p: any) => ({
      id: p.id,
      display_name: p.name,
      avatar_url: p.avatar_url,
      genre: p.genres ? p.genres[0] : null,
      genres: p.genres,
      city: p.city,
      state: p.state,
      role: p.listing_type === "venue" ? "venue" : "artist",
      slug: p.slug,
      is_verified: false,
      bio: p.bio,
      bookscore: p.bookscore,
      tier: p.tier,
      fee_min: p.fee_min,
      fee_max: p.fee_max,
      is_claimed: false,
      source: "directory" as const,
      listing_type: p.listing_type,
    }));

    setProfiles([...liveProfiles, ...dirProfiles]);
    setLoading(false);
  }

  const filtered = profiles.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.genre?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.genres?.some((g) => g.toLowerCase().includes(q))
    );
  });

  async function handleClaim(profile: ProfileCard) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Sign in to claim this profile",
        description: "Create a free account to claim your profile on GetBooked.Live.",
      });
      return;
    }
    setClaimingId(profile.id);
    // Determine which underlying table to update based on listing type
    const table = profile.listing_type === "venue" ? "venue_listings" : "artist_listings";
    const { error } = await supabase
      .from(table)
      .update({ claim_status: "approved", claimed_by: session.user.id })
      .eq("id", profile.id);

    if (error) {
      toast({ title: "Error", description: "Could not claim profile. Please try again.", variant: "destructive" });
    } else {
      toast({
        title: "Profile claimed!",
        description: `You've claimed ${profile.display_name}. Complete your profile in the dashboard.`,
      });
      fetchProfiles();
    }
    setClaimingId(null);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <PageTransition>
      <SEO
        title="Browse Directory | GetBooked.Live"
        description="Discover 700+ artists and venues on GetBooked.Live. Search by genre, city, or role. Claim your profile today."
      />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-syne text-3xl md:text-4xl font-bold text-foreground mb-2">
              Browse Artists & Venues
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Discover {profiles.length > 0 ? `${profiles.length}+` : "hundreds of"} artists and venues across the live music industry. See your name here? Claim your profile.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, genre, or city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-white/[0.06]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {ROLE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRoleFilter(f.value)}
                  className={`flex-1 min-w-[80px] px-3 py-2 rounded-full text-xs font-medium transition-colors min-h-[44px] sm:flex-none sm:min-w-0 ${
                    roleFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground border border-white/[0.06] hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats bar — only show unclaimed count to encourage claiming */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-6 mb-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                {profiles.filter(p => !p.is_claimed).length} unclaimed profiles — is one yours?
              </span>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-card border border-white/[0.06] p-5 animate-pulse">
                  {/* Avatar + name row */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/[0.08] flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2 pt-1">
                      <div className="h-4 bg-white/[0.08] rounded w-3/4" />
                      <div className="h-3 bg-white/[0.05] rounded w-1/2" />
                      <div className="h-3 bg-white/[0.05] rounded w-2/5" />
                    </div>
                  </div>
                  {/* Bio line */}
                  <div className="mt-3 space-y-1.5">
                    <div className="h-3 bg-white/[0.05] rounded w-full" />
                    <div className="h-3 bg-white/[0.05] rounded w-4/5" />
                  </div>
                  {/* Badges row */}
                  <div className="mt-3 flex gap-2">
                    <div className="h-5 bg-white/[0.06] rounded-full w-16" />
                    <div className="h-5 bg-white/[0.06] rounded-full w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const isExpanded = expandedId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl bg-card border transition-colors relative overflow-hidden cursor-pointer ${
                      p.is_claimed
                        ? "border-white/[0.06] hover:border-primary/30"
                        : "border-dashed border-white/[0.10] hover:border-primary/40"
                    }`}
                    onClick={() => toggleExpand(p.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.display_name || "Profile"}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            loading="lazy"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg flex-shrink-0">
                            {(p.display_name || "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-syne font-semibold text-foreground truncate">
                              {p.display_name || "Unnamed"}
                            </h3>
                            {p.is_verified && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">✓</Badge>
                            )}
                          </div>
                          {(p.genre || (p.genres && p.genres.length > 0)) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Music className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{p.genre || p.genres?.[0]}</span>
                            </div>
                          )}
                          {(p.city || p.state) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[p.city, p.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </div>
                        {/* Expand/collapse chevron */}
                        <div className="flex-shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {p.bio && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {p.role === "photo_video" ? "Creative" : p.listing_type || p.role || "Artist"}
                          </Badge>
                          {p.tier && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[p.tier] || "text-muted-foreground bg-muted"}`}>
                              {p.tier}
                            </span>
                          )}
                          {p.bookscore && (
                            <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                              <Star className="w-2.5 h-2.5 fill-yellow-400" />
                              {p.bookscore}
                            </span>
                          )}
                        </div>
                        {p.fee_min && p.fee_max && (
                          <span className="text-[10px] text-muted-foreground">
                            ${p.fee_min.toLocaleString()}–${p.fee_max.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Expanded panel — only visible after clicking the card */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                          {/* Unclaimed badge — only shown here, not on the card face */}
                          {!p.is_claimed && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                Unclaimed
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                This profile hasn't been claimed yet — is this you?
                              </span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-col sm:flex-row gap-2" onClick={(e) => e.stopPropagation()}>
                            {p.is_claimed ? (
                              <Link
                                to={p.slug ? `/p/${p.slug}` : `/p/${p.user_id}`}
                                className="w-full text-center text-xs font-medium py-2.5 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[44px] flex items-center justify-center"
                              >
                                View Profile
                              </Link>
                            ) : (
                              <>
                                {p.slug && (
                                  <Link
                                    to={`/artist/${p.slug}`}
                                    className="w-full text-center text-xs font-medium py-2.5 px-3 rounded-lg bg-white/5 text-foreground hover:bg-white/10 transition-colors min-h-[44px] flex items-center justify-center"
                                  >
                                    View Profile
                                  </Link>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs h-11 border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() => handleClaim(p)}
                                  disabled={claimingId === p.id}
                                >
                                  {claimingId === p.id ? "Claiming…" : "Claim Profile"}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom CTA */}
          {!loading && (
            <div className="mt-12 text-center p-8 rounded-2xl bg-card border border-white/[0.06]">
              <h2 className="font-syne text-xl font-bold text-foreground mb-2">
                Don't see yourself here?
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Join GetBooked.Live and create your profile to start getting booked.
              </p>
              <Link to="/auth">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Create Your Free Profile
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
