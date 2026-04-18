import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3 shadow-lg">
        <Download className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-semibold text-foreground">Add GetBooked to your home screen</p>
          <p className="text-[10px] text-muted-foreground font-body">Quick access, no app store needed</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold active:scale-[0.96] transition-transform"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
