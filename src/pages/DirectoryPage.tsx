import { useEffect, useState, useRef } from "react";
import SEO from "@/components/SEO";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Send, ArrowRight, ArrowLeft, Mic2, Calendar, Globe, Shield, CheckCircle, Clock, CalendarDays, Building2, Music, Camera, Wrench, Users, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { format, parseISO, startOfToday } from "date-fns";
import VenueClaimDialog from "@/components/VenueClaimDialog";
import ArtistClaimDialog from "@/components/ArtistClaimDialog";
import FlashBidBadge from "@/components/FlashBidBadge";
import UpgradeWall from "@/components/UpgradeWall";
import UpgradeOfferModal from "@/components/UpgradeOfferModal";

type Profile = {
  id: string;
  display_name: string | null;
  role: string | null;
  city: string | null;
  state: string | null;
  genre: string | null;
  bio: string | null;
  avatar_url: string | null;
  slug: string | null;
  is_verified: boolean | null;
  streaming_stats: {
    followers?: number;
    source?: string;
    spotify_artist_id?: string;
  } | null;
};

type ArtistListing = {
  id: string;
  name: string;
  genre: string | null;
  upcoming_concerts: number;
  bandsintown_url: string | null;
  claim_status: string;
  claimed_by: string | null;
  origin: string | null;
};

type VenueListing = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  website: string | null;
  region: string | null;
  claim_status: string;
  claimed_by: string | null;
  description: string | null;
  capacity: number | null;
};

const ROLE_TABS = [
  { value: "artist", label: "Artists", icon: Music },
  { value: "venue", label: "Venues", icon: Building2 },
  { value: "promoter", label: "Promoters", icon: Users },
  { value: "production", label: "Production", icon: Wrench },
  { value: "photo_video", label: "Creative", icon: Camera },
];

const GENRES = [
  "House", "Techno", "Hip-Hop", "R&B", "Afrobeats", "Electronic", "Pop", "Latin",
  "Reggaeton", "Jazz", "Rock", "Country", "EDM", "Trap", "Drill",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "A–Z" },
  { value: "name_desc", label: "Z–A" },
];

const roleColorMap: Record<string, string> = {
  artist: "bg-role-artist/10 text-role-artist",
  promoter: "bg-role-promoter/10 text-role-promoter",
  venue: "bg-role-venue/10 text-role-venue",
  production: "bg-role-production/10 text-role-production",
  photo_video: "bg-role-photo/10 text-role-photo",
};

const PAGE_SIZE = 50;

// Query functions
async function fetchProfiles(roleFilter: string, search: string, city: string | null, genre: string | null, sort: string, verifiedOnly: boolean, page: number) {
  if (roleFilter === "venue") return { data: [] as Profile[], count: 0 };
  let query = supabase.from("public_profiles" as any).select("*", { count: "exact" }) as any;
  if (roleFilter) query = query.eq("role", roleFilter);
  if (search) query = query.ilike("display_name", `%${search}%`);
  if (city) query = query.eq("city", city);
  if (genre) query = query.ilike("genre", `%${genre}%`);
  if (verifiedOnly) query = query.eq("is_verified", true);

  switch (sort) {
    case "name_asc": query = query.order("display_name", { ascending: true }); break;
    case "name_desc": query = query.order("display_name", { ascending: false }); break;
    default: query = query.order("updated_at", { ascending: false }); break;
  }

  query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  const { data, count } = await query;
  return { data: (data as Profile[]) ?? [], count: count ?? 0 };
}

