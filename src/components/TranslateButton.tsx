import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  onTranslated?: (translated: string) => void;
};

function getViewerLanguage(): string {
  const stored = localStorage.getItem("i18nextLng");
  if (stored) return stored.split("-")[0];
  return navigator.language?.split("-")[0] ?? "en";
}

export default function TranslateButton({ text, className, onTranslated }: Props) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const lang = getViewerLanguage();

  // Don't show translate for English content if viewer is English
  // (We can't reliably detect source language, so always show the button)

  const handleTranslate = async () => {
    if (translatedText) {
      setShowOriginal(!showOriginal);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text, target_language: lang },
      });
      if (error) throw error;
      if (data?.translated) {
        setTranslatedText(data.translated);
        setShowOriginal(false);
        onTranslated?.(data.translated);
      }
    } catch (err: any) {
      toast.error(err.message || "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {translatedText && !showOriginal && (
        <p className="text-sm text-foreground leading-relaxed" style={{ textWrap: "pretty" }}>
          {translatedText}
        </p>
      )}
      <button
        onClick={handleTranslate}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md w-fit",
          "text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors",
          "active:scale-[0.97] disabled:opacity-50"
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : translatedText ? (
          <RotateCcw className="w-3 h-3" />
        ) : (
          <Languages className="w-3 h-3" />
        )}
        {loading
          ? "Translating…"
          : translatedText
            ? showOriginal ? "Show translation" : "Show original"
            : "Translate"
        }
      </button>
    </div>
  );
}
