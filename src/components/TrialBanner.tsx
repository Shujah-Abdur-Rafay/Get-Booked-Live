import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, X } from "lucide-react";
import { useState } from "react";

/**
 * TrialBanner
 * Shown at the top of every dashboard when the user is on an active Pro trial.
 * Displays days remaining and a CTA to subscribe.
 * Dismissible per session (localStorage).
 */
export default function TrialBanner() {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("trial_banner_dismissed") === "true"
  );

  const isTrial = subscription?.is_trial === true;
  const daysLeft = subscription?.trial_days_remaining ?? 0;

  if (!isTrial || daysLeft <= 0 || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("trial_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="relative flex items-center justify-between gap-3 rounded-xl border border-[#C8FF3E]/20 bg-[#C8FF3E]/[0.06] px-4 py-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <Zap className="w-4 h-4 text-[#C8FF3E] flex-shrink-0" />
        <p className="text-xs text-foreground">
          <span className="font-semibold text-[#C8FF3E]">
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
          </span>{" "}
          on your free Pro trial — Deal Rooms, 10% commission, verified badge.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate("/pricing")}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
          style={{ backgroundColor: "#C8FF3E", color: "#080C14" }}
        >
          Subscribe now
        </button>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