async function fetchArtistListings(search: string, genre: string | null, page: number) {
  let query = supabase.from("artist_listings").select("*", { count: "exact" });
  if (search) query = query.ilike("name", `%${search}%`);
  if (genre) query = query.ilike("genre", `%${genre}%`);
  const { data, count } = await query.order("name", { ascending: true }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  return { data: (data as ArtistListing[]) ?? [], count: count ?? 0 };
}

async function fetchVenueListings(search: string, city: string | null, page: number) {
  let query = supabase.from("venue_listings_public" as any).select("*", { count: "exact" });
  if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,region.ilike.%${search}%`);
  if (city) query = query.eq("city", city);
  const { data, count } = await query.order("name", { ascending: true }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  return { data: (data as unknown as VenueListing[]) ?? [], count: count ?? 0 };
}

async function fetchAllCities() {
  const [profileRes, venueRes] = await Promise.all([
    supabase.from("public_profiles" as any).select("city"),
    supabase.from("venue_listings_public" as any).select("city"),
  ]);
  const cities = new Set<string>();
  [...(profileRes.data ?? []), ...(venueRes.data ?? [])].forEach((r: any) => {
    if (r.city && r.city.trim()) cities.add(r.city.trim());
  });
  return Array.from(cities).sort();
}

async function fetchVenueAvailability() {
  const today = startOfToday().toISOString().split("T")[0];
  const { data } = await supabase
    .from("venue_availability")
    .select("venue_id, available_date, notes")
    .gte("available_date", today)
    .order("available_date", { ascending: true });
  const grouped: Record<string, { available_date: string; notes: string | null }[]> = {};
  (data ?? []).forEach((a: any) => {
    if (!grouped[a.venue_id]) grouped[a.venue_id] = [];
    grouped[a.venue_id].push({ available_date: a.available_date, notes: a.notes });
  });
  return grouped;
}

async function fetchUserClaims(userId: string) {
  const { data } = await supabase
    .from("venue_claims")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("status", "pending");
  return new Set((data ?? []).map((c: any) => c.venue_id));
}

type FlashBidInfo = { artist_id: string; flash_bid_deadline: string; bid_count: number };

async function fetchFlashBids() {
  const today = startOfToday().toISOString().split("T")[0];
  const { data: avail } = await (supabase.from("artist_availability") as any)
    .select("id, artist_id, flash_bid_deadline")
    .eq("is_available", true)
    .eq("flash_bid_enabled", true)
    .gte("date", today);
  if (!avail || avail.length === 0) return new Map<string, FlashBidInfo>();
  const availIds = (avail as any[]).map((a: any) => a.id as string);
  const { data: bids } = await (supabase.from("flash_bids" as any).select("availability_id, id") as any)
    .eq("status", "active")
    .in("availability_id", availIds);
  const bidCounts = new Map<string, number>();
  ((bids as any[]) ?? []).forEach((b: any) => {
    bidCounts.set(b.availability_id, (bidCounts.get(b.availability_id) ?? 0) + 1);
  });
  const result = new Map<string, FlashBidInfo>();
  (avail as any[]).forEach((a: any) => {
    const existing = result.get(a.artist_id);
    if (!existing || new Date(a.flash_bid_deadline) < new Date(existing.flash_bid_deadline)) {
      result.set(a.artist_id, {
        artist_id: a.artist_id,
        flash_bid_deadline: a.flash_bid_deadline,
        bid_count: bidCounts.get(a.id) ?? 0,
      });
    }
  });
  return result;
}

export default function Directory({ initialRole = "artist" }: { initialRole?: string }) {
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get("role");
  const urlCity = searchParams.get("city");

  const [claimVenue, setClaimVenue] = useState<VenueListing | null>(null);
  const [claimArtist, setClaimArtist] = useState<ArtistListing | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState(urlRole || initialRole || "artist");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(urlCity);
  const [sortBy, setSortBy] = useState("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, profile: authProfile } = useAuth();
  const queryClient = useQueryClient();

  const clearFilters = () => {
    setSearch("");
    setGenreFilter(null);
    setCityFilter(null);
    setVerifiedOnly(false);
    setSortBy("newest");
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [activeTab, debouncedSearch, genreFilter, cityFilter, sortBy, verifiedOnly]);

  const isArtistTab = activeTab === "artist";
  const isVenueTab = activeTab === "venue";
  const isProfileTab = !isVenueTab;

  const { data: profileResult = { data: [], count: 0 }, isLoading: profilesLoading } = useQuery({
    queryKey: ["directory-profiles", activeTab, debouncedSearch, cityFilter, isArtistTab ? genreFilter : null, sortBy, verifiedOnly, page],
    queryFn: () => fetchProfiles(activeTab, debouncedSearch, cityFilter, isArtistTab ? genreFilter : null, sortBy, verifiedOnly, page),
    enabled: isProfileTab,
    staleTime: 30_000,
  });

  const profiles = profileResult.data;
  const profileCount = profileResult.count;

  const { data: artistResult = { data: [], count: 0 }, isLoading: artistsLoading } = useQuery({
    queryKey: ["directory-artists", debouncedSearch, genreFilter, page],
    queryFn: () => fetchArtistListings(debouncedSearch, genreFilter, page),
    enabled: isArtistTab,
    staleTime: 30_000,
  });

  const artistListings = artistResult.data;
  const artistCount = artistResult.count;

  const { data: allCities = [] } = useQuery<string[]>({
    queryKey: ["directory-all-cities"],
    queryFn: fetchAllCities,
    staleTime: 120_000,
  });

  const { data: venueResult = { data: [], count: 0 }, isLoading: venuesLoading } = useQuery({
    queryKey: ["directory-venues", debouncedSearch, cityFilter, page],
    queryFn: () => fetchVenueListings(debouncedSearch, cityFilter, page),
    enabled: isVenueTab,
    staleTime: 30_000,
  });

  const venueListings = venueResult.data;
  const venueCount = venueResult.count;

  const { data: venueAvailability = {} } = useQuery({
    queryKey: ["directory-venue-availability"],
    queryFn: fetchVenueAvailability,
    enabled: isVenueTab,
    staleTime: 30_000,
  });

  const { data: userClaims = new Set<string>() } = useQuery({
    queryKey: ["directory-user-claims", user?.id],
    queryFn: () => fetchUserClaims(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: flashBids = new Map<string, FlashBidInfo>() } = useQuery({
    queryKey: ["directory-flash-bids"],
    queryFn: fetchFlashBids,
    enabled: isArtistTab,
    staleTime: 30_000,
  });

  const loading = (isProfileTab && profilesLoading) || (isArtistTab && artistsLoading) || (isVenueTab && venuesLoading);

  const totalCount = isVenueTab ? venueCount : isArtistTab ? (profileCount + artistCount) : profileCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const el = ref.current;
    if (!el || loading) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    el.querySelectorAll("[data-reveal]").forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [loading, profiles, artistListings, venueListings, activeTab]);

  const groupedVenues = venueListings.reduce<Record<string, VenueListing[]>>((acc, v) => {
    const key = v.region || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const getClaimButton = (v: VenueListing) => {
    if (v.claim_status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-[10px] text-green-400 font-semibold font-body">
          <CheckCircle className="w-3 h-3" /> claimed
        </span>
      );
    }
    if (userClaims.has(v.id)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-role-venue/10 text-[10px] text-role-venue font-semibold font-body">
          <Clock className="w-3 h-3" /> pending
        </span>
      );
    }
    if (!user) return null;
    return (
      <button
        onClick={() => setClaimVenue(v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-role-venue/10 text-[10px] text-muted-foreground hover:text-role-venue font-semibold transition-colors active:scale-[0.97] font-body"
      >
        <Shield className="w-3 h-3" /> claim
      </button>
    );
  };

  const plan = authProfile?.subscription_plan ?? "free";
  const hasPaidPlan = plan === "pro" || plan === "agency";
  if (!user || !hasPaidPlan) {
    return <UpgradeWall />;
  }

  const rangeStart = page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalCount);
  const tabLabel = ROLE_TABS.find((t) => t.value === activeTab)?.label.toLowerCase() ?? "";

  return (
    <div ref={ref} className="min-h-screen pt-20 px-4 sm:px-6 md:px-8 pb-12" aria-busy={loading}>
      <SEO
        title="Browse Artists, Venues & Production Crews — GetBooked.Live"
        description="Search 2,400+ verified artists, 840+ venues, and 380+ production crews. Filter by genre, city, and fee range."
        canonical="https://getbooked.live/directory"
      />
      <div className="container mx-auto max-w-5xl">
        {/* CTA Banner */}
        <div className="mb-8 rounded-xl bg-primary/5 border border-primary/10 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-body">
            <span className="text-foreground font-medium">make your profile today</span> — get discovered by promoters, venues, and production teams
          </p>
          <Link to="/auth?tab=signup">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium lowercase h-8 active:scale-[0.97] transition-transform whitespace-nowrap">
              get started free <ArrowRight className="ml-1.5 w-3 h-3" />
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <span className="section-label">directory</span>
          <h1 className="section-heading">discover talent, venues & crews</h1>
          <p className="section-subtext">Search verified profiles by genre, city, and availability.</p>
        </div>

        {/* Search + Genre dropdown + City filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search by name, city, or genre..."
              className="pl-9 bg-card border-border font-body"
              aria-label="Search directory"
            />
          </div>
          {isArtistTab && (
            <select
              value={genreFilter ?? ""}
              onChange={(e) => setGenreFilter(e.target.value || null)}
              className="h-11 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-body min-w-[150px] shrink-0"
            >
              <option value="">All genres</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
          {allCities.length > 0 && (
            <select
              value={cityFilter ?? ""}
              onChange={(e) => setCityFilter(e.target.value || null)}
              className="h-11 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-body min-w-[140px] shrink-0"
            >
              <option value="">All cities</option>
              {allCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Sort + filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] text-foreground font-body min-w-[130px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all active:scale-[0.97] ${
              verifiedOnly
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Verified only
          </button>
          {(debouncedSearch || genreFilter || cityFilter || sortBy !== "newest" || verifiedOnly) && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setGenreFilter(null);
                setCityFilter(null);
                setSortBy("newest");
                setVerifiedOnly(false);
                setPage(0);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-destructive hover:text-destructive/80 transition-colors active:scale-[0.97]"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setGenreFilter(null); setPage(0); }} className="w-full">
          <TabsList className="bg-card border border-border w-full justify-start gap-0 h-auto p-1 grid grid-cols-3 sm:grid-cols-5">
            {ROLE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs font-display lowercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 px-3 py-2"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Results count — announced to screen readers */}
          <p className="text-[11px] text-muted-foreground font-body mt-4 tabular-nums" aria-live="polite" role="status">
            {loading ? "Loading results…" : totalCount > 0 ? `Showing ${rangeStart}–${rangeEnd} of ${totalCount} ${tabLabel}` : `No ${tabLabel} found`}
          </p>

          {/* Tab content */}
          {ROLE_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              {loading ? (
                <SkeletonGrid count={6} cardHeight="h-44" />
              ) : tab.value === "venue" ? (
                Object.keys(groupedVenues).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedVenues).map(([region, venueList]) => (
                      <div key={region}>
                        <h3 data-reveal className="fade-in-section font-display text-sm font-semibold mb-2 text-role-venue/80 lowercase">{region}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {venueList.map((v) => (
                            <div key={v.id} data-reveal className="fade-in-section rounded-xl bg-card border border-border p-4 hover:border-role-venue/20 transition-all duration-300">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-role-venue/10 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4 text-role-venue" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-display font-semibold text-sm truncate">{v.name}</h3>
                                    <p className="text-[11px] text-muted-foreground font-body">
                                      {[v.city, v.state].filter(Boolean).join(", ")}
                                    </p>
                                  </div>
                                </div>
                                {getClaimButton(v)}
                              </div>
                              {v.capacity && (
                                <p className="text-[11px] text-muted-foreground font-body mb-1">Capacity: {v.capacity.toLocaleString()}</p>
                              )}
                              {v.description && (
                                <p className="text-[10px] text-muted-foreground/70 font-body line-clamp-2 mb-2">{v.description}</p>
                              )}
                              {venueAvailability[v.id]?.length > 0 && (
                                <div className="mb-2">
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <CalendarDays className="w-3 h-3 text-green-400" />
                                    <span className="text-[10px] font-semibold text-green-400 font-body uppercase tracking-wide">
                                      {venueAvailability[v.id].length} open date{venueAvailability[v.id].length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {venueAvailability[v.id].slice(0, 4).map((a) => (
                                      <span key={a.available_date} title={a.notes || undefined} className="inline-block px-1.5 py-0.5 rounded bg-green-500/10 text-[10px] text-green-400/90 font-body font-medium">
                                        {format(parseISO(a.available_date), "MMM d")}
                                      </span>
                                    ))}
                                    {venueAvailability[v.id].length > 4 && (
                                      <span className="inline-block px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-body">
                                        +{venueAvailability[v.id].length - 4} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-3">
                                {v.website && (
                                  <a href={v.website.startsWith("http") ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-secondary/80 transition-colors font-body">
                                    <Globe className="w-3 h-3 text-role-venue" /> Website
                                  </a>
                                )}
                                {v.claim_status === "approved" && v.claimed_by && (
                                  <Link to={`/offer?venue=${v.claimed_by}`}>
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] border-role-venue/20 text-role-venue hover:bg-role-venue/10 active:scale-[0.97]">
                                      Book Venue
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState role="venue" />
                )
              ) : tab.value === "artist" ? (
                (profiles.length > 0 || artistListings.length > 0) ? (
                  <div className="space-y-8">
                    {profiles.length > 0 && (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {profiles.map((p) => (
                            <ProfileCard key={p.id} p={p} flashBids={flashBids} hasPaidPlan={hasPaidPlan} onUpgrade={() => setUpgradeModal(true)} />
                          ))}
                        </div>
                      </div>
                    )}
                    {artistListings.length > 0 && (
                      <div>
                        <h2 data-reveal className="fade-in-section font-display text-lg font-bold mb-3 text-foreground/80 lowercase">
                          artist directory
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {artistListings.map((a) => (
                            <div key={a.id} data-reveal className="fade-in-section rounded-xl bg-card border border-border p-4 hover:border-primary/20 transition-all duration-300">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Music className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-display font-semibold text-sm truncate">{a.name}</h3>
                                    {a.genre && <p className="text-[11px] text-muted-foreground font-body truncate">{a.genre}</p>}
                                  </div>
                                </div>
                                {a.claim_status === "approved" ? (
                                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium shrink-0"><CheckCircle className="w-3 h-3" /> claimed</span>
                                ) : a.claim_status === "pending" ? (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium shrink-0"><Clock className="w-3 h-3" /> pending</span>
                                ) : (
                                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 border-primary/20 text-primary hover:bg-primary/10 active:scale-[0.97] transition-transform shrink-0" onClick={() => setClaimArtist(a)}>
                                    <Shield className="w-3 h-3 mr-1" /> claim
                                  </Button>
                                )}
                              </div>
                              {a.bandsintown_url && (
                                <a href={a.bandsintown_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-body">
                                  bandsintown ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState role="artist" onClearFilters={clearFilters} />
                )
              ) : (
                profiles.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {profiles.map((p) => (
                        <ProfileCard key={p.id} p={p} flashBids={flashBids} hasPaidPlan={hasPaidPlan} onUpgrade={() => setUpgradeModal(true)} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState role={tab.value} onClearFilters={clearFilters} />
                )
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 pt-6">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-8 text-xs text-muted-foreground hover:text-foreground active:scale-[0.97]">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">Page {page + 1} of {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="h-8 text-xs text-muted-foreground hover:text-foreground active:scale-[0.97]">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        <UpgradeOfferModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      </div>

      {claimVenue && (
        <VenueClaimDialog
          venueId={claimVenue.id}
          venueName={claimVenue.name}
          open={!!claimVenue}
          onOpenChange={(open) => { if (!open) setClaimVenue(null); }}
          onClaimed={() => {
            queryClient.invalidateQueries({ queryKey: ["directory-user-claims"] });
            setClaimVenue(null);
          }}
        />
      )}

      {claimArtist && (
        <ArtistClaimDialog
          artistListingId={claimArtist.id}
          artistName={claimArtist.name}
          open={!!claimArtist}
          onOpenChange={(open) => { if (!open) setClaimArtist(null); }}
          onClaimed={() => {
            queryClient.invalidateQueries({ queryKey: ["directory-artists"] });
            setClaimArtist(null);
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ role, onClearFilters }: { role: string; onClearFilters?: () => void }) {
  return (
    <div className="rounded-xl bg-card border border-border p-8 text-center">
      <p className="font-syne font-bold text-base text-foreground mb-2">No artists found</p>
      <p className="text-sm text-muted-foreground font-body mb-4">Try removing a filter or searching a nearby city.</p>
      {onClearFilters && (
        <Button size="sm" variant="outline" className="text-xs h-8" onClick={onClearFilters}>
          Clear filters <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

function ProfileCard({ p, flashBids, hasPaidPlan, onUpgrade }: {
  p: Profile;
  flashBids: Map<string, FlashBidInfo>;
  hasPaidPlan: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div data-reveal className="fade-in-section rounded-xl bg-card border border-border p-5 hover:border-primary/20 transition-all duration-300">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-display font-bold text-sm text-foreground shrink-0 overflow-hidden" style={{ aspectRatio: '1' }}>
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" loading="lazy" width={40} height={40} />
          ) : (
            (p.display_name ?? "?")[0].toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-sm truncate">{p.display_name}</h3>
          {p.role && (
            <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded mt-1 ${roleColorMap[p.role] ?? ""}`}>
              {p.role === "photo_video" ? "Creative" : p.role.charAt(0).toUpperCase() + p.role.slice(1)}
            </span>
          )}
        </div>
      </div>
      {p.role === "artist" && p.id && flashBids.has(p.id) && (
        <div className="mb-2">
          <FlashBidBadge deadline={flashBids.get(p.id)!.flash_bid_deadline} bidCount={flashBids.get(p.id)!.bid_count} />
        </div>
      )}
      {p.role === "artist" && p.streaming_stats?.followers && p.streaming_stats.followers > 0 && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/20 font-semibold" style={{ color: "#1DB954" }}>
            <Music className="w-3 h-3" />
            {p.streaming_stats.followers >= 1_000_000
              ? `${(p.streaming_stats.followers / 1_000_000).toFixed(1)}M listeners`
              : p.streaming_stats.followers >= 1_000
              ? `${(p.streaming_stats.followers / 1_000).toFixed(1)}K listeners`
              : `${p.streaming_stats.followers} listeners`}
          </span>
        </div>
      )}
      {p.role === "artist" && p.streaming_stats?.source === "spotify_api" && !p.streaming_stats?.followers && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border" style={{ color: "#1DB954" }}>
            ✓ Spotify verified
          </span>
        </div>
      )}
      {p.bio && <p className="text-xs text-muted-foreground line-clamp-2 mb-2 font-body">{p.bio}</p>}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
          {(p.city || p.state) && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.city, p.state].filter(Boolean).join(", ")}</span>
          )}
          {p.genre && <span>{p.genre}</span>}
        </div>
        {p.role === "artist" && (
          hasPaidPlan ? (
            <Link to={`/offer?artist=${p.id}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 active:scale-[0.97] transition-transform">
                <Send className="w-3 h-3 mr-1" /> Book
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="outline" onClick={onUpgrade} className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 active:scale-[0.97] transition-transform">
              <Send className="w-3 h-3 mr-1" /> Book
            </Button>
          )
        )}
      </div>
    </div>
  );
}
