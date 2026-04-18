import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Music, Youtube, Headphones, CloudRain, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";

export default function PlatformConnectionCards() {
  const { profile, user, refreshProfile } = useAuth();
  const stats = (profile as any)?.streaming_stats ?? {};

  const spotifyConnected = !!stats?.source || !!stats?.monthly_listeners;
  const youtubeConnected = !!stats?.youtube_subscribers;

  const comingSoon = (platform: string) => {
    toast(`${platform} connection coming soon.`, { icon: "🔗" });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">connect your platforms</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Spotify */}
        <div className="rounded-xl bg-[rgba(14,20,32,0.8)] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
              <Music className="w-4 h-4 text-[#1DB954]" />
            </div>
            <span className="font-display text-[13px] font-bold text-foreground">Spotify</span>
          </div>
          {spotifyConnected ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#1DB954]">
              <CheckCircle className="w-3.5 h-3.5" /> Connected
              {stats.monthly_listeners && (
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {Number(stats.monthly_listeners).toLocaleString()} listeners
                </span>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => comingSoon("Spotify")}
              className="w-full h-8 text-[11px] bg-[#1DB954] text-[#080C14] hover:bg-[#1DB954]/90 active:scale-[0.97]"
            >
              <Music className="w-3.5 h-3.5 mr-1.5" /> Connect Spotify
            </Button>
          )}
        </div>

        {/* YouTube */}
        <div className="rounded-xl bg-[rgba(14,20,32,0.8)] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF0000]/15 flex items-center justify-center">
              <Youtube className="w-4 h-4 text-[#FF0000]" />
            </div>
            <span className="font-display text-[13px] font-bold text-foreground">YouTube</span>
          </div>
          {youtubeConnected ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#FF0000]">
              <CheckCircle className="w-3.5 h-3.5" /> Connected
              <span className="ml-auto text-muted-foreground tabular-nums">
                {Number(stats.youtube_subscribers).toLocaleString()} subs
              </span>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => comingSoon("YouTube")}
              className="w-full h-8 text-[11px] bg-[#FF0000] text-white hover:bg-[#FF0000]/90 active:scale-[0.97]"
            >
              <Youtube className="w-3.5 h-3.5 mr-1.5" /> Connect YouTube
            </Button>
          )}
        </div>

        {/* Apple Music + SoundCloud */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-[rgba(14,20,32,0.8)] border border-white/[0.08] p-4 space-y-2.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FC3C44]/15 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5 text-[#FC3C44]" />
              </div>
              <span className="font-display text-[12px] font-bold text-foreground">Apple Music</span>
            </div>
            <Button
              size="sm"
              onClick={() => comingSoon("Apple Music")}
              className="w-full h-7 text-[10px] bg-[#FC3C44]/15 text-[#FC3C44] hover:bg-[#FC3C44]/25 border border-[#FC3C44]/20 active:scale-[0.97]"
              variant="ghost"
            >
              Connect
            </Button>
          </div>
          <div className="rounded-xl bg-[rgba(14,20,32,0.8)] border border-white/[0.08] p-4 space-y-2.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FF5500]/15 flex items-center justify-center">
                <CloudRain className="w-3.5 h-3.5 text-[#FF5500]" />
              </div>
              <span className="font-display text-[12px] font-bold text-foreground">SoundCloud</span>
            </div>
            <Button
              size="sm"
              onClick={() => comingSoon("SoundCloud")}
              className="w-full h-7 text-[10px] bg-[#FF5500]/15 text-[#FF5500] hover:bg-[#FF5500]/25 border border-[#FF5500]/20 active:scale-[0.97]"
              variant="ghost"
            >
              Connect
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}