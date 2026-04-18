import { Disc3 } from "lucide-react";

const SPOTIFY_GREEN = "#1DB954";

type Track = {
  name: string;
  album: string;
  album_art: string;
  popularity: number;
  spotify_url: string;
  uri: string;
};

type Props = {
  tracks: Track[];
  spotifyUrl?: string | null;
};

function getEmbedUrl(uri: string) {
  // Convert spotify:track:ID to embed URL
  const id = uri.split(":").pop();
  return `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`;
}

export default function TopTracksSection({ tracks, spotifyUrl }: Props) {
  if (!tracks || tracks.length === 0) {
    if (spotifyUrl) {
      return (
        <div className="rounded-xl bg-card border border-white/[0.06] p-5 mb-4">
          <h2 className="font-syne text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Music</h2>
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors active:scale-[0.97]"
            style={{ backgroundColor: SPOTIFY_GREEN, color: "#000" }}
          >
            <Disc3 className="w-3.5 h-3.5" /> Listen on Spotify
          </a>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="rounded-xl bg-card border border-white/[0.06] p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Tracks</h2>
        <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
          <Disc3 className="w-3 h-3" style={{ color: SPOTIFY_GREEN }} /> Powered by Spotify
        </span>
      </div>

      <div className="space-y-3">
        {tracks.map((track, i) => (
          <div key={i}>
            {/* Track info row */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-right font-medium">{i + 1}</span>
              {track.album_art && (
                <img src={track.album_art} alt={track.album} className="w-10 h-10 rounded object-cover" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{track.album}</p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{track.popularity}/100</span>
            </div>

            {/* Spotify embed */}
            {track.uri && (
              <div className="ml-7">
                <iframe
                  src={getEmbedUrl(track.uri)}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                  style={{ borderRadius: 12 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
