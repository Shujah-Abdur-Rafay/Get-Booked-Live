import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import SignupModal from "@/components/SignupModal";
import { Button } from "@/components/ui/button";
import {
  Menu, X, Bell, Globe, ShieldCheck, Settings, Calendar,
  Plus, Copy, Check, HelpCircle, LogOut, User, CreditCard,
  ArrowLeft,
} from "lucide-react";
const logoColor = "/logo-color.png";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

// ─── Language options ─────────────────────────────────
const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

// ─── Role‑specific link configs ───────────────────────
type NavItem = { label: string; to: string; icon?: React.ReactNode };

const LOGGED_OUT_LINKS: NavItem[] = [
  { label: "Browse", to: "/browse" },
  { label: "Pricing", to: "/pricing" },
  { label: "For Artists", to: "/artists" },
  { label: "For Promoters", to: "/promoters" },
];

const ARTIST_LINKS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse", to: "/browse" },
  { label: "My Tours", to: "/tours" },
  { label: "My Profile", to: "/profile/me" },
];

const PROMOTER_LINKS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse Artists", to: "/browse" },
  { label: "My Offers", to: "/pipeline" },
  { label: "My Events", to: "/dashboard" },
];

const VENUE_LINKS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse Talent", to: "/browse" },
  { label: "Calendar", to: "/dashboard" },
  { label: "My Venue", to: "/profile/me" },
];

const PRODUCTION_LINKS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse Events", to: "/browse" },
  { label: "My Gigs", to: "/dashboard" },
];

const CREATIVE_LINKS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse Events", to: "/browse" },
  { label: "My Bookings", to: "/dashboard" },
  { label: "Portfolio", to: "/profile/me" },
];

const ADMIN_LINKS: NavItem[] = [
  { label: "Overview", to: "/admin" },
  { label: "Users", to: "/admin" },
  { label: "Bookings", to: "/admin" },
  { label: "Revenue", to: "/admin" },
  { label: "Disputes", to: "/admin" },
];

function getLinksForRole(role: string | null | undefined, isAdmin: boolean): NavItem[] {
  if (isAdmin) return ADMIN_LINKS;
  switch (role) {
    case "artist": return ARTIST_LINKS;
    case "promoter": return PROMOTER_LINKS;
    case "venue": return VENUE_LINKS;
    case "production": return PRODUCTION_LINKS;
    case "photo_video": return CREATIVE_LINKS;
    default: return ARTIST_LINKS;
  }
}

