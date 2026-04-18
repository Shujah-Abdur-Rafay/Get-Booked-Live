import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action } = body;

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Spotify credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get_auth_url — returns the Spotify OAuth URL
    if (action === "get_auth_url") {
      const { redirect_uri } = body;
      if (!redirect_uri) {
        return new Response(JSON.stringify({ error: "redirect_uri required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const scopes = "user-read-private user-top-read";
      const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=${userId}`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: exchange_code — exchange auth code for token and fetch data
    if (action === "exchange_code") {
      const { code, redirect_uri } = body;
      if (!code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "code and redirect_uri required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for access token
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Token exchange failed:", errText);
        return new Response(JSON.stringify({ error: "Failed to exchange Spotify code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const headers = { Authorization: `Bearer ${accessToken}` };

      // Fetch user profile, top tracks in parallel
      const [meRes, topTracksRes] = await Promise.all([
        fetch("https://api.spotify.com/v1/me", { headers }),
        fetch("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term", { headers }),
      ]);

      const me = meRes.ok ? await meRes.json() : null;
      const topTracksData = topTracksRes.ok ? await topTracksRes.json() : { items: [] };

      // Get artist ID from top tracks to fetch related artists
      const artistIds = new Set<string>();
      (topTracksData.items || []).forEach((t: any) => {
        t.artists?.forEach((a: any) => artistIds.add(a.id));
      });

      // Fetch the user's top artist for related artists
      let relatedArtists: any[] = [];
      if (artistIds.size > 0) {
        const firstArtistId = [...artistIds][0];
        try {
          const relatedRes = await fetch(`https://api.spotify.com/v1/artists/${firstArtistId}/related-artists`, { headers });
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            relatedArtists = (relatedData.artists || []).slice(0, 5).map((a: any) => ({
              name: a.name,
              spotify_url: a.external_urls?.spotify,
              image: a.images?.[1]?.url || a.images?.[0]?.url,
              followers: a.followers?.total,
            }));
          }
        } catch { /* ignore */ }
      }

      const topTracks = (topTracksData.items || []).map((t: any) => ({
        name: t.name,
        album: t.album?.name,
        album_art: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
        popularity: t.popularity,
        preview_url: t.preview_url,
        spotify_url: t.external_urls?.spotify,
        uri: t.uri,
      }));

      const spotifyUrl = me?.external_urls?.spotify || null;
      const spotifyArtistId = me?.id || null;

      const streamingStats = {
        monthly_listeners: me?.followers?.total || 0,
        followers: me?.followers?.total || 0,
        genres: [],
        popularity: me?.popularity || 0,
        top_tracks: topTracks,
        related_artists: relatedArtists,
        top_city: null,
        top_cities: [],
        source: "spotify_oauth",
        spotify_artist_id: spotifyArtistId,
        artist_image: me?.images?.[0]?.url,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If the user has an artist profile on Spotify, fetch artist-specific data
      // Try to find their artist profile by matching Spotify ID
      if (me?.type === "artist" || me?.uri?.includes("artist")) {
        try {
          const artistRes = await fetch(`https://api.spotify.com/v1/artists/${me.id}`, { headers });
          if (artistRes.ok) {
            const artistData = await artistRes.json();
            streamingStats.genres = artistData.genres || [];
            streamingStats.popularity = artistData.popularity || 0;
            streamingStats.followers = artistData.followers?.total || streamingStats.followers;
          }
        } catch { /* ignore */ }
      }

      // Save to profiles using admin client
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await adminClient
        .from("profiles")
        .update({
          streaming_stats: streamingStats,
          spotify: spotifyUrl,
        })
        .eq("user_id", userId);

      // Save snapshot to artist_stats
      const today = new Date().toISOString().split("T")[0];
      await adminClient.from("artist_stats").upsert(
        {
          user_id: userId,
          monthly_listeners: streamingStats.followers,
          followers: streamingStats.followers,
          snapshot_date: today,
        },
        { onConflict: "user_id,snapshot_date" }
      );

      return new Response(JSON.stringify({ success: true, data: streamingStats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: refresh — re-fetch using client credentials (existing spotify URL)
    if (action === "refresh") {
      // Delegate to existing spotify-data function logic
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: profile } = await adminClient
        .from("profiles")
        .select("spotify, streaming_stats")
        .eq("user_id", userId)
        .single();

      if (!profile?.spotify) {
        return new Response(JSON.stringify({ error: "No Spotify connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use client credentials to refresh artist data
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      if (!tokenRes.ok) throw new Error("Spotify auth failed");
      const { access_token } = await tokenRes.json();
      const headers = { Authorization: `Bearer ${access_token}` };

      // Extract artist ID from stored data or URL
      const existingStats = profile.streaming_stats as any;
      let artistId = existingStats?.spotify_artist_id;
      if (!artistId) {
        const match = profile.spotify.match(/artist[\/:]([a-zA-Z0-9]+)/);
        artistId = match?.[1];
      }

      if (!artistId) {
        return new Response(JSON.stringify({ error: "Could not determine Spotify artist ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [artistRes, tracksRes] = await Promise.all([
        fetch(`https://api.spotify.com/v1/artists/${artistId}`, { headers }),
        fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, { headers }),
      ]);

      if (!artistRes.ok) {
        return new Response(JSON.stringify({ error: `Spotify API error: ${artistRes.status}` }), {
          status: artistRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const artist = await artistRes.json();
      const tracksData = tracksRes.ok ? await tracksRes.json() : { tracks: [] };

      const topTracks = (tracksData.tracks || []).slice(0, 5).map((t: any) => ({
        name: t.name,
        album: t.album?.name,
        album_art: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
        popularity: t.popularity,
        preview_url: t.preview_url,
        spotify_url: t.external_urls?.spotify,
        uri: t.uri,
      }));

      const updatedStats = {
        ...(existingStats || {}),
        monthly_listeners: artist.followers?.total || 0,
        followers: artist.followers?.total || 0,
        genres: artist.genres || [],
        popularity: artist.popularity,
        top_tracks: topTracks,
        artist_image: artist.images?.[0]?.url,
        updated_at: new Date().toISOString(),
      };

      await adminClient
        .from("profiles")
        .update({ streaming_stats: updatedStats })
        .eq("user_id", userId);

      const today = new Date().toISOString().split("T")[0];
      await adminClient.from("artist_stats").upsert(
        {
          user_id: userId,
          monthly_listeners: updatedStats.followers,
          followers: updatedStats.followers,
          snapshot_date: today,
        },
        { onConflict: "user_id,snapshot_date" }
      );

      return new Response(JSON.stringify({ success: true, data: updatedStats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use get_auth_url, exchange_code, or refresh" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("spotify-callback error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
