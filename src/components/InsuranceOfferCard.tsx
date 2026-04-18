import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  bookingId: string;
  guarantee: number;
  userRole: "artist" | "promoter";
};

export default function InsuranceOfferCard({ bookingId, guarantee, userRole }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const premium = Math.max(89, Math.round(guarantee * 0.02));
  const coverageAmount = userRole === "artist" ? guarantee * 1.15 : guarantee * 0.5;
  const coverageType = userRole === "artist" ? "artist_cancellation" : "promoter_cancellation";

  const handlePurchase = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("booking_insurance" as any).insert({
      booking_id: bookingId,
      policy_type: "cancellation",
      coverage_type: coverageType,
      premium,
      coverage_amount: coverageAmount,
      status: "active",
      purchased_by: user.id,
      purchased_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      setPurchased(true);
      toast.success("Insurance purchased! Policy details will be emailed.");
    }
    setLoading(false);
  };

  if (purchased) {
    return (
      <div className="rounded-xl border border-[#3EFFBE]/20 bg-[#3EFFBE]/5 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-[#3EFFBE] shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#3EFFBE]">Booking insured</p>
          <p className="text-xs text-muted-foreground">Coverage: ${coverageAmount.toLocaleString()} · Premium: ${premium}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#FFB83E]/20 bg-[#FFB83E]/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#FFB83E] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Protect this booking — cancellation insurance from ${premium}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {userRole === "artist"
              ? `Artist coverage: Full guarantee + travel costs ($${coverageAmount.toLocaleString()}) if promoter cancels`
              : `Promoter coverage: Deposit protection ($${coverageAmount.toLocaleString()}) if artist cancels`}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          size="sm"
          onClick={handlePurchase}
          disabled={loading}
          className="bg-[#FFB83E] text-[#080C14] hover:bg-[#FFB83E]/90 active:scale-[0.97] transition-transform"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
          Get Covered — ${premium}
        </Button>
        <Badge variant="outline" className="text-[10px] border-[#FFB83E]/20 text-[#FFB83E] self-center">
          Powered by industry insurers
        </Badge>
      </div>
    </div>
  );
}
