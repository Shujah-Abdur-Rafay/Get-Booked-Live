import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Film, Upload, X, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Clip = {
  id: string;
  file_path: string;
  title: string | null;
  sort_order: number;
};

export default function ReelUploader() {
  const { user } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("reel_clips" as any)
        .select("id, file_path, title, sort_order")
        .eq("user_id", user.id)
        .order("sort_order");
      setClips((data as any as Clip[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video must be under 50MB");
      return;
    }

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file (MP4, MOV, WebM)");
      return;
    }

    if (clips.length >= 6) {
      toast.error("Maximum 6 clips allowed");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "mp4";
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("reel-clips")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: clip, error: insertErr } = await supabase
        .from("reel_clips" as any)
        .insert({
          user_id: user.id,
          file_path: path,
          title: file.name.replace(/\.[^.]+$/, ""),
          sort_order: clips.length,
        } as any)
        .select("id, file_path, title, sort_order")
        .single();

      if (insertErr) throw insertErr;
      setClips((prev) => [...prev, clip as any as Clip]);
      toast.success("Clip uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (clip: Clip) => {
    if (!user) return;
    setDeleting(clip.id);
    try {
      await supabase.storage.from("reel-clips").remove([clip.file_path]);
      await supabase.from("reel_clips" as any).delete().eq("id", clip.id);
      setClips((prev) => prev.filter((c) => c.id !== clip.id));
      toast.success("Clip removed");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("reel-clips").getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          <h3 className="font-syne text-sm font-semibold">My Reel</h3>
          <span className="text-[10px] text-muted-foreground">({clips.length}/6)</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || clips.length >= 6}
          onClick={() => fileRef.current?.click()}
          className="border-border text-xs h-8 active:scale-[0.97]"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
          {uploading ? "Uploading…" : "Add clip"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/mov"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {clips.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Film className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Upload up to 6 performance clips</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">MP4, MOV, or WebM · Max 50MB each</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {clips.map((clip) => (
            <div key={clip.id} className="relative rounded-lg overflow-hidden border border-border bg-background group">
              <video
                src={getPublicUrl(clip.file_path)}
                className="w-full aspect-video object-cover"
                muted
                preload="metadata"
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-[10px] text-white/80 truncate">{clip.title}</p>
              </div>
              <button
                onClick={() => handleDelete(clip)}
                disabled={deleting === clip.id}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 active:scale-[0.95]"
              >
                {deleting === clip.id
                  ? <Loader2 className="w-3 h-3 animate-spin text-white" />
                  : <X className="w-3 h-3 text-white" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
