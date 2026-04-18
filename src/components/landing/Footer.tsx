import { Link } from "react-router-dom";
import logoColor from "@/assets/logo-color.png";
import { useTranslation } from "react-i18next";

const QUICK_MENU = [
  { label: "Browse", to: "/browse" },
  { label: "For Artists", to: "/artists" },
  { label: "For Promoters", to: "/promoters" },
  { label: "Pricing", to: "/pricing" },
];

const INFO = [
  { label: "Contact", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Sign in", to: "/auth" },
];

const LANG_OPTIONS = ["EN", "ES", "PT"];

export default function Footer() {
  const { i18n } = useTranslation();
  const activeLang = (i18n.language || "en").slice(0, 2).toUpperCase();

  return (
    <footer className="px-4 pt-0 pb-8">
      {/* Top separator */}
      <div className="h-px w-full mb-12" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

      <div className="container mx-auto max-w-4xl">
        {/* Top section */}
        <div className="flex flex-col sm:flex-row justify-between gap-10 mb-12">
          {/* Logo + tagline + support email */}
          <div>
            <img src={logoColor} alt="GetBooked.Live" className="h-5 opacity-80 mb-2" loading="lazy" />
            <p className="text-[13px] text-muted-foreground font-body mb-3">the operating system for live music.</p>
            <a
              href="mailto:hello@getbooked.live"
              className="text-[12px] text-white/40 hover:text-primary transition-colors duration-150 font-body"
            >
              hello@getbooked.live
            </a>
          </div>

          {/* Link columns */}
          <div className="flex gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/25 font-medium mb-4">Quick Menu</p>
              <ul className="space-y-2.5">
                {QUICK_MENU.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[13px] text-white/45 hover:text-primary transition-colors duration-150 font-body">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/25 font-medium mb-4">Information</p>
              <ul className="space-y-2.5">
                {INFO.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[13px] text-white/45 hover:text-primary transition-colors duration-150 font-body">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30 font-body">© {new Date().getFullYear()} GetBooked.Live — All rights reserved</p>
          <div className="flex gap-1">
            {LANG_OPTIONS.map((code) => (
              <button
                key={code}
                onClick={() => i18n.changeLanguage(code.toLowerCase())}
                className={`text-[11px] font-display font-bold px-3 py-1 rounded-full transition-all ${
                  activeLang === code
                    ? "bg-primary text-primary-foreground"
                    : "text-white/40 hover:text-foreground"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
