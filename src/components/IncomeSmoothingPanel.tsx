import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Loader2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { toast } from "sonner";

export default function IncomeSmoothingPanel() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [bRes, eRes] = await Promise.all([
        supabase.from("bookings").select("id, guarantee, event_date, venue_name").eq("artist_id", user.id).eq("status", "confirmed").order("event_date"),
        supabase.from("income_smoothing" as any).select("*").eq("artist_id", user.id).maybeSingle(),
      ]);
      setBookings(bRes.data ?? []);
      setEnrollment(eRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalIncome = bookings.reduce((s, b) => s + Number(b.guarantee), 0);
  const feePercent = 1;
  const fee = Math.round(totalIncome * (feePercent / 100));

  // Calculate monthly projections
  const futureBookings = bookings.filter(b => new Date(b.event_date) >= new Date());
  const months = new Map<string, { actual: number; smoothed: number }>();

  futureBookings.forEach(b => {
    const month = new Date(b.event_date).toLocaleString("en", { month: "short", year: "2-digit" });
    const d = months.get(month) || { actual: 0, smoothed: 0 };
    d.actual += Number(b.guarantee);
    months.set(month, d);
  });

  const monthCount = Math.max(months.size, 1);
  const smoothedMonthly = Math.round((totalIncome - fee) / monthCount);

  months.forEach((v, k) => {
    months.set(k, { ...v, smoothed: smoothedMonthly });
  });

  const chartData = Array.from(months.entries()).map(([month, d]) => ({
    month,
    actual: d.actual,
    smoothed: d.smoothed,
  }));

  const toggleSmoothing = async () => {
    if (!user) return;
    setToggling(true);
    const newActive = !enrollment?.is_active;

    if (enrollment) {
      await supabase.from("income_smoothing" as any).update({
        is_active: newActive,
        total_managed_income: totalIncome,
        monthly_payout: smoothedMonthly,
        updated_at: new Date().toISOString(),
      }).eq("artist_id", user.id);
    } else {
      await supabase.from("income_smoothing" as any).insert({
        artist_id: user.id,
        is_active: true,
        total_managed_income: totalIncome,
        monthly_payout: smoothedMonthly,
      });
    }

    setEnrollment((prev: any) => ({ ...prev, is_active: newActive, total_managed_income: totalIncome, monthly_payout: smoothedMonthly }));
    toast.success(newActive ? "Income smoothing activated!" : "Income smoothing paused");
    setToggling(false);
  };

  if (loading) return <div className="h-48 rounded-xl bg-card animate-pulse" />;

  return (
    <div className="rounded-xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-syne font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[hsl(var(--primary))]" />
          Income Smoothing
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">
            {feePercent}% service fee
          </Badge>
          <Switch
            checked={enrollment?.is_active ?? false}
            onCheckedChange={toggleSmoothing}
            disabled={toggling || futureBookings.length === 0}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Instead of irregular lump-sum payments, receive equal monthly payouts. We hold guarantees in escrow and distribute them evenly.
      </p>

      {futureBookings.length === 0 ? (
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming bookings to smooth</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Managed</p>
              <p className="font-syne text-sm font-bold">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Payout</p>
              <p className="font-syne text-sm font-bold text-[hsl(var(--primary))]">${smoothedMonthly.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Service Fee</p>
              <p className="font-syne text-sm font-bold text-[#FF5C5C]">${fee.toLocaleString()}</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Actual vs Smoothed Income</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="actual" fill="#C8FF3E" fillOpacity={0.3} radius={[3, 3, 0, 0]} name="Actual" />
                  <Bar dataKey="smoothed" fill="#3EFFBE" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Smoothed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