// ─── Main Navbar ──────────────────────────────────────
export default function Navbar() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [signupOpen, setSignupOpen] = useState(false);
  const { t, i18n } = useTranslation();

  // Close mobile menu on route change or resize
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // ── Notification unread count + realtime ────────────
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const interval = window.setInterval(fetchUnread, 15000);
    return () => { window.clearInterval(interval); };
  }, [user]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const role = profile?.role;
  const links = user ? getLinksForRole(role, isAdmin) : LOGGED_OUT_LINKS;
  const logoHref = user ? "/dashboard" : "/";

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      {/* ── Fixed navbar ─────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-background/95 backdrop-blur-2xl border-b border-white/[0.06]"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-full px-4 md:px-8 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link to={logoHref} className="flex items-center shrink-0" onClick={closeMenu}>
            <img src={logoColor} alt="GetBooked.Live" className="h-[22px]" width={140} height={22} fetchPriority="high" />
          </Link>

          {/* ── Desktop center links ─────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`text-[13px] font-body px-3 py-1.5 rounded-full transition-colors ${
                  isActive(link.to)
                    ? "bg-[rgba(200,255,62,0.08)] text-[#C8FF3E]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Desktop right side ───────────────────── */}
          <div className="hidden md:flex items-center gap-2">
            {/* Admin‑specific extras */}
            {user && isAdmin && (
              <>
                <button
                  onClick={() => navigate("/settings")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50"
                  aria-label="Platform settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <Link
                  to="/dashboard"
                  className="text-[12px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-full hover:bg-secondary/50"
                >
                  <ArrowLeft className="w-3 h-3" />
                  back to app
                </Link>
              </>
            )}

            {/* Promoter: + New Offer button */}
            {user && role === "promoter" && !isAdmin && (
              <Link to="/browse">
                <button className="flex items-center gap-1.5 bg-[#FF5C8A] text-white text-[12px] font-display font-bold rounded-full px-4 py-1.5 hover:bg-[#FF5C8A]/90 active:scale-[0.96] transition-all">
                  <Plus className="w-3.5 h-3.5" />
                  new offer
                </button>
              </Link>
            )}

            {/* Language selector (logged out only) */}
            {!user && (
              <LanguageSelector currentLang={i18n.language} onChange={(l) => i18n.changeLanguage(l)} />
            )}

            {/* Admin login icon (logged out) */}
            {!user && (
              <Link
                to="/auth?admin=true"
                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50"
                aria-label="Admin login"
                title="Admin login"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
            )}

            {user ? (
              <>
                {/* Avatar dropdown */}
                <ProfileDropdown
                  profile={profile}
                  isAdmin={isAdmin}
                  onSignOut={async () => { await signOut(); navigate("/"); }}
                />
              </>
            ) : (
              <>
                <Link to="/auth" className="text-[13px] font-body text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                  {t("nav.signIn")}
                </Link>
                {!location.pathname.startsWith("/auth") && (
                  <button
                    onClick={() => setSignupOpen(true)}
                    className="bg-primary text-primary-foreground font-display font-bold text-[13px] rounded-full px-5 py-2 hover:bg-primary/90 active:scale-[0.96] transition-all"
                  >
                    {t("nav.startFree")}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Mobile right ─────────────────────────── */}
          <div className="flex md:hidden items-center gap-1">
            <button
              className="text-foreground p-2 active:scale-[0.95] transition-transform"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile overlay (tap outside to close) ──── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile full-width dropdown ───────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed top-[60px] left-0 right-0 z-50 md:hidden border-b border-white/[0.08]"
            style={{ background: "rgba(8,12,20,0.98)", backdropFilter: "blur(20px)" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <nav className="flex flex-col px-4 py-3 max-h-[calc(100svh-60px)] overflow-y-auto">
              {links.map((link) => (
                <MobileLink key={link.label} to={link.to} active={isActive(link.to)} onClick={closeMenu}>
                  {link.label}
                </MobileLink>
              ))}

              {/* Promoter: + New Offer in mobile */}
              {user && role === "promoter" && !isAdmin && (
                <>
                  <div className="border-t border-white/[0.06] my-3" />
                  <Link to="/browse" onClick={closeMenu}>
                    <button className="w-full flex items-center justify-center gap-1.5 bg-[#FF5C8A] text-white text-[13px] font-display font-bold rounded-full h-[52px] hover:bg-[#FF5C8A]/90 active:scale-[0.96] transition-all">
                      <Plus className="w-3.5 h-3.5" />
                      new offer
                    </button>
                  </Link>
                </>
              )}

              {/* Admin: back to app in mobile */}
              {user && isAdmin && (
                <>
                  <div className="border-t border-white/[0.06] my-3" />
                  <MobileLink to="/dashboard" active={false} onClick={closeMenu}>
                    <ArrowLeft className="w-3.5 h-3.5 inline mr-1.5" />
                    back to app
                  </MobileLink>
                </>
              )}

              <div className="border-t border-white/[0.06] my-3" />

              {user ? (
                <>
                  <MobileLink to="/settings" active={isActive("/settings")} onClick={closeMenu}>
                    Settings
                  </MobileLink>
                  <div className="px-3 py-2">
                    <LanguageSelector currentLang={i18n.language} onChange={(l) => i18n.changeLanguage(l)} />
                  </div>
                  <button
                    className="w-full text-left h-[52px] px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-[0.97] font-body"
                    onClick={() => { signOut(); navigate("/"); closeMenu(); }}
                  >
                    {t("nav.signOut")}
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-2">
                    <LanguageSelector currentLang={i18n.language} onChange={(l) => i18n.changeLanguage(l)} />
                  </div>
                  <Link to="/auth?admin=true" onClick={closeMenu}>
                    <span className="flex items-center h-[52px] px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      Admin login
                    </span>
                  </Link>
                  <Link to="/auth" onClick={closeMenu}>
                    <Button variant="outline" className="w-full text-sm h-[52px] font-body mt-1">
                      {t("nav.signIn")}
                    </Button>
                  </Link>
                  {!location.pathname.startsWith("/auth") && (
                    <button
                      onClick={() => { closeMenu(); setSignupOpen(true); }}
                      className="mt-2 w-full bg-primary text-primary-foreground font-display font-bold text-[13px] rounded-full h-[52px] hover:bg-primary/90 active:scale-[0.96] transition-all"
                    >
                      {t("nav.startFree")}
                    </button>
                  )}
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} />
    </>
  );
}

// ─── Sub‑components ───────────────────────────────────

function MobileLink({ to, active, onClick, children }: { to: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`h-[52px] px-4 rounded-lg text-sm font-body font-medium transition-colors active:scale-[0.97] flex items-center ${
        active
          ? "bg-[rgba(200,255,62,0.08)] text-[#C8FF3E]"
          : "text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </Link>
  );
}

function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50"
      aria-label={`View notifications${count > 0 ? `, ${count} unread` : ""}`}
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#FF5C8A] text-white text-[10px] font-bold flex items-center justify-center px-1" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

function ProfileDropdown({
  profile,
  isAdmin,
  onSignOut,
}: {
  profile: any;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const slug = profile?.slug;

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/${slug ?? "profile"}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 active:scale-[0.96] transition-transform" aria-label="Account menu">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 hover:border-white/20 transition-colors flex items-center justify-center bg-secondary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" width={32} height={32} />
            ) : (
              <span className="text-xs font-display font-bold text-foreground">
                {(profile?.display_name ?? "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          {isAdmin && (
            <span className="text-[10px] font-display font-bold bg-[#7B5CF0]/20 text-[#7B5CF0] border border-[#7B5CF0]/30 rounded-full px-2 py-0.5">
              Admin
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem onClick={() => navigate(`/${slug ?? "profile/me"}`)}>
          <User className="w-3.5 h-3.5 mr-2" />
          View my profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="w-3.5 h-3.5 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? <Check className="w-3.5 h-3.5 mr-2 text-[#C8FF3E]" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
          {copied ? "Copied!" : "Copy smart link"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings#subscription")}>
          <CreditCard className="w-3.5 h-3.5 mr-2" />
          Subscription
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/admin")} className="text-[#7B5CF0] focus:text-[#7B5CF0]">
              <ShieldCheck className="w-3.5 h-3.5 mr-2" />
              Admin Panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/help")}>
          <HelpCircle className="w-3.5 h-3.5 mr-2" />
          Help
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageSelector({ currentLang, onChange }: { currentLang: string; onChange: (lang: string) => void }) {
  const current = LANGS.find((l) => currentLang.startsWith(l.code)) ?? LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-[0.97]" aria-label={`Select language, currently ${current.label}`}>
          <Globe className="w-3.5 h-3.5" aria-hidden="true" />
          <span aria-hidden="true">{current.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => onChange(l.code)}
            className={currentLang.startsWith(l.code) ? "bg-accent" : ""}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
