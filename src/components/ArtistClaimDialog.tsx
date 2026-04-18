import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Shield, ArrowRight, Music } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Props = {
  artistListingId: string;
  artistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed?: () => void;
};

export default function ArtistClaimDialog({ artistListingId, artistName, open, onOpenChange, onClaimed }: Props) {
  const { user } = useAuth();
  const [managerName, setManagerName] = useState("");
  const [proofText, setProofText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">sign in to claim this profile</DialogTitle>
            <DialogDescription className="font-body text-muted-foreground">
              You need an account to claim and manage an artist profile.
            </DialogDescription>
          </DialogHeader>
          <Link to="/auth?tab=signup">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium active:scale-[0.97] transition-transform">
              get started free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async () => {
    if (!proofText.trim()) {
      toast.error("Please provide proof of identity");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("artist_claims").insert({
        artist_listing_id: artistListingId,
        user_id: user.id,
        manager_name: managerName.trim() || null,
        proof_text: proofText.trim(),
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already submitted a claim for this artist");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        return;
      }

      toast.success("Claim submitted! We'll review it shortly.");
      onOpenChange(false);
      onClaimed?.();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-5 h-5 text-primary" />
            <DialogTitle className="font-display text-lg">claim {artistName}</DialogTitle>
          </div>
          <DialogDescription className="font-body text-muted-foreground text-sm">
            Are you {artistName} or their manager? Submit proof and we'll verify your claim within 48 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Manager / representative name (optional)
            </Label>
            <Input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="e.g. Jane Rivera, Artist Manager"
              className="bg-background border-border"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Proof of identity <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Link to your official website, social media handle, or any proof that you are this artist or their authorized representative."
              rows={4}
              className="bg-background border-border resize-none"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once approved, this listing will be linked to your GetBooked profile. You'll be able to receive offers, manage bookings, and control your public page.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border active:scale-[0.97] transition-transform"
          >
            cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !proofText.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform"
          >
            {submitting ? "submitting…" : "submit claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
