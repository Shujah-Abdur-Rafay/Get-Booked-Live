# BookMe.com Style Integration — Lovable Prompts
# Paste these one at a time into your Lovable chat

---

## PROMPT 1 — Replace the entire Landing page
Replace the contents of `src/pages/Landing.tsx` with the new file I'm uploading.

Key changes from the BookMe.com style reference:
- Lowercase hero typography ("the all-in-one booking platform for live music")
- Sticky blurred navbar
- Auto-scrolling profile marquee ("this could be your profile") with 10 sample profiles
- Role switcher tabs (artists / promoters / venues / production / photo & video)
- Tab-based bento feature section (booking & offers / profiles & EPK / payments / tour management / messaging)
- 3-step "how it works" section
- Pricing teaser card
- Clean footer

Keep all existing colors, fonts (Syne + DM Sans), and dark mode aesthetic.

---

## PROMPT 2 — Add marquee animation to index.css
Add this keyframe animation to `src/index.css`:

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

---

## PROMPT 3 — Update the Navbar to match BookMe's minimal style
Update `src/components/Navbar.tsx` so that:
- Nav links use lowercase text ("browse", "pricing", "sign in")
- "Start free" button replaces "Get started"
- The logo uses the same GetBooked.Live styling but slightly smaller (17px → 18px)
- Mobile: hide nav links on small screens, keep sign in + start free
- Keep all existing notification bell and profile menu logic unchanged

---

## PROMPT 4 — Add a "make your profile today" CTA to the directory
In `src/pages/Directory.tsx`, add a banner at the top above the role cards that says:
"make your profile today — get discovered by promoters, venues, and production teams"
with a "get started free →" button linking to /auth?mode=signup

Style it like a subtle pill banner — small text, lime green accent, full width, no heavy border.

---

## PROMPT 5 — BookMe-inspired profile card on ProfilePage
Update `src/pages/ProfilePage.tsx` to look more like a booking page:
- Large header with avatar, name, role, location, verified badge
- "Book now" / "Send offer" as the primary CTA button (lime green, prominent)
- Stats row: bookings, BookScore™, response time, accept rate
- Bio section
- Social links as pill buttons
- Reviews section at the bottom
- Share profile button (copies URL to clipboard)

This is the public-facing page linked from the EPK. It should look like bookme.com profiles — clean, professional, designed to convert a promoter into sending an offer.

---

## PROMPT 6 — Add scroll-fade animation to landing page sections
On the landing page, add a subtle fade-in-up animation to each section as it scrolls into view.
Use the IntersectionObserver API in a useEffect hook.

CSS to add:
```css
.fade-in-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-in-section.visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

## WHAT WAS BORROWED FROM BOOKME.COM

| BookMe element | GetBooked.Live equivalent |
|---|---|
| Lowercase hero heading | "the all-in-one booking platform for live music" |
| "This could be your profile" marquee | Auto-scrolling profile strip with real user cards |
| Industry tabs (creators/freelancers/entrepreneurs) | Role tabs (artists/promoters/venues/production/photo+video) |
| Feature category tabs | booking / profiles / payments / tour / messaging |
| Bento feature cards | 6 feature cards per tab with icon + title + detail |
| Minimal sticky nav | Blur backdrop, lowercase links, start free CTA |
| Clean footer | Logo + 3 links + copyright |

## WHAT STAYS UNIQUE TO GETBOOKED.LIVE

- Dark mode (#080C14 background) — BookMe is light, we stay dark
- Lime green (#C8FF3E) accent — our brand color
- Syne font for headings — more editorial, music-industry feel
- Music industry specifics — "guarantee", "set length", "rider", "BookScore™"
- Tour management module — BookMe has nothing like this
- 5 distinct user roles — BookMe is generic freelancers
