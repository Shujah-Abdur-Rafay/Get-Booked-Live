import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Camera, DollarSign, CalendarDays, Share2, Inbox, X } from "lucide-react";
import { toast } from "sonner";

type StepKey = "complete_profile" | "set_fee_range" | "mark_available_dates" | "share_epk" | "receive_first_offer";

type OnboardingSteps = Record<StepKey, boolean>;

const DEFAULT_STEPS: OnboardingSteps = {
  complete_profile: false,
  set_fee_range: false,
  mark_available_dates: false,
  share_epk: false,
  receive_first_offer: false,
};

const STEP_CONFIG: { key: StepKey; label: string; description: string; icon: React.ElementType }[] = [
  { key: "complete_profile", label: "Complete your profile", description: "Add a photo and bio", icon: Camera },
  { key: "set_fee_range", label: "Set your fee range", description: "Let promoters know your rates", icon: DollarSign },
  { key: "mark_available_dates", label: "Mark available dates", description: "Show when you're free to book", icon: CalendarDays },
  { key: "share_epk", label: "Share your EPK link", description: "Send your profile to a promoter", icon: Share2 },
  { key: "receive_first_offer", label: "Receive your first offer", description: "A promoter sends you a booking", icon: Inbox },
];

export default function OnboardingChecklist() {
  const { user, profile, refreshProfile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const rawSteps = (profile as any)?.onboarding_steps as OnboardingSteps | null;
  const steps: OnboardingSteps = { ...DEFAULT_STEPS, ...rawSteps };

  // Auto-detect completed steps from profile data
  const autoComplete: Partial<OnboardingSteps> = {};
  if (profile?.avatar_url && profile?.bio) autoComplete.complete_profile = true;
  if ((profile as any)?.rate_min != null && (profile as any)?.rate_max != null) autoComplete.set_fee_range = true;

  const merged: OnboardingSteps = { ...steps, ...autoComplete };
  const completedCount = Object.values(merged).filter(Boolean).length;
  const totalSteps = STEP_CONFIG.length;
  const allDone = completedCount === totalSteps;

  if (allDone || dismissed) return null;

  const progress = Math.round((completedCount / totalSteps) * 100);

  const handleToggle = async (key: StepKey) => {
    if (!user) return;
    const updated = { ...merged, [key]: !merged[key] };
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_steps: updated } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save progress");
      return;
    }
    await refreshProfile();
  };

  return (
    <div className="rounded-xl bg-card border border-white/[0.06] p-5 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-syne text-base font-semibold mb-0.5">Getting started</h3>
          <p className="text-muted-foreground text-xs">{completedCount} of {totalSteps} complete</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Progress value={progress} className="h-1.5 mb-5 bg-white/[0.06]" />

      <div className="space-y-1">
        {STEP_CONFIG.map(({ key, label, description, icon: Icon }) => {
          const done = merged[key];
          return (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors
                ${done ? "opacity-60" : "hover:bg-white/[0.03]"}`}
            >
              {done ? (
                <CheckCircle className="w-4.5 h-4.5 text-[#3EFFBE] shrink-0" />
              ) : (
                <Circle className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
              )}
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
