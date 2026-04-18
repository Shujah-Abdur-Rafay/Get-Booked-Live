import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_city, event_date, budget_min, budget_max, genres, event_type, notes } = await req.json();

    // Fetch artists from directory_listings (the canonical source with 844 artists)
    let artistQuery = supabase
      .from("directory_listings")
      .select("id, name, genres, city, state, country, tier, bookscore")
      .eq("listing_type", "artist")
      .not("name", "is", null)
      .order("bookscore", { ascending: false })
      .limit(120);

    // Genre filter
    if (genres) {
      const genreList = Array.isArray(genres) ? genres : genres.split(",").map((g: string) => g.trim());
      const genreFilter = genreList.map((g: string) => `genres.ilike.%${g}%`).join(",");
      if (genreFilter) artistQuery = artistQuery.or(genreFilter);
    }

    const { data: artists } = await artistQuery;
    const artistList = (artists || []).slice(0, 80);

    if (artistList.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], message: "No artists match your criteria. Try broadening your search." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Algorithmic scoring — fast, no external API needed
    const wantedGenres = Array.isArray(genres)
      ? genres.map((g: string) => g.toLowerCase())
      : (genres || "").split(",").map((g: string) => g.trim().toLowerCase()).filter(Boolean);

    const scored = artistList.map((a: any) => {
      let score = (a.bookscore || 0) * 0.5; // 50% weight on BookScore

      // Genre match
      if (wantedGenres.length > 0 && a.genres) {
        const artistGenres = a.genres.toLowerCase();
        const matches = wantedGenres.filter((g: string) => artistGenres.includes(g)).length;
        score += matches * 25;
      }

      // City proximity
      if (event_city && a.city && a.city.toLowerCase().includes(event_city.toLowerCase())) {
        score += 20;
      } else if (event_city && a.state && a.state.toLowerCase().includes(event_city.toLowerCase())) {
        score += 10;
      }

      // Tier bonus
      const tierBonus: Record<string, number> = { headliner: 15, established: 10, rising: 5, emerging: 0 };
      score += tierBonus[a.tier] || 0;

      return { ...a, score };
    }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

    const genreLabels = wantedGenres.length > 0 ? wantedGenres.join("/") : "music";
    const budgetLabel = budget_max ? `$${Number(budget_max).toLocaleString()}` : "your budget";

    const recommendations = scored.map((a: any, idx: number) => {
      const cityMatch = event_city && a.city && a.city.toLowerCase().includes(event_city.toLowerCase());
      const genreMatch = wantedGenres.length > 0 && a.genres && wantedGenres.some((g: string) => a.genres.toLowerCase().includes(g));

      let reason = `Ranked #${idx + 1} by BookScore (${a.bookscore || 0})${genreMatch ? `, strong ${genreLabels} match` : ""}${cityMatch ? `, local to ${event_city}` : ""}.`;

      const suggestedPrice = budget_max
        ? Math.round(Number(budget_max) * (0.85 - idx * 0.1))
        : a.tier === "headliner" ? 8000 : a.tier === "established" ? 3500 : a.tier === "rising" ? 1500 : 800;

      return {
        artist_id: a.id,
        artist_name: a.name,
        artist_genre: a.genres ?? null,
        artist_city: a.city ?? null,
        artist_state: a.state ?? null,
        artist_avatar: null,
        artist_slug: null,
        artist_bookscore: a.bookscore ?? null,
        suggested_price: suggestedPrice,
        confidence_score: Math.max(0.45, (0.92 - idx * 0.08)),
        reason,
        rank: idx + 1,
      };
    });

    return new Response(JSON.stringify({ recommendations }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("recommend-artists error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", recommendations: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
