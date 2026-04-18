import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Film } from "lucide-react";

type Clip = {
  id: string;
  file_path: string;
  title: string | null;
};

type Props = {
  userId: string;
};

export default function ReelDisplay({ userId }: Props) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reel_clips" as any)
        .select("id, file_path, title")
        .eq("user_id", userId)
        .order("sort_order");
      setClips((data as any as Clip[]) ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("reel-clips").getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading || clips.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-white/[0.06] p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Film className="w-4 h-4 text-primary" />
        <h2 className="font-syne text-sm font-semibold text-muted-foreground uppercase tracking-wider">Performance Reel</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {clips.map((clip) => (
          <div key={clip.id} className="relative rounded-lg overflow-hidden border border-white/[0.06] bg-background">
            <video
              src={getPublicUrl(clip.file_path)}
              className="w-full aspect-video object-cover"
              controls
              preload="metadata"
              playsInline
            />
            {clip.title && (
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground truncate">{clip.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
