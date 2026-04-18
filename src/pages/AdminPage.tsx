import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LayoutDashboard, Users, Send, CalendarCheck, Map, DollarSign, Shield, Settings, CreditCard, TrendingUp, Sparkles } from "lucide-react";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminOffers from "@/components/admin/AdminOffers";
import AdminBookings from "@/components/admin/AdminBookings";
import AdminTours from "@/components/admin/AdminTours";
import AdminRevenue from "@/components/admin/AdminRevenue";
import AdminBilling from "@/components/admin/AdminBilling";
import AdminGrowth from "@/components/admin/AdminGrowth";
import AdminModeration from "@/components/admin/AdminModeration";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminAIMonitor from "@/components/admin/AdminAIMonitor";
import AdminPayouts from "@/components/admin/AdminPayouts";
import SEO from "@/components/SEO";

const NAV_ITEMS = [
  { key: "overview", label: "overview", icon: LayoutDashboard },
  { key: "users", label: "users", icon: Users },
  { key: "offers", label: "offers", icon: Send },
  { key: "bookings", label: "bookings", icon: CalendarCheck },
  { key: "tours", label: "tours", icon: Map },
  { key: "revenue", label: "revenue", icon: DollarSign },
  { key: "payouts", label: "payouts", icon: DollarSign },
  { key: "ai", label: "ai monitor", icon: Sparkles },
  { key: "billing", label: "billing", icon: CreditCard },
  { key: "growth", label: "growth", icon: TrendingUp },
  { key: "moderation", label: "moderation", icon: Shield },
  { key: "settings", label: "settings", icon: Settings },
];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }

    const check = async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) { navigate("/dashboard", { replace: true }); return; }
      setIsAdmin(true);
    };
    check();
  }, [user, loading, navigate]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center pt-14">
      <SEO title="Admin Panel | GetBooked.Live" description="Manage the GetBooked.Live platform." />
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] pt-14 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/[0.06] bg-[#0E1420] flex flex-col py-6 px-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="flex items-center gap-2 px-3 mb-6">
          <Shield className="w-4 h-4 text-[#C8FF3E]" />
          <span className="font-syne font-bold text-sm text-[#F0F2F7] lowercase">admin panel</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => {
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-display lowercase transition-all active:scale-[0.97] ${
                  active
                    ? "bg-[#C8FF3E]/10 text-[#C8FF3E] font-semibold"
                    : "text-[#8892A4] hover:text-[#F0F2F7] hover:bg-white/[0.04]"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeView === "overview" && <AdminOverview />}
        {activeView === "users" && <AdminUsers />}
        {activeView === "offers" && <AdminOffers />}
        {activeView === "bookings" && <AdminBookings />}
        {activeView === "tours" && <AdminTours />}
        {activeView === "revenue" && <AdminRevenue />}
        {activeView === "payouts" && <AdminPayouts />}
        {activeView === "ai" && <AdminAIMonitor />}
        {activeView === "billing" && <AdminBilling />}
        {activeView === "growth" && <AdminGrowth />}
        {activeView === "moderation" && <AdminModeration />}
        {activeView === "settings" && <AdminSettings />}
      </main>
    </div>
  );
}
