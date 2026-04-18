import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { calcDeposit, DEPOSIT_RATE_LABEL } from "@/lib/constants";

interface DepositPaymentButtonProps {
  bookingId: string;
  guarantee: number;
  onSuccess?: () => void;
}

export default function DepositPaymentButton({ bookingId, guarantee, onSuccess }: DepositPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  // ── Single source of truth: deposit amount is always DEPOSIT_RATE of guarantee
  const depositAmount = calcDeposit(guarantee);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: { booking_id: bookingId, amount: depositAmount },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        onSuccess?.();
      } else {
        toast.error("Could not create payment session.");
      }
    } catch (err: any) {
      toast.error(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handlePay}
      disabled={loading}
      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
      Pay {DEPOSIT_RATE_LABEL} Deposit (${depositAmount.toLocaleString()})
    </Button>
  );
}
