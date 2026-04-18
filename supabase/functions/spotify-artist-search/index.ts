const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let cachedToken: { token: string; expires: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;

  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error(`Spotify credentials not configured: id=${!!clientId} secret=${!!clientSecret}`);

  const credentials = `${clientId}:${clientSecret}`;
  const encoded = btoa(credentials);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error("Spotify token error:", res.status, errBody);
    throw new Error(`Spotify auth failed: ${res.status} - ${errBody}`);
  }
  const data = await res.json();
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let artistName = "";

    if (req.method === "GET") {
      artistName = new URL(req.url).searchParams.get("artist_name") ?? "";
    } else {
      const body = await req.json().catch(() => ({}));
      artistName = body.artist_name ?? "";
    }

    if (!artistName.trim()) {
      return new Response(JSON.stringify({ error: "artist_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) throw new Error(`Spotify search failed: ${searchRes.status}`);

    const searchData = await searchRes.json();
    const artists = (searchData.artists?.items ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      genres: a.genres,
      followers: a.followers?.total,
      popularity: a.popularity,
      image: a.images?.[0]?.url ?? null,
      spotify_url: a.external_urls?.spotify,
    }));

    return new Response(JSON.stringify({ artists }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
