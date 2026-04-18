import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

function extractArtistId(url: string): string | null {
  // Matches: https://open.spotify.com/artist/XXXX or spotify:artist:XXXX
  const match = url.match(/artist[\/:]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for cron refresh
    const cronSecret = req.headers.get("x-cron-secret");
    const body = await req.json();
    
    if (body.cron_refresh && cronSecret === Deno.env.get("CRON_SECRET")) {
      // Batch refresh all users with Spotify connected (updated > 7 days ago)
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: staleProfiles } = await adminClient
        .from("profiles")
        .select("user_id, spotify, streaming_stats")
        .not("spotify", "is", null)
        .not("streaming_stats", "is", null);
      
      const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
      const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: "Spotify credentials missing" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const spotifyToken = await getSpotifyToken(clientId, clientSecret);
      let refreshed = 0;

      for (const p of (staleProfiles ?? [])) {
        const stats = p.streaming_stats as any;
        if (!stats?.updated_at || new Date(stats.updated_at).toISOString() > sevenDaysAgo) continue;
        
        const artistId = stats?.spotify_artist_id;
        if (!artistId) continue;

        try {
          const headers = { Authorization: `Bearer ${spotifyToken}` };
          const [artistRes, tracksRes] = await Promise.all([
            fetch(`https://api.spotify.com/v1/artists/${artistId}`, { headers }),
            fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, { headers }),
          ]);
          if (!artistRes.ok) continue;
          const artist = await artistRes.json();
          const tracksData = tracksRes.ok ? await tracksRes.json() : { tracks: [] };
          const topTracks = (tracksData.tracks || []).slice(0, 5).map((t: any) => ({
            name: t.name, album: t.album?.name,
            album_art: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
            popularity: t.popularity, preview_url: t.preview_url,
            spotify_url: t.external_urls?.spotify, uri: t.uri,
          }));
          const updatedStats = {
            ...stats,
            followers: artist.followers?.total || 0,
            monthly_listeners: artist.followers?.total || 0,
            genres: artist.genres || [],
            popularity: artist.popularity,
            top_tracks: topTracks,
            artist_image: artist.images?.[0]?.url,
            updated_at: new Date().toISOString(),
          };
          await adminClient.from("profiles").update({ streaming_stats: updatedStats }).eq("user_id", p.user_id);
          const today = new Date().toISOString().split("T")[0];
          await adminClient.from("artist_stats").upsert(
            { user_id: p.user_id, monthly_listeners: updatedStats.followers, followers: updatedStats.followers, snapshot_date: today },
            { onConflict: "user_id,snapshot_date" }
          );
          refreshed++;
        } catch (e) { console.error(`Failed to refresh ${p.user_id}:`, e); }
      }

      return new Response(JSON.stringify({ success: true, refreshed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check for regular requests
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

    const { spotify_url } = body;
    if (!spotify_url) {
      return new Response(JSON.stringify({ error: "spotify_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const artistId = extractArtistId(spotify_url);
    if (!artistId) {
      return new Response(JSON.stringify({ error: "Invalid Spotify artist URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Spotify API credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spotifyToken = await getSpotifyToken(clientId, clientSecret);
    const headers = { Authorization: `Bearer ${spotifyToken}` };

    // Fetch artist info + top tracks in parallel
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

    const streamingStats = {
      monthly_listeners: artist.followers?.total || 0, // Note: public API gives followers, not monthly listeners
      followers: artist.followers?.total || 0,
      genres: artist.genres || [],
      popularity: artist.popularity,
      top_tracks: topTracks,
      top_city: null, // Not available via public API without user OAuth
      source: "spotify_api",
      spotify_artist_id: artistId,
      artist_image: artist.images?.[0]?.url,
      updated_at: new Date().toISOString(),
    };

    // Save to profiles
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient
      .from("profiles")
      .update({
        streaming_stats: streamingStats,
        spotify: spotify_url,
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
  } catch (error) {
    console.error("spotify-data error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
