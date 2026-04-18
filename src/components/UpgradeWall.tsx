import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import logoWhite from "@/assets/logo-white.svg";
import { useAuth } from "@/contexts/AuthContext";

export default function UpgradeWall() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="max-w-md w-full text-center">
        <img src={logoWhite} alt="GetBooked.Live" className="h-5 mx-auto mb-8 opacity-60" loading="lazy" />

        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--role-venue))]/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-[hsl(var(--role-venue))]" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3 lowercase">
          directory access is a pro feature
        </h1>
        <p className="text-muted-foreground text-sm font-body mb-8 max-w-sm mx-auto">
          search and contact 4,000+ artists, venues, production crews, and photographers — upgrade to unlock
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link to="/pricing">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-12 active:scale-[0.97] transition-transform lowercase">
              upgrade to pro — from $23/mo <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          {!user && (
            <Link to="/auth">
              <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground h-12 active:scale-[0.97] transition-transform lowercase">
                sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
