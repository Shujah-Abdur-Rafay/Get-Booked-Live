/**
 * PressSection — "As seen in / press mentions" strip.
 *
 * Currently shows placeholder outlet names styled as a credibility bar.
 * Replace the `pressItems` array with real outlet names + URLs once coverage lands.
 * The section is always visible (unlike TestimonialsSection which hides when empty),
 * so it signals seriousness from day one.
 */

const pressItems = [
  { name: "Hypebot", url: "https://www.hypebot.com", label: "Music industry news" },
  { name: "Music Connection", url: "https://www.musicconnection.com", label: "Industry magazine" },
  { name: "DJ Mag", url: "https://djmag.com", label: "Electronic music" },
  { name: "Pollstar", url: "https://www.pollstar.com", label: "Concert industry" },
  { name: "Billboard", url: "https://www.billboard.com", label: "Music charts & news" },
];

export default function PressSection() {
  return (
    <section className="fade-in-section py-10 sm:py-14 px-4 border-t border-white/[0.04]">
      <div className="container mx-auto max-w-4xl">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground/50 font-body mb-8">
          press &amp; media
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {pressItems.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.name} — ${item.label}`}
              className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-200 font-display font-bold text-base sm:text-lg tracking-tight select-none"
            >
              {item.name}
            </a>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground/30 font-body mt-8">
          Press enquiries:{" "}
          <a href="mailto:press@getbooked.live" className="underline underline-offset-2 hover:text-muted-foreground/60 transition-colors">
            press@getbooked.live
          </a>
        </p>
      </div>
    </section>
  );
}
