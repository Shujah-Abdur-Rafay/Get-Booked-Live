import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, MapPin, ArrowRight } from "lucide-react";

const FAKE_ARTISTS = [
  { name: "Marcus Rivera", genre: "Hip-Hop", city: "Atlanta, GA" },
  { name: "The Velvet Pines", genre: "Indie Folk", city: "Nashville, TN" },
  { name: "Jade Moreno", genre: "R&B / Soul", city: "Los Angeles, CA" },
  { name: "Broken Frequency", genre: "Electronic", city: "Chicago, IL" },
  { name: "Calliope Strings", genre: "Classical Crossover", city: "Austin, TX" },
  { name: "Dex Hollow", genre: "Country", city: "Memphis, TN" },
];

export default function LockedDirectoryPreview() {
  return (
    <section className="fade-in-section py-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-display text-2xl sm:text-4xl font-bold text-center mb-3 lowercase tracking-tight">
          browse talent & venues
        </h2>
        <p className="text-muted-foreground text-center text-sm mb-12 max-w-md mx-auto font-body">
          discover artists, production crews, photographers, and venues across every market.
        </p>

        <div className="relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 select-none" style={{ filter: "blur(6px)" }} aria-hidden="true">
            {FAKE_ARTISTS.map((a, i) => (
              <div key={i} className="rounded-xl bg-card border border-border p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-display font-bold text-sm text-primary shrink-0">
                    {a.name[0]}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm">{a.name}</h3>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded mt-1 bg-primary/10 text-primary border border-primary/20">
                      Artist
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-body mb-2">
                  Performing artist with a unique sound and growing fanbase across regional venues.
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
                  <MapPin className="w-3 h-3" /> {a.city}
                  <span className="ml-2 text-foreground/60">{a.genre}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-md px-8 py-8 text-center max-w-sm mx-4 shadow-[0_0_60px_-12px_hsl(var(--primary)/0.15)]">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <p className="font-display font-bold text-base mb-1.5 lowercase">pro members only</p>
              <p className="text-xs text-muted-foreground font-body mb-6 leading-relaxed">
                upgrade to browse and contact 4,000+ verified artists, venues, and crews.
              </p>
              <Link to="/pricing">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-display font-semibold active:scale-[0.96] transition-transform lowercase h-11 px-7">
                  unlock the directory <ArrowRight className="ml-2 w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
