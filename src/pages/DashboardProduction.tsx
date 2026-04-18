import { useState } from "react";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { Wrench, CheckCircle, DollarSign, Users, Calendar, FileText, UserCog } from "lucide-react";
import EditProfilePanel from "@/components/EditProfilePanel";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import TrialBanner from "@/components/TrialBanner";
import SEO from "@/components/SEO";

type ProductionView = "overview" | "gigs" | "crew" | "calendar" | "documents" | "profile";

const ACCENT = "#7B5CF0";

const navItems: NavItem<ProductionView>[] = [
  { title: "overview", value: "overview", icon: Wrench },
  { title: "gigs", value: "gigs", icon: Wrench },
  { title: "crew", value: "crew", icon: Users },
  { title: "calendar", value: "calendar", icon: Calendar },
  { title: "documents", value: "documents", icon: FileText },
  { title: "edit profile", value: "profile", icon: UserCog },
];

export default function ProductionDashboard() {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<ProductionView>("overview");

  return (
    <SidebarProvider>
      <SEO title="Production Dashboard | GetBooked.Live" description="Manage your production services and bookings on GetBooked.Live." />
      <div className="min-h-screen flex w-full bg-[#080C14]">
        <DashboardSidebar items={navItems} activeView={activeView} onViewChange={setActiveView as (v: string) => void} accentColor={ACCENT} roleLabel="production" roleIcon={Wrench} displayName={profile?.display_name ?? undefined} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6 pt-14">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="text-[11px] text-muted-foreground lowercase">{activeView === "overview" ? "dashboard" : activeView}</span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-5">

              <DashboardOnboarding />
              {activeView === "overview" && (
                <>
                  <TrialBanner />
                  <GettingStartedChecklist variant="production" />
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] grid grid-cols-2 lg:grid-cols-4 divide-y divide-white/[0.06] lg:divide-y-0 lg:divide-x lg:divide-white/[0.06]">
                    {[
                      { label: "active gigs", value: 0, color: ACCENT },
                      { label: "completed", value: 0, color: "#4ADE80" },
                      { label: "earnings", value: "$0", color: "#C8FF3E" },
                      { label: "crew size", value: "—", color: "#FFB83E" },
                    ].map((stat) => (
                      <div key={stat.label} className="px-4 py-3.5 sm:py-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="font-display text-base sm:text-lg font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <Wrench className="w-5 h-5 mx-auto mb-2" style={{ color: ACCENT }} />
                    <p className="text-xs text-foreground mb-1 font-medium">welcome to your production hub</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">manage gigs, crew, and availability. when you're booked for production work, everything shows up here.</p>
                  </div>
                </>
              )}

              {activeView === "gigs" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">gigs</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <Wrench className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">no gigs yet — when you're booked, they'll appear here.</p>
                  </div>
                </>
              )}

              {activeView === "crew" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">crew management</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">no crew members added — manage assignments across gigs and tours.</p>
                  </div>
                </>
              )}

              {activeView === "calendar" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">availability</h2>
                  <AvailabilityCalendar />
                </>
              )}

              {activeView === "documents" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">documents</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">contracts, riders, and tech specs for your gigs will appear here.</p>
                  </div>
                </>
              )}

              {activeView === "profile" && <EditProfilePanel />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
