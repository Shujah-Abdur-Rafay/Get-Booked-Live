import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  bookingId: string;
  guarantee: number;
};

const PLANS = [
  { id: "full", label: "Pay in full", installments: 1, rate: 0, description: "No fees" },
  { id: "3month", label: "3 monthly payments", installments: 3, rate: 3.5, description: "3.5% financing fee" },
  { id: "6month", label: "6 monthly payments", installments: 6, rate: 6, description: "6% financing fee" },
];

export default function FinancingOption({ bookingId, guarantee }: Props) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("full");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const totalWithFee = guarantee * (1 + plan.rate / 100);
  const monthlyPayment = plan.installments > 1 ? Math.ceil(totalWithFee / plan.installments) : guarantee;

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("booking_financing" as any).insert({
      booking_id: bookingId,
      promoter_id: user.id,
      plan_type: selectedPlan,
      total_amount: totalWithFee,
      monthly_payment: monthlyPayment,
      installments: plan.installments,
      interest_rate: plan.rate,
      status: "active",
    });

    if (error) {
      toast.error(error.message);
    } else {
      setConfirmed(true);
      toast.success("Payment plan confirmed!");
    }
    setLoading(false);
  };

  if (confirmed) {
    return (
      <div className="rounded-xl border border-[#3EFFBE]/20 bg-[#3EFFBE]/5 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-[#3EFFBE] shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#3EFFBE]">Payment plan confirmed</p>
          <p className="text-xs text-muted-foreground">
            {plan.installments === 1 ? "Paying in full" : `${plan.installments} payments of $${monthlyPayment.toLocaleString()}/mo`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-[hsl(var(--primary))]" />
        <h4 className="text-sm font-semibold font-syne">Finance this booking</h4>
      </div>

      <div className="space-y-2">
        {PLANS.map(p => {
          const total = guarantee * (1 + p.rate / 100);
          const monthly = p.installments > 1 ? Math.ceil(total / p.installments) : guarantee;

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`w-full rounded-lg border p-3 text-left transition-all active:scale-[0.98] ${
                selectedPlan === p.id
                  ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/5"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.description}</p>
                </div>
                <div className="text-right">
                  {p.installments > 1 ? (
                    <>
                      <p className="font-syne text-sm font-bold">${monthly.toLocaleString()}/mo</p>
                      <p className="text-[10px] text-muted-foreground">Total: ${Math.round(total).toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="font-syne text-sm font-bold">${guarantee.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground">
        Artist receives full payment upfront. Financing provided by partner lenders.
      </div>

      <Button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
        Confirm Payment Plan
      </Button>
    </div>
  );
}
