import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Mic2, Megaphone, Building2, Wrench, Camera, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

const ROLES = [
  { value: "artist",     label: "Artist",     icon: Mic2 },
  { value: "promoter",   label: "Promoter",   icon: Megaphone },
  { value: "venue",      label: "Venue",      icon: Building2 },
  { value: "production", label: "Production", icon: Wrench },
  { value: "photo_video",label: "Creative",   icon: Camera },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SignupModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const reset = () => {
    setEmail(""); setPassword(""); setDisplayName(""); setSelectedRole(""); setShowPw(false); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "signup" && !selectedRole) { toast.error("Please select your role"); return; }
    setLoading(true);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, role: selectedRole },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles")
            .update({ role: selectedRole as any, display_name: displayName })
            .eq("user_id", data.user.id);
        }
        toast.success("Account created! Welcome to GetBooked.");
        handleClose();
        navigate("/welcome");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        handleClose();
      }
    } catch (err: any) {
      const msg = (err.message ?? "Something went wrong") as string;
      if (msg.includes("already registered")) {
        toast.error("Account exists — sign in instead.");
        setTab("signin");
      } else if (msg.includes("Invalid login")) {
        toast.error("Invalid email or password.");
      } else if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many") || (err.status ?? err.code) === 429) {
        toast.error("Too many attempts. Please wait a few minutes and try again.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="bg-[#080C14] border border-white/[0.08] rounded-2xl p-0 max-w-md w-full overflow-hidden">
        <DialogTitle className="sr-only">{tab === "signup" ? "Create account" : "Sign in"}</DialogTitle>

        {/* Tab bar */}
        <div className="flex border-b border-white/[0.08]">
          {(["signup", "signin"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-sm font-display font-bold transition-colors ${
                tab === t
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "signup" ? "Start Free" : "Sign In"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === "signup" && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
          />

          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 pr-11 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {tab === "signup" && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {ROLES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedRole(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-display font-semibold transition-all ${
                    selectedRole === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || (tab === "signup" && !selectedRole)}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {tab === "signup" ? "Creating account…" : "Signing in…"}
              </span>
            ) : tab === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
