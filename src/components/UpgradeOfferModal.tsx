import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, X } from "lucide-react";

interface UpgradeOfferModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradeOfferModal({ open, onClose }: UpgradeOfferModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl bg-card border border-border p-6 sm:p-8 max-w-md w-full text-center z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--role-venue))]/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-6 h-6 text-[hsl(var(--role-venue))]" />
        </div>

        <h3 className="font-display text-lg font-bold mb-2 lowercase">
          upgrade to send offers
        </h3>
        <p className="text-sm text-muted-foreground font-body mb-6">
          pro members can send unlimited offers to any artist, venue, or crew on the platform. free plan: 5 outbound offers per month, limited to artists only.
        </p>

        <div className="flex flex-col gap-2">
          <Link to="/pricing">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11 active:scale-[0.97] transition-transform lowercase">
              upgrade to pro <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button variant="outline" onClick={onClose} className="w-full border-border text-muted-foreground hover:text-foreground h-11 active:scale-[0.97] transition-transform lowercase">
            cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
