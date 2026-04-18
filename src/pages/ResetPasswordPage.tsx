import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-4 pt-20">
      <SEO title="Reset Password | GetBooked.Live" description="Reset your GetBooked.Live account password." />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-[#C8FF3E]" />
          </div>
          <h1 className="font-display font-bold text-xl mb-1 text-foreground">Set new password</h1>
          <p className="text-muted-foreground text-sm">Enter your new password below.</p>
        </div>

        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-[#3EFFBE] mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">Password updated!</p>
              <p className="text-xs text-muted-foreground mt-1">Signing you in...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-sm">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  autoComplete="new-password"
                  minLength={6}
                  className="mt-1.5 bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-sm">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  autoComplete="new-password"
                  minLength={6}
                  className="mt-1.5 bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 font-medium h-11 active:scale-[0.97] transition-transform"
              >
                {loading ? "Updating..." : "Update password"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
