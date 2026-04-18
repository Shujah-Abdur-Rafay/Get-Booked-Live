import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallBanner from "@/components/InstallBanner";
import LaunchGate from "@/components/LaunchGate";
import AuthPage from "@/pages/AuthPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import AdminPage from "@/pages/AdminPage";
import AdminLoginPage from "@/pages/AdminLoginPage";

// ── PUBLIC PAGES ──
const HomePage = lazy(() => import("@/pages/HomePage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
// DirectoryPage removed — /directory and /venues now redirect to /browse
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage"));
const ArtistDirectoryPage = lazy(() => import("@/pages/ArtistDirectoryPage"));
const PresalePage = lazy(() => import("@/pages/PresalePage"));
const DemoDashboardPage = lazy(() => import("@/pages/DemoDashboardPage"));
const TrendingPage = lazy(() => import("@/pages/TrendingPage"));
const BrowsePage = lazy(() => import("@/pages/BrowsePage"));
const ForArtistsPage = lazy(() => import("@/pages/ForArtistsPage"));
const ForPromotersPage = lazy(() => import("@/pages/ForPromotersPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));

// ── PROTECTED PAGES ──
const WelcomePage = lazy(() => import("@/pages/WelcomePage"));
const ProfileSetupPage = lazy(() => import("@/pages/ProfileSetupPage"));
const DashboardArtist = lazy(() => import("@/pages/DashboardArtist"));
const DashboardPromoter = lazy(() => import("@/pages/DashboardPromoter"));
const DashboardVenue = lazy(() => import("@/pages/DashboardVenue"));
const DashboardCrew = lazy(() => import("@/pages/DashboardCrew"));
const DashboardProduction = lazy(() => import("@/pages/DashboardProduction"));
const DashboardCreative = lazy(() => import("@/pages/DashboardCreative"));
const OfferFlowPage = lazy(() => import("@/pages/OfferFlowPage"));
const TourManagementPage = lazy(() => import("@/pages/TourManagementPage"));
const PipelinePage = lazy(() => import("@/pages/PipelinePage"));
const TaxDashboardPage = lazy(() => import("@/pages/TaxDashboardPage"));
const InsightsPage = lazy(() => import("@/pages/InsightsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));

// ── ADMIN PAGES ──
const AdminClaimsPage = lazy(() => import("@/pages/AdminClaimsPage"));

// ── CATCH-ALL ──
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" aria-busy="true">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
    </div>
  );
}

/** Renders the correct dashboard based on user role */
function DashboardRouter() {
  const { profile, isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  switch (profile?.role) {
    case "promoter": return <DashboardPromoter />;
    case "venue": return <DashboardVenue />;
    case "production": return <DashboardProduction />;
    case "photo_video": return <DashboardCreative />;
    default: return <DashboardArtist />;
  }
}

function AnimatedRoutes() {
  return (
    <Routes>
        {/* ── COMING SOON — gate: / and /coming-soon both render the gate page ── */}
        <Route path="/" element={<ComingSoonPage />} />
        <Route path="/coming-soon" element={<ComingSoonPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/artists" element={<ForArtistsPage />} />
        <Route path="/promoters" element={<ForPromotersPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/directory" element={<Navigate to="/browse" replace />} />
        <Route path="/venues" element={<Navigate to="/browse" replace />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/p/:slug" element={<PublicProfilePage />} />
        <Route path="/artist/:slug" element={<ArtistDirectoryPage />} />
        <Route path="/presale/:bookingId" element={<PresalePage />} />
        <Route path="/demo-dashboard" element={<DemoDashboardPage />} />

        {/* ── PROTECTED ROUTES ── */}
        <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
        <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
        <Route path="/profile/me" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
        {/* Legacy role-specific dashboard routes → redirect to unified /dashboard */}
        <Route path="/artist-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/promoter-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/venue-manage" element={<Navigate to="/dashboard" replace />} />
        <Route path="/production-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/creative-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/offer" element={<ProtectedRoute><OfferFlowPage /></ProtectedRoute>} />
        <Route path="/tours" element={<ProtectedRoute><TourManagementPage /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
        <Route path="/tax" element={<ProtectedRoute><TaxDashboardPage /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/review/:bookingId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />

        {/* ── ADMIN ROUTES ── */}
        {/* Isolated admin login — no navbar, no signup, no links to main app */}
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/claims" element={<ProtectedRoute><AdminClaimsPage /></ProtectedRoute>} />

        {/* ── CATCH-ALL ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
  );
}

function AppLayout() {
  const location = useLocation();
  const isComingSoon = location.pathname === "/coming-soon" || location.pathname === "/";
  const isAdminLogin = location.pathname === "/admin-login";

  return (
    <>
      {!isComingSoon && !isAdminLogin && (
        <>
          <a href="#main-content" className="skip-to-main">Skip to main content</a>
          <Navbar />
        </>
      )}
      <main id="main-content" className={isComingSoon ? "" : "overflow-x-hidden max-w-[100vw]"}>
        <Suspense fallback={<RouteLoadingFallback />}>
            <AnimatedRoutes />
        </Suspense>
      </main>
      {!isComingSoon && !isAdminLogin && <InstallBanner />}
      {/* Screen reader live region for toast announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="toast-announcer" />
      <Toaster />
      <Sonner />
      <HotToaster position="bottom-right" toastOptions={{ duration: 3500, style: { background: '#0E1420', color: '#F0F2F7', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' }, success: { iconTheme: { primary: '#C8FF3E', secondary: '#080C14' } } }} containerStyle={{}} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppLayout />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
