import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Inbox, Calendar, DollarSign, TrendingUp, ArrowRight, MapPin, CheckCircle, XCircle, ArrowRightLeft } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import SEO from "@/components/SEO";

const ACCENT = "#C8FF3E";

const DEMO_OFFERS = [
  { id: "demo-1", venue_name: "The Roxy, Los Angeles", event_date: "2026-04-18", guarantee: 3500, status: "pending", created_at: "2026-03-22" },
  { id: "demo-2", venue_name: "Brooklyn Steel, NYC", event_date: "2026-05-02", guarantee: 5000, status: "pending", created_at: "2026-03-21" },
  { id: "demo-3", venue_name: "Schubas Tavern, Chicago", event_date: "2026-05-15", guarantee: 2000, status: "accepted", created_at: "2026-03-18" },
];

const DEMO_TOUR = [
  { city: "Austin, TX", venue: "Mohawk", date: "2026-06-10", guarantee: 2800 },
  { city: "Dallas, TX", venue: "Trees", date: "2026-06-12", guarantee: 2200 },
  { city: "Houston, TX", venue: "White Oak Music Hall", date: "2026-06-13", guarantee: 3100 },
  { city: "New Orleans, LA", venue: "Tipitina's", date: "2026-06-15", guarantee: 2500 },
];

const DEMO_CHART = [
  { month: "Oct", listeners: 8200 },
  { month: "Nov", listeners: 12400 },
  { month: "Dec", listeners: 15100 },
  { month: "Jan", listeners: 18700 },
  { month: "Feb", listeners: 22300 },
  { month: "Mar", listeners: 27800 },
];

const STATUS_DOT: Record<string, string> = { pending: "bg-yellow-400", accepted: "bg-green-400" };

function demoGuard(msg?: string) {
  toast("Create an account to use this feature", { icon: "🔒" });
}

export default function DemoDashboard() {
  const navigate = useNavigate();
  const [ttl, setTtl] = useState(30 * 60);

  useEffect(() => {
    const isDemo = sessionStorage.getItem("isDemo");
    if (!isDemo) {
      navigate("/");
      return;
    }
    const startTime = parseInt(sessionStorage.getItem("demoStart") || "0", 10);
    if (!startTime) {
      sessionStorage.setItem("demoStart", String(Date.now()));
    }
    const interval = setInterval(() => {
      const start = parseInt(sessionStorage.getItem("demoStart") || "0", 10);
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = 30 * 60 - elapsed;
      if (remaining <= 0) {
        sessionStorage.removeItem("isDemo");
        sessionStorage.removeItem("demoStart");
        toast("Demo session expired");
        navigate("/auth?tab=signup");
      }
      setTtl(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const mins = Math.floor(ttl / 60);
  const secs = ttl % 60;

  return (
    <div className="min-h-screen bg-[#080C14] pt-16">
      <SEO title="Demo Dashboard | GetBooked.Live" description="Explore the GetBooked.Live dashboard with demo data." />
      {/* Demo banner */}
      <div className="sticky top-16 z-40 bg-yellow-500/90 backdrop-blur-sm text-[#080C14] text-center py-2.5 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-semibold">
        <span>🎯 Demo mode — create a free account to save your data ({mins}:{secs.toString().padStart(2, "0")} remaining)</span>
        <Link to="/auth?tab=signup">
          <Button size="sm" className="h-7 text-[11px] bg-[#080C14] text-white hover:bg-[#080C14]/80">
            Sign up free <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Welcome to your dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what your artist dashboard looks like with real data.</p>
        </div>

        {/* Stats */}
        <div className="rounded-lg border border-white/[0.06] bg-card divide-x divide-white/[0.06] grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: "pending", value: "2", color: "#FBBF24", icon: Inbox },
            { label: "confirmed", value: "1", color: "#4ADE80", icon: CheckCircle },
            { label: "revenue", value: "$10,500", color: ACCENT, icon: DollarSign },
            { label: "next show", value: "Apr 18", color: "#FFB83E", icon: Calendar },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-3.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="font-display text-lg font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Offers */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">incoming offers</h2>
          <div className="space-y-1.5">
            {DEMO_OFFERS.map((offer) => (
              <div key={offer.id} className="rounded-lg border border-white/[0.06] bg-card hover:border-white/[0.12] transition-colors">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[offer.status]}`} />
                  <span className="font-display text-sm font-semibold lowercase truncate flex-1">{offer.venue_name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">{offer.status}</span>
                  <span className="font-display text-sm font-bold tabular-nums shrink-0" style={{ color: ACCENT }}>${offer.guarantee.toLocaleString()}</span>
                </div>
                {offer.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-1.5 px-4 pb-3 pt-1 border-t border-white/[0.04]">
                    <Button size="sm" onClick={() => demoGuard()} className="h-8 sm:h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white active:scale-[0.97] w-full sm:w-auto">
                      <CheckCircle className="w-3 h-3 mr-1" /> accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => demoGuard()} className="h-8 sm:h-7 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 active:scale-[0.97] w-full sm:w-auto">
                      <ArrowRightLeft className="w-3 h-3 mr-1" /> counter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => demoGuard()} className="h-8 sm:h-7 text-[11px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 active:scale-[0.97] w-full sm:w-auto">
                      <XCircle className="w-3 h-3 mr-1" /> decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tour */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">upcoming tour — texas run</h2>
          <div className="rounded-lg border border-white/[0.06] bg-card overflow-hidden">
            {DEMO_TOUR.map((stop, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04] last:border-b-0">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold lowercase truncate">{stop.venue}</p>
                  <p className="text-[11px] text-muted-foreground">{stop.city} · {new Date(stop.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <span className="text-sm font-display font-bold tabular-nums" style={{ color: ACCENT }}>${stop.guarantee.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics chart */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">monthly listeners</h2>
          <div className="rounded-lg border border-white/[0.06] bg-card p-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={DEMO_CHART}>
                <defs>
                  <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8892A4" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8892A4" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "#0E1420", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "#8892A4" }}
                  formatter={(v: number) => [v.toLocaleString(), "Listeners"]}
                />
                <Area type="monotone" dataKey="listeners" stroke={ACCENT} fill="url(#demoGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-6">
          <Link to="/auth?tab=signup">
            <Button className="h-11 px-8 text-sm font-semibold bg-primary text-primary-foreground active:scale-[0.97]">
              Create your free account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
