import { useState } from "react";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { Camera, CheckCircle, DollarSign, FolderOpen, Star, Calendar, UserCog } from "lucide-react";
import EditProfilePanel from "@/components/EditProfilePanel";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import TrialBanner from "@/components/TrialBanner";
import SEO from "@/components/SEO";

type CreativeView = "overview" | "portfolio" | "bookings" | "calendar" | "reviews" | "profile";

const ACCENT = "#3EC8FF";

const navItems: NavItem<CreativeView>[] = [
  { title: "overview", value: "overview", icon: Camera },
  { title: "portfolio", value: "portfolio", icon: FolderOpen },
  { title: "bookings", value: "bookings", icon: Camera },
  { title: "calendar", value: "calendar", icon: Calendar },
  { title: "reviews", value: "reviews", icon: Star },
  { title: "edit profile", value: "profile", icon: UserCog },
];

export default function CreativeDashboard() {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<CreativeView>("overview");

  return (
    <SidebarProvider>
      <SEO title="Creative Dashboard | GetBooked.Live" description="Manage your creative services and bookings on GetBooked.Live." />
      <div className="min-h-screen flex w-full bg-[#080C14]">
        <DashboardSidebar items={navItems} activeView={activeView} onViewChange={setActiveView as (v: string) => void} accentColor={ACCENT} roleLabel="photo / video" roleIcon={Camera} displayName={profile?.display_name ?? undefined} />

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
                  <GettingStartedChecklist variant="photo_video" />
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] grid grid-cols-2 lg:grid-cols-4 divide-y divide-white/[0.06] lg:divide-y-0 lg:divide-x lg:divide-white/[0.06]">
                    {[
                      { label: "bookings", value: 0, color: ACCENT },
                      { label: "completed", value: 0, color: "#4ADE80" },
                      { label: "earnings", value: "$0", color: "#C8FF3E" },
                      { label: "avg rating", value: "—", color: "#FFB83E" },
                    ].map((stat) => (
                      <div key={stat.label} className="px-4 py-3.5 sm:py-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="font-display text-base sm:text-lg font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <Camera className="w-5 h-5 mx-auto mb-2" style={{ color: ACCENT }} />
                    <p className="text-xs text-foreground mb-1 font-medium">welcome to your creative hub</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">manage your portfolio, bookings, and availability. when you're hired for photo or video work, everything appears here.</p>
                  </div>
                </>
              )}

              {activeView === "portfolio" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">portfolio</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <FolderOpen className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">upload your best work — photos, videos, and highlights — to attract bookings.</p>
                  </div>
                </>
              )}

              {activeView === "bookings" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">bookings</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <Camera className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">no bookings yet — when you're booked, your jobs will show here.</p>
                  </div>
                </>
              )}

              {activeView === "calendar" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">availability</h2>
                  <AvailabilityCalendar />
                </>
              )}

              {activeView === "reviews" && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">reviews</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-8 text-center">
                    <Star className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">after completing bookings, clients can leave you reviews here.</p>
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
