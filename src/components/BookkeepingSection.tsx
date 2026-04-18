import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, TrendingUp, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import TaxReportButton from "@/components/TaxReportButton";
import IncomeSmoothingPanel from "@/components/IncomeSmoothingPanel";

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  booking_id: string | null;
  tour_stop_id: string | null;
};

type BookingIncome = {
  id: string;
  venue_name: string;
  event_date: string;
  guarantee: number;
};

type TourStop = {
  id: string;
  venue_name: string;
  date: string;
  city: string | null;
};

const EXPENSE_CATEGORIES = [
  { value: "travel_flight", label: "Flights", irs: "Travel" },
  { value: "travel_ground", label: "Ground Transport", irs: "Travel" },
  { value: "lodging", label: "Hotels", irs: "Business Travel" },
  { value: "crew_fees", label: "Crew Fees", irs: "Contract Labor" },
  { value: "equipment", label: "Equipment Rental", irs: "Rent/Lease" },
  { value: "meals", label: "Meals & Entertainment", irs: "Meals (50%)" },
  { value: "marketing", label: "Marketing", irs: "Advertising" },
  { value: "insurance", label: "Insurance", irs: "Insurance" },
  { value: "misc", label: "Other", irs: "Other Expenses" },
];

export default function BookkeepingSection() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<BookingIncome[]>([]);
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [expRes, incRes, stopsRes] = await Promise.all([
        supabase.from("artist_expenses").select("*").eq("user_id", user.id).order("expense_date", { ascending: false }).limit(200),
        supabase.from("bookings").select("id, venue_name, event_date, guarantee").eq("artist_id", user.id).eq("status", "confirmed").order("event_date", { ascending: false }).limit(200),
        supabase.from("tour_stops").select("id, venue_name, date, city").order("date", { ascending: false }).limit(200),
      ]);
      setExpenses((expRes.data as Expense[]) ?? []);
      setIncome((incRes.data as BookingIncome[]) ?? []);
      setTourStops((stopsRes.data as TourStop[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const addExpense = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("artist_expenses").insert({
      user_id: user.id,
      amount: 0,
      category: "misc",
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setExpenses([data as Expense, ...expenses]);
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    await supabase.from("artist_expenses").update(updates as any).eq("id", id);
    setExpenses(expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("artist_expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const totalIncome = income.reduce((s, b) => s + Number(b.guarantee), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  // Monthly P&L
  const monthlyData = new Map<string, { income: number; expenses: number }>();
  income.forEach((b) => {
    const month = new Date(b.event_date).toLocaleString("en", { month: "short", year: "2-digit" });
    const d = monthlyData.get(month) || { income: 0, expenses: 0 };
    d.income += Number(b.guarantee);
    monthlyData.set(month, d);
  });
  expenses.forEach((e) => {
    const month = new Date(e.expense_date).toLocaleString("en", { month: "short", year: "2-digit" });
    const d = monthlyData.get(month) || { income: 0, expenses: 0 };
    d.expenses += Number(e.amount);
    monthlyData.set(month, d);
  });
  const chartData = Array.from(monthlyData.entries()).map(([month, d]) => ({
    month,
    income: d.income,
    expenses: d.expenses,
    profit: d.income - d.expenses,
  })).reverse().slice(-6);

  // Per-show profits
  const showProfits = income.map((b) => {
    const showExpenses = expenses.filter((e) => e.booking_id === b.id).reduce((s, e) => s + Number(e.amount), 0);
    return { venue: b.venue_name, date: b.event_date, profit: Number(b.guarantee) - showExpenses, guarantee: Number(b.guarantee), expenses: showExpenses, margin: Number(b.guarantee) > 0 ? Math.round(((Number(b.guarantee) - showExpenses) / Number(b.guarantee)) * 100) : 0 };
  });
  const mostProfitable = showProfits.length > 0 ? showProfits.sort((a, b) => b.profit - a.profit)[0] : null;
  const avgExpensePerShow = income.length > 0 ? Math.round(totalExpenses / income.length) : 0;

  // IRS category summary
  const irsSummary = new Map<string, number>();
  expenses.forEach(e => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category);
    const irs = cat?.irs || "Other";
    irsSummary.set(irs, (irsSummary.get(irs) || 0) + Number(e.amount));
  });

  if (loading) return <div className="h-48 rounded-xl bg-card animate-pulse" />;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Income</p>
          <p className="font-syne text-lg font-bold text-[hsl(var(--primary))]">${totalIncome.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="font-syne text-lg font-bold text-[#FF5C5C]">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Net Profit</p>
          <p className={`font-syne text-lg font-bold ${netProfit >= 0 ? "text-[#3EFFBE]" : "text-[#FF5C5C]"}`}>${netProfit.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Break-even</p>
          <p className="font-syne text-lg font-bold">${avgExpensePerShow.toLocaleString()}</p>
        </div>
      </div>

      {/* Insights */}
      {mostProfitable && (
        <div className="rounded-xl bg-card border border-[hsl(var(--primary))]/20 p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-[hsl(var(--primary))] shrink-0" />
          <div>
            <p className="text-xs font-medium">Most Profitable Show</p>
            <p className="text-xs text-muted-foreground">
              {mostProfitable.venue} — ${mostProfitable.profit.toLocaleString()} profit ({mostProfitable.margin}% margin) on ${mostProfitable.guarantee.toLocaleString()} guarantee
            </p>
          </div>
        </div>
      )}

      {/* Monthly P&L Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-semibold text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[hsl(var(--primary))]" /> Monthly P&L
            </h3>
            <TaxReportButton />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="income" fill="#C8FF3E" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#FF5C5C" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* IRS Category Summary */}
      {irsSummary.size > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="font-syne font-semibold text-sm mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[hsl(var(--primary))]" /> IRS Schedule C Categories
          </h3>
          <div className="space-y-1.5">
            {Array.from(irsSummary.entries()).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{cat}</span>
                <span className="font-medium tabular-nums">${amt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-show profit margins */}
      {showProfits.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="font-syne font-semibold text-sm mb-3">Per-Show Profit Margins</h3>
          <div className="space-y-1.5">
            {showProfits.slice(0, 10).map((s, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground truncate max-w-[45%]">{s.venue} ({new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" })})</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${s.margin >= 50 ? "border-[#3EFFBE]/20 text-[#3EFFBE]" : s.margin >= 0 ? "border-[#FFB83E]/20 text-[#FFB83E]" : "border-[#FF5C5C]/20 text-[#FF5C5C]"}`}>
                    {s.margin}% margin
                  </Badge>
                  <span className={`font-medium tabular-nums ${s.profit >= 0 ? "text-[#3EFFBE]" : "text-[#FF5C5C]"}`}>${s.profit.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income Smoothing */}
      <IncomeSmoothingPanel />

      {/* Expenses List */}
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-syne font-semibold text-sm">Expenses</h3>
          <Button size="sm" onClick={addExpense} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Expense
          </Button>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 20).map((exp) => (
              <div key={exp.id} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Category</Label>
                  <select
                    value={exp.category}
                    onChange={(e) => updateExpense(exp.id, { category: e.target.value })}
                    className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  >
                    {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.irs})</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] text-muted-foreground">Description</Label>
                  <Input value={exp.description} onChange={(e) => updateExpense(exp.id, { description: e.target.value })} className="mt-0.5 h-8 text-xs bg-background border-border" placeholder="What was this for?" maxLength={200} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Amount</Label>
                  <Input type="number" min="0" value={exp.amount} onChange={(e) => updateExpense(exp.id, { amount: parseFloat(e.target.value) || 0 })} className="mt-0.5 h-8 text-xs bg-background border-border" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Tour Stop</Label>
                  <select
                    value={exp.tour_stop_id || ""}
                    onChange={(e) => updateExpense(exp.id, { tour_stop_id: e.target.value || null } as any)}
                    className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  >
                    <option value="">None</option>
                    {tourStops.map(s => <option key={s.id} value={s.id}>{s.venue_name} ({s.city || s.date})</option>)}
                  </select>
                </div>
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Date</Label>
                    <Input type="date" value={exp.expense_date} onChange={(e) => updateExpense(exp.id, { expense_date: e.target.value })} className="mt-0.5 h-8 text-xs bg-background border-border" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive h-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
