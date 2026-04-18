import { useNavigate } from "react-router-dom";
import { Instagram, Linkedin } from "lucide-react";
import SEO from "@/components/SEO";

export default function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0A0F1C] overflow-hidden px-6">
      <SEO title="GetBooked.Live" description="A platform connecting artists, promoters, and venues." />

      {/* Logo */}
      <div className="mb-16">
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663474163600/CNVjdejEzeGWRZMX.webp"
          alt="GetBooked"
          className="h-10 w-auto"
        />
      </div>

      {/* Headline */}
      <h1 className="font-syne text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight text-white text-center mb-6 max-w-4xl">
        The Future<br />of Booking<br />
        <span className="text-[#C8FF3E]">Starts Here</span>
      </h1>

      {/* Subheadline */}
      <p className="text-white/50 text-base sm:text-lg max-w-xl text-center mb-12 leading-relaxed">
        A platform connecting artists, promoters, and venues.
      </p>

      {/* CTA */}
      <button
        onClick={() => navigate("/auth?tab=signup")}
        className="h-14 px-10 rounded-full bg-[#C8FF3E] text-black font-syne font-bold text-base hover:brightness-110 active:scale-[0.97] transition-all"
      >
        Get Started
      </button>

      {/* Tagline */}
      <p className="mt-20 text-white/20 text-xs uppercase tracking-[0.2em] font-syne text-center">
        Join the next generation of live booking
      </p>

      {/* Footer */}
      <footer className="absolute bottom-8 left-0 right-0">
        <div className="flex flex-wrap items-center justify-center gap-6 text-white/30 text-xs">
          <a href="https://www.instagram.com/getbooked.live" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors flex items-center gap-1.5">
            <Instagram className="w-3.5 h-3.5" />
            Instagram
          </a>
          <span className="w-px h-3 bg-white/10" />
          <a href="https://www.linkedin.com/company/getbookedlive/" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors flex items-center gap-1.5">
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn
          </a>
          <span className="w-px h-3 bg-white/10" />
          <a
            href="/admin-login"
            className="text-[10px] text-white/10 hover:text-white/30 transition-colors tracking-widest uppercase"
          >
            Admin
          </a>
        </div>
      </footer>
    </div>
  );
}
