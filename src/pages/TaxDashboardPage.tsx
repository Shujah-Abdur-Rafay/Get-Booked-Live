import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, parseISO, getQuarter, getYear, getMonth } from "date-fns";
import { DollarSign, Download, FileText, Loader2, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";

interface BookingWithOffer {
  id: string;
  event_date: string;
  venue_name: string;
  guarantee: number;
  offer: {
    commission_rate: number;
    commission_amount: number | null;
  } | null;
}

interface MonthRow {
  month: number;
  year: number;
  label: string;
  gross: number;
  fees: number;
  net: number;
  count: number;
}

interface QuarterSummary {
  quarter: number;
  year: number;
  label: string;
  gross: number;
  fees: number;
  net: number;
}

export default function TaxDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const years = useMemo(() => {
    const yrs = [...new Set(bookings.map((b) => getYear(parseISO(b.event_date))))];
    yrs.sort((a, b) => b - a);
    return yrs.length > 0 ? yrs : [new Date().getFullYear()];
  }, [bookings]);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (profile && profile.role !== "artist") {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, event_date, venue_name, guarantee, offer_id")
        .eq("artist_id", user.id)
        .eq("status", "confirmed")
        .order("event_date", { ascending: true });

      if (error) {
        toast.error("Failed to load bookings");
        setLoading(false);
        return;
      }

      // Fetch related offers for commission info
      const offerIds = (data || []).map((b) => b.offer_id).filter(Boolean);
      let offerMap: Record<string, { commission_rate: number; commission_amount: number | null }> = {};

      if (offerIds.length > 0) {
        const { data: offers } = await supabase
          .from("offers")
          .select("id, commission_rate, commission_amount")
          .in("id", offerIds);

        for (const o of offers || []) {
          offerMap[o.id] = { commission_rate: Number(o.commission_rate), commission_amount: o.commission_amount ? Number(o.commission_amount) : null };
        }
      }

      setBookings(
        (data || []).map((b) => ({
          ...b,
          guarantee: Number(b.guarantee),
          offer: offerMap[b.offer_id] ?? null,
        }))
      );
      setLoading(false);
    };
    fetchBookings();
  }, [user]);

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const yearBookings = useMemo(
    () => bookings.filter((b) => getYear(parseISO(b.event_date)) === selectedYear),
    [bookings, selectedYear]
  );

  const monthRows: MonthRow[] = useMemo(() => {
    const map = new Map<string, MonthRow>();
    for (const b of yearBookings) {
      const d = parseISO(b.event_date);
      const m = getMonth(d);
      const key = `${selectedYear}-${m}`;
      if (!map.has(key)) {
        map.set(key, {
          month: m,
          year: selectedYear,
          label: format(d, "MMMM"),
          gross: 0,
          fees: 0,
          net: 0,
          count: 0,
        });
      }
      const row = map.get(key)!;
      const fee = b.offer?.commission_amount ?? Math.round(b.guarantee * (b.offer?.commission_rate ?? 0.20));
      row.gross += b.guarantee;
      row.fees += fee;
      row.net += b.guarantee - fee;
      row.count++;
    }
    return [...map.values()].sort((a, b) => a.month - b.month);
  }, [yearBookings, selectedYear]);

  const quarterSummaries: QuarterSummary[] = useMemo(() => {
    const qMap = new Map<number, QuarterSummary>();
    for (const b of yearBookings) {
      const d = parseISO(b.event_date);
      const q = getQuarter(d);
      if (!qMap.has(q)) {
        qMap.set(q, { quarter: q, year: selectedYear, label: `Q${q}`, gross: 0, fees: 0, net: 0 });
      }
      const qs = qMap.get(q)!;
      const fee = b.offer?.commission_amount ?? Math.round(b.guarantee * (b.offer?.commission_rate ?? 0.20));
      qs.gross += b.guarantee;
      qs.fees += fee;
      qs.net += b.guarantee - fee;
    }
    return [...qMap.values()].sort((a, b) => a.quarter - b.quarter);
  }, [yearBookings, selectedYear]);

  const totals = useMemo(() => {
    return monthRows.reduce(
      (acc, r) => ({ gross: acc.gross + r.gross, fees: acc.fees + r.fees, net: acc.net + r.net, count: acc.count + r.count }),
      { gross: 0, fees: 0, net: 0, count: 0 }
    );
  }, [monthRows]);

  const handleDownloadPDF = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tax-report", {
        body: { year: selectedYear },
      });
      if (error) throw error;

      // data should be a base64 PDF
      if (data?.pdf) {
        const binary = atob(data.pdf);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GetBooked_Tax_Summary_${selectedYear}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Tax report downloaded");
      } else {
        throw new Error("No PDF data returned");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setDownloading(false);
    }
  };

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
      <SEO title="Tax Dashboard | GetBooked.Live" description="Track your earnings and generate tax reports for your bookings." />
        <Loader2 className="w-6 h-6 animate-spin text-[#C8FF3E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-syne text-2xl font-bold text-[#F0F2F7]">Tax Summary</h1>
              <p className="text-sm text-[#8892A4]">Your booking income and platform fees at a glance.</p>
            </div>
            {/* Tax Ready badge */}
            {totals.count > 0 && (
              <div className="flex items-center gap-1.5 bg-[#3EFFBE]/10 border border-[#3EFFBE]/20 text-[#3EFFBE] text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Tax Ready
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-28 bg-[#0E1420] border-white/[0.06] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading || totals.count === 0}
              className="bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 text-sm h-9 active:scale-[0.97] transition-transform"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Download PDF
            </Button>
          </div>
        </div>

        {/* Top-level stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard icon={DollarSign} label="Gross Income" value={fmt(totals.gross)} color="#F0F2F7" />
          <StatCard icon={FileText} label="Platform Fees (Deductible)" value={fmt(totals.fees)} color="#FF5C5C" />
          <StatCard icon={TrendingUp} label="Net Income" value={fmt(totals.net)} color="#3EFFBE" />
        </div>

        {/* Quarterly breakdown */}
        {quarterSummaries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {quarterSummaries.map((q) => (
              <div key={q.quarter} className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-4">
                <div className="text-[10px] uppercase tracking-wider text-[#5A6478] mb-1">{q.label} {q.year}</div>
                <div className="font-syne font-bold text-lg text-[#F0F2F7]">{fmt(q.net)}</div>
                <div className="text-[11px] text-[#8892A4] mt-0.5">
                  {fmt(q.gross)} gross · {fmt(q.fees)} fees
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monthly table */}
        {monthRows.length > 0 ? (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#5A6478] font-semibold">Month</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-[#5A6478] font-semibold">Shows</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-[#5A6478] font-semibold">Gross</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-[#5A6478] font-semibold">Fees</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-[#5A6478] font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((r) => (
                    <tr key={r.month} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#F0F2F7]">{r.label}</td>
                      <td className="px-4 py-3 text-right text-[#8892A4]">{r.count}</td>
                      <td className="px-4 py-3 text-right text-[#F0F2F7] font-mono">{fmt(r.gross)}</td>
                      <td className="px-4 py-3 text-right text-[#FF5C5C] font-mono">{fmt(r.fees)}</td>
                      <td className="px-4 py-3 text-right text-[#3EFFBE] font-mono font-semibold">{fmt(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.08]">
                    <td className="px-4 py-3 font-bold text-[#F0F2F7]">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-[#8892A4]">{totals.count}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#F0F2F7] font-mono">{fmt(totals.gross)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#FF5C5C] font-mono">{fmt(totals.fees)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#3EFFBE] font-mono">{fmt(totals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-12 text-center">
            <Calendar className="w-8 h-8 text-[#5A6478] mx-auto mb-3" />
            <p className="text-[#8892A4] text-sm">No confirmed bookings for {selectedYear}.</p>
            <p className="text-[#5A6478] text-xs mt-1">Complete bookings will appear here for tax tracking.</p>
          </div>
        )}

        {/* Share link */}
        {totals.count > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied — share with your accountant");
              }}
              className="text-xs text-[#8892A4] hover:text-[#C8FF3E] transition-colors underline underline-offset-2"
            >
              Share with accountant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#0E1420] border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider text-[#5A6478] font-semibold">{label}</span>
      </div>
      <div className="font-syne font-bold text-xl" style={{ color }}>{value}</div>
    </div>
  );
}
