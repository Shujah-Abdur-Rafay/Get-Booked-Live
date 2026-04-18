import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import logoWhite from "@/assets/logo-white.svg";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <SEO title="Page Not Found | GetBooked.Live" description="The page you are looking for does not exist on GetBooked.Live." />
      <div className="text-center">
        <img src={logoWhite} alt="GetBooked.Live" className="h-5 mx-auto mb-8 opacity-40" loading="lazy" />
        <p className="font-display text-6xl font-bold text-primary mb-3">404</p>
        <h1 className="font-display text-xl font-semibold mb-2">page not found</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto font-body">
          the page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-transform lowercase"
        >
          back to home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
