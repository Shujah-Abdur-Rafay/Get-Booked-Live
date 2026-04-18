import { MapPin, Star } from "lucide-react";

const SAMPLE_PROFILES = [
  { name: "Maya Chen", role: "artist", genre: "R&B / Neo-Soul", city: "Los Angeles, CA", rating: 4.9, draw: "800–1,200" },
  { name: "DJ Koda", role: "artist", genre: "Electronic", city: "Miami, FL", rating: 4.8, draw: "600–900" },
  { name: "The Velvet Union", role: "artist", genre: "Indie Rock", city: "Brooklyn, NY", rating: 4.7, draw: "400–700" },
  { name: "Prism Events", role: "promoter", genre: "EDM / Hip-Hop", city: "Atlanta, GA", rating: 4.9 },
  { name: "The Monarch", role: "venue", genre: "Capacity: 800", city: "Austin, TX", rating: 4.6 },
  { name: "SoundCraft Audio", role: "production", genre: "Full Production", city: "Nashville, TN", rating: 5.0 },
  { name: "Lens & Light Co", role: "photo_video", genre: "Live + Promo", city: "Portland, OR", rating: 4.8 },
  { name: "Arlo Washington", role: "artist", genre: "Jazz / Funk", city: "Chicago, IL", rating: 4.7, draw: "500–900" },
  { name: "NightOwl Presents", role: "promoter", genre: "Club / Festival", city: "Denver, CO", rating: 4.5 },
  { name: "The Glass House", role: "venue", genre: "Capacity: 1,200", city: "Phoenix, AZ", rating: 4.8 },
];

const roleColor: Record<string, string> = {
  artist: "bg-primary/15 text-primary border-primary/20",
  promoter: "bg-role-promoter/15 text-role-promoter border-role-promoter/20",
  venue: "bg-role-venue/15 text-role-venue border-role-venue/20",
  production: "bg-role-production/15 text-role-production border-role-production/20",
  photo_video: "bg-role-photo/15 text-role-photo border-role-photo/20",
};

const roleLabel: Record<string, string> = {
  artist: "artist",
  promoter: "promoter",
  venue: "venue",
  production: "production",
  photo_video: "creative",
};

const roleBg: Record<string, string> = {
  artist: "bg-primary/[0.08]",
  promoter: "bg-role-promoter/[0.08]",
  venue: "bg-role-venue/[0.08]",
  production: "bg-role-production/[0.08]",
  photo_video: "bg-role-photo/[0.08]",
};

export default function ProfileMarquee() {
  return (
    <section className="py-12 overflow-hidden">
      <p className="text-center text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-8 font-display font-medium">
        this could be your profile
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-marquee hover:[animation-play-state:paused]" style={{ width: "max-content" }}>
          {[...SAMPLE_PROFILES, ...SAMPLE_PROFILES].map((p, i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-60 mx-2 rounded-xl border border-border p-4 hover:border-primary/20 transition-all duration-300 ${roleBg[p.role]}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-display font-bold text-sm text-foreground">
                  {p.name[0]}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-display font-semibold truncate">{p.name}</h4>
                  <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded border ${roleColor[p.role]}`}>
                    {roleLabel[p.role]}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-body mb-2">{p.genre}</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-body">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>
                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-role-venue fill-role-venue/30" />{p.rating}</span>
              </div>
              {p.draw && (
                <p className="text-[10px] text-primary/80 mt-2 font-display font-medium">avg draw: {p.draw}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
