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
import { Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Props = {
  venueId: string;
  venueName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed?: () => void;
};

export default function VenueClaimDialog({ venueId, venueName, open, onOpenChange, onClaimed }: Props) {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [proofText, setProofText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">sign in to claim this venue</DialogTitle>
            <DialogDescription className="font-body text-muted-foreground">
              You need an account to claim and manage a venue listing.
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
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    if (!proofText.trim()) {
      toast.error("Please describe how you're connected to this venue");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("venue_claims").insert({
      venue_id: venueId,
      user_id: user.id,
      business_name: businessName.trim(),
      proof_text: proofText.trim(),
      status: "pending",
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Claim submitted! We'll review it and get back to you.");
      onOpenChange(false);
      onClaimed?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-role-venue/10 flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-role-venue" />
          </div>
          <DialogTitle className="font-display lowercase">claim {venueName}</DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            Submit a claim request to manage this venue's listing. We'll review and approve within 24–48 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-body">business name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business or venue name"
              className="mt-1.5 bg-background border-border font-body"
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-sm font-body">how are you connected to this venue?</Label>
            <Textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="e.g. I'm the owner, manager, or booking agent. My name is listed on the venue's website..."
              className="mt-1.5 bg-background border-border font-body min-h-[100px]"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground mt-1 font-body">{proofText.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-body">cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-role-venue text-primary-foreground hover:bg-role-venue/90 font-medium active:scale-[0.97] transition-transform font-body"
          >
            {submitting ? "submitting..." : "submit claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
