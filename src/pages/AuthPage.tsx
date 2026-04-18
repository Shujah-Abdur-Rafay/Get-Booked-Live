import { useState, useEffect } from "react";

import SEO from "@/components/SEO";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Mic2, Megaphone, Building2, Wrench, Camera } from "lucide-react";
import toast from "react-hot-toast";
import logoBlack from "@/assets/logo-black.png";

const ROLES = [
  { value: "artist", label: "Artist", icon: Mic2, accent: "text-primary-foreground border-primary-foreground/30 bg-primary-foreground/10", tagline: "Get booked. Get paid. Tour smarter." },
  { value: "promoter", label: "Promoter", icon: Megaphone, accent: "text-primary-foreground border-primary-foreground/30 bg-primary-foreground/10", tagline: "Find talent. Fill rooms. Build your brand." },
  { value: "venue", label: "Venue", icon: Building2, accent: "text-primary-foreground border-primary-foreground/30 bg-primary-foreground/10", tagline: "List your space. Book artists. Sell out shows." },
  { value: "production", label: "Production", icon: Wrench, accent: "text-primary-foreground border-primary-foreground/30 bg-primary-foreground/10", tagline: "Crew up. Get hired. Run the show." },
  { value: "photo_video", label: "Creative", icon: Camera, accent: "text-primary-foreground border-primary-foreground/30 bg-primary-foreground/10", tagline: "Capture moments. Build your reel. Get booked." },
];

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get("role") || "";
  const [isSignUp, setIsSignUp] = useState(searchParams.get("tab") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState(presetRole);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Social login role picker: shown when a social-login user has no role set yet
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [socialRoleLoading, setSocialRoleLoading] = useState(false);
  const [pendingSocialRole, setPendingSocialRole] = useState("");

  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // After any login, check if the user needs to pick a role (social login gap)
  useEffect(() => {
    if (!user) return;
    if (!profile) return;
    // Admin users bypass onboarding entirely — go straight to the admin panel
    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }
    // If the profile has no role yet (social login gap), show the role picker
    if (!profile.role) {
      setShowRolePicker(true);
      return;
    }
    navigate("/welcome");
  }, [user, profile, isAdmin, navigate]);

  useEffect(() => { if (presetRole) { setSelectedRole(presetRole); setIsSignUp(true); } }, [presetRole]);

  const activeRoleInfo = ROLES.find((r) => r.value === selectedRole);
  const ActiveIcon = activeRoleInfo?.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!selectedRole) { toast.error("Please select your role"); setLoading(false); return; }

        // FIX: Embed role + display_name in the signUp metadata so the
        // handle_new_user trigger can read them immediately. This eliminates
        // the race condition where a subsequent UPDATE would run before the
        // trigger had finished inserting the profile row.
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              role: selectedRole,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Belt-and-suspenders: if the user session is immediately available
        // (email confirmation disabled), also write the role directly.
        // This is a no-op if the trigger already handled it.
        if (signUpData.user) {
          await supabase
            .from("profiles")
            .update({ role: selectedRole as any, display_name: displayName })
            .eq("user_id", signUpData.user.id);
        }

        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        // Redirect is handled by the useEffect above once profile loads
        // (admin → /admin, regular user → /welcome or /dashboard)
      }
    } catch (err: any) {
      const msg = (err.message ?? "Something went wrong") as string;
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        toast.error("An account with this email already exists. Try signing in instead.");
      } else if (msg.includes("Invalid login")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many") || (err.status ?? err.code) === 429) {
        toast.error("Too many attempts. Please wait a few minutes and try again.");
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast.error("Enter your email"); return; }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setResetLoading(false);
    }
  };

  // Called when a social-login user picks their role from the modal
  const handleSocialRoleConfirm = async () => {
    if (!pendingSocialRole) { toast.error("Please select your role"); return; }
    if (!user) return;
    setSocialRoleLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: pendingSocialRole as any })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      setShowRolePicker(false);
      // isAdmin is re-evaluated after refreshProfile
      navigate(isAdmin ? "/admin" : "/welcome");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save your role. Please try again.");
    } finally {
      setSocialRoleLoading(false);
    }
  };

  // Social login role picker modal — shown when a social user has no role
  if (showRolePicker) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4 pt-20 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoBlack} alt="GetBooked.Live" className="h-6 mx-auto mb-4 opacity-90" loading="lazy" />
            <h1 className="font-display font-bold text-xl mb-1 lowercase text-foreground">one more thing</h1>
            <p className="text-muted-foreground text-sm font-body">what best describes you?</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7 space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const selected = pendingSocialRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPendingSocialRole(role.value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-display font-medium transition-all active:scale-[0.96] flex items-center gap-2 lowercase ${
                      selected
                        ? "border-[#C8FF3E]/40 bg-[#C8FF3E]/10 text-[#C8FF3E]"
                        : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.15]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {role.label.toLowerCase()}
                  </button>
                );
              })}
            </div>
            {pendingSocialRole && (
              <p className="text-xs text-muted-foreground text-center">
                {ROLES.find(r => r.value === pendingSocialRole)?.tagline}
              </p>
            )}
            <Button
              onClick={handleSocialRoleConfirm}
              disabled={socialRoleLoading || !pendingSocialRole}
              className="w-full font-display font-semibold h-11 lowercase bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90"
            >
              {socialRoleLoading ? "saving..." : "continue"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password mode
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4 pt-20 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoBlack} alt="GetBooked.Live" className="h-6 mx-auto mb-4 opacity-90" loading="lazy" />
            <h1 className="font-display font-bold text-xl mb-1 lowercase text-foreground">reset your password</h1>
            <p className="text-muted-foreground text-sm font-body">we'll send you a link to get back in</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7">
            {resetSent ? (
              <div className="rounded-lg bg-[#3EFFBE]/10 border border-[#3EFFBE]/20 p-4 text-center">
                <p className="text-sm text-[#3EFFBE] font-medium">
                  Check your inbox — we sent a reset link to <span className="font-semibold">{resetEmail}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-sm font-display font-medium lowercase text-muted-foreground">
                    enter your account email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    aria-required="true"
                    autoComplete="email"
                    className="mt-2 bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-[#C8FF3E]/30"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full font-display font-semibold h-11 lowercase bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90"
                >
                  {resetLoading ? "sending..." : "send reset link"}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            )}

            <div className="mt-5 text-center">
              <button
                onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4 pt-20 pb-12">
      <SEO
        title="Sign Up or Sign In — GetBooked.Live"
        description="Join the fastest-growing music booking marketplace. Free to join. First booking in minutes."
        canonical="https://getbooked.live/auth"
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {isSignUp && activeRoleInfo && ActiveIcon ? (
            <>
              <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center bg-white/[0.06]">
                <ActiveIcon className="w-6 h-6 text-[#C8FF3E]" />
              </div>
              <h1 className="font-display font-bold text-xl mb-1.5 lowercase text-foreground">
                sign up as <span className="text-[#C8FF3E]">{activeRoleInfo.label.toLowerCase()}</span>
              </h1>
              <p className="text-muted-foreground text-sm font-body">{activeRoleInfo.tagline}</p>
            </>
          ) : (
            <>
              <img src={logoBlack} alt="GetBooked.Live" className="h-6 mx-auto mb-4 opacity-90" loading="lazy" />
              <h1 className="font-display font-bold text-xl mb-1 lowercase text-foreground">
                {isSignUp ? "create your account" : "welcome back"}
              </h1>
              <p className="text-muted-foreground text-sm font-body">
                {isSignUp ? "join the live music operating system" : "sign in to your account"}
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="name" className="text-sm font-display font-medium lowercase text-muted-foreground">display name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name or artist name" required aria-required="true" autoComplete="name" className="mt-2 bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-[#C8FF3E]/30" />
                </div>
                <div>
                  <Label className="text-sm font-display font-medium lowercase mb-2.5 block text-muted-foreground" id="role-label">I am a...</Label>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="role-label">
                    {ROLES.map((role) => {
                      const Icon = role.icon;
                      const selected = selectedRole === role.value;
                      return (
                        <button
                          key={role.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSelectedRole(role.value)}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-display font-medium transition-all active:scale-[0.96] flex items-center gap-2 lowercase ${
                            selected
                              ? "border-[#C8FF3E]/40 bg-[#C8FF3E]/10 text-[#C8FF3E]"
                              : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.15]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          {role.label.toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email" className="text-sm font-display font-medium lowercase text-muted-foreground">email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required aria-required="true" autoComplete="email" className="mt-2 bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-[#C8FF3E]/30" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-display font-medium lowercase text-muted-foreground">password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required aria-required="true" minLength={6} autoComplete={isSignUp ? "new-password" : "current-password"} className="mt-2 bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-[#C8FF3E]/30" />
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 float-right font-display"
                >
                  forgot password?
                </button>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full font-display font-semibold h-11 lowercase bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90">
              {loading ? "loading..." : isSignUp ? "create account" : "sign in"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-transparent px-3 text-muted-foreground font-body">or continue with</span></div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 font-display font-medium lowercase border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (error) toast.error(error.message ?? "Google sign-in failed");
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 font-display font-medium lowercase border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                if (error) toast.error(error.message ?? "Apple sign-in failed");
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              apple
            </Button>
          </div>

          <div className="mt-5 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
