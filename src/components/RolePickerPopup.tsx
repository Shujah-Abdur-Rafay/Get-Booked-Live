import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mic2, Megaphone, Building2, Wrench, Camera, X, ArrowRight } from "lucide-react";

const ROLES = [
  {
    value: "artist",
    label: "Artist",
    desc: "Musicians, DJs, bands looking for gigs",
    icon: Mic2,
    color: "border-role-artist/40 hover:border-role-artist text-role-artist bg-role-artist/5 hover:bg-role-artist/10",
    iconBg: "bg-role-artist/10",
  },
  {
    value: "promoter",
    label: "Promoter",
    desc: "Event organizers booking talent",
    icon: Megaphone,
    color: "border-role-promoter/40 hover:border-role-promoter text-role-promoter bg-role-promoter/5 hover:bg-role-promoter/10",
    iconBg: "bg-role-promoter/10",
  },
  {
    value: "venue",
    label: "Venue",
    desc: "Clubs, arenas, and event spaces",
    icon: Building2,
    color: "border-role-venue/40 hover:border-role-venue text-role-venue bg-role-venue/5 hover:bg-role-venue/10",
    iconBg: "bg-role-venue/10",
  },
  {
    value: "production",
    label: "Production",
    desc: "Sound, lighting, and stage crews",
    icon: Wrench,
    color: "border-role-production/40 hover:border-role-production text-role-production bg-role-production/5 hover:bg-role-production/10",
    iconBg: "bg-role-production/10",
  },
  {
    value: "photo_video",
    label: "Creative",
    desc: "Capture and create event content",
    icon: Camera,
    color: "border-role-photo/40 hover:border-role-photo text-role-photo bg-role-photo/5 hover:bg-role-photo/10",
    iconBg: "bg-role-photo/10",
  },
];

export default function RolePickerPopup() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) return; // don't show to logged-in users
    const dismissed = sessionStorage.getItem("role-popup-dismissed");
    if (dismissed) return;
    const timer = setTimeout(() => setOpen(true), 3500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = () => {
    setOpen(false);
    sessionStorage.setItem("role-popup-dismissed", "1");
  };

  const handleSelect = (role: string) => {
    sessionStorage.setItem("role-popup-dismissed", "1");
    navigate(`/auth?tab=signup&role=${role}`);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-[0.95]"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="font-display text-xl font-bold mb-1">What brings you here?</h2>
            <p className="text-sm text-muted-foreground font-body">
              Pick your role to get a tailored experience
            </p>
          </div>

          {/* Role cards */}
          <div className="space-y-2">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.value}
                  onClick={() => handleSelect(role.value)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] ${role.color}`}
                >
                  <div className={`w-9 h-9 rounded-lg ${role.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{role.label}</p>
                    <p className="text-[11px] text-muted-foreground font-body">{role.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground mt-4 font-body">
            Already have an account?{" "}
            <button onClick={() => { handleDismiss(); navigate("/auth?tab=login"); }} className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
