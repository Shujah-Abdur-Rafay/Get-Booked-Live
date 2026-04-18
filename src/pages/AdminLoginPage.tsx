import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in and verified admin, go straight to admin panel
  useEffect(() => {
    if (!user) return;
    supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) navigate("/admin", { replace: true });
      });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError("Invalid credentials.");
        return;
      }

      // Verify the logged-in user has an admin_users row
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!adminRow) {
        await supabase.auth.signOut();
        setError("Access denied.");
        return;
      }

      navigate("/admin", { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4">
      {/* No Navbar, no links, no escape — completely isolated */}
      <div className="w-full max-w-sm">

        {/* Lock icon header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
            Admin Access
          </h1>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="username"
              className="w-full h-11 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full h-11 px-4 pr-11 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full h-11 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-foreground text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* No footer links, no back button, no way to reach the main app */}
      </div>
    </div>
  );
}
