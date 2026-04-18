import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * LaunchGate — pre-launch site lock.
 *
 * Rules:
 * - All non-admin visitors are redirected to /coming-soon.
 * - Allowed public routes: /coming-soon, /auth, /admin-login, /reset-password
 * - Admins (isAdmin === true) can access every route.
 * - Hidden bypass: visiting any route with ?admin=true stores a flag in
 *   sessionStorage so the user can reach /auth to log in as admin.
 */

const ALWAYS_ALLOWED = ["/coming-soon", "/admin-login", "/auth", "/reset-password"];
const BYPASS_KEY = "gb_admin_bypass";

export default function LaunchGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const { pathname, search } = useLocation();

  // Check for ?admin=true bypass and persist it for the session
  const params = new URLSearchParams(search);
  if (params.get("admin") === "true") {
    try { sessionStorage.setItem(BYPASS_KEY, "1"); } catch {}
  }

  const hasBypass = (() => {
    try { return sessionStorage.getItem(BYPASS_KEY) === "1"; } catch { return false; }
  })();

  // Wait for auth to resolve so we don't flash-redirect admins
  if (loading) return null;

  // Admins bypass the gate entirely
  if (isAdmin) return <>{children}</>;

  // If user activated the hidden bypass, allow /auth so they can log in
  if (hasBypass && ALWAYS_ALLOWED.includes(pathname)) return <>{children}</>;

  // Everyone else: only the allowed routes are accessible
  if (ALWAYS_ALLOWED.includes(pathname)) return <>{children}</>;

  // Any other path → redirect to coming soon
  return <Navigate to="/coming-soon" replace />;
}
