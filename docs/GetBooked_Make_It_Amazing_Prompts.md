# GetBooked.Live — The "Make It Amazing" Prompt Pack
# These go AFTER the 12 Score Improvement prompts
# Organised by category — do Phase A first, then B, then C
# Each prompt is self-contained — paste directly into Lovable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE A — FOUNDATION (do these before anything else)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────
A1 — COMPLETE 404 PAGE
─────────────────────────────────────────────────────
Create a custom 404 Not Found page at src/pages/NotFound.tsx.

Design: dark background (#080C14), centered layout. Show the GetBooked.Live logo at the top. Large "404" in Syne font at 96px in #C8FF3E. Below it: "this page doesn't exist" in white 24px Syne. Subtext in muted gray: "The page you're looking for has moved, been deleted, or never existed." Two buttons side by side: "Go home" (lime green, links to /) and "Browse directory" (outlined, links to /directory). Add a subtle grid background pattern matching the landing page.

In src/App.tsx, ensure the catch-all route <Route path="*" element={<NotFound />} /> is the last route in the Routes block.

─────────────────────────────────────────────────────
A2 — GLOBAL ERROR BOUNDARY
─────────────────────────────────────────────────────
Create a React Error Boundary component at src/components/ErrorBoundary.tsx that catches any unhandled JavaScript errors in the component tree.

The error UI should show: the GetBooked.Live logo, a wrench icon, "something went wrong" heading, a friendly message: "We hit an unexpected error. Our team has been notified. Try refreshing the page." A "Refresh page" button (calls window.location.reload()) and a "Go home" button. Use the same dark design system.

Wrap the entire app in src/App.tsx with <ErrorBoundary>. Also wrap individual dashboard sections so one broken widget doesn't crash the whole page.

─────────────────────────────────────────────────────
A3 — SUPABASE ERROR HANDLING WRAPPER
─────────────────────────────────────────────────────
In src/lib/supabase.ts, create a universal error handler that wraps all database calls.

Add this function at the top of supabase.ts:
export async function dbQuery<T>(queryFn: () => Promise<{data: T | null, error: any}>, errorMessage?: string): Promise<T | null> {
  const { data, error } = await queryFn()
  if (error) {
    console.error('Supabase error:', error)
    // Don't import toast here — just return null and let components handle it
    return null
  }
  return data
}

Then update every function in supabase.ts to use this wrapper. In each page component, check if data is null after a query and show an appropriate empty state rather than crashing.

─────────────────────────────────────────────────────
A4 — ENVIRONMENT VARIABLE SAFETY CHECK
─────────────────────────────────────────────────────
In src/lib/supabase.ts, add a startup check that validates the required environment variables are set.

At the top of the file, add:
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
  console.error('⚠️ VITE_SUPABASE_URL is not configured. Add it to your environment variables.')
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('your-anon-key')) {
  console.error('⚠️ VITE_SUPABASE_ANON_KEY is not configured.')
}

Also add a visible banner in the app when running on localhost with missing env vars — a yellow warning bar at the top of the screen: "⚠️ Supabase is not connected — add your environment variables in Lovable settings."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE B — USER EXPERIENCE POLISH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────
B1 — DARK MODE POLISHED EMPTY STATES
─────────────────────────────────────────────────────
Replace all blank/empty states across the app with designed empty state components.

Create a reusable EmptyState component at src/components/EmptyState.tsx that accepts: icon (emoji), title, description, and optional action button. Style: centered in its container, muted icon at 48px, title in Syne 18px, description in muted gray 13px, optional CTA button in lime green.

Apply to these specific places:
- Directory with no results: "no artists found" + "try adjusting your filters" + "clear filters" button
- Artist dashboard offers tab with no offers: "no offers yet" + "complete your profile to attract promoters" + "edit profile" button  
- Artist dashboard bookings tab empty: "no confirmed bookings yet" + "accept an offer to see bookings here"
- Tour management with no tours: "no tours yet" + "plan your first tour" + "create tour" button
- Notifications panel empty: "you're all caught up" + small checkmark icon
- Promoter dashboard with no offers sent: "you haven't sent any offers yet" + "browse artists" button

─────────────────────────────────────────────────────
B2 — SMOOTH PAGE TRANSITIONS
─────────────────────────────────────────────────────
Add smooth fade transitions between pages so navigation feels polished instead of jarring.

In src/App.tsx, wrap the Routes component with a transition wrapper. Use CSS transitions only (no heavy animation libraries needed).

Add to src/index.css:
.page-enter { opacity: 0; transform: translateY(8px); }
.page-enter-active { opacity: 1; transform: translateY(0); transition: opacity 0.25s ease, transform 0.25s ease; }

Create a PageWrapper component that applies these classes. Wrap every page component in it. The transition should trigger on route change using useLocation() to detect navigation.

Also add a thin loading progress bar at the very top of the page (like YouTube's red bar) that appears during data fetches. Use a simple CSS animation: a #C8FF3E bar that grows from 0% to 100% width over ~800ms then fades out.

─────────────────────────────────────────────────────
B3 — KEYBOARD SHORTCUTS
─────────────────────────────────────────────────────
Add keyboard shortcuts for power users. Show a shortcut hint modal when user presses "?" on any page.

Shortcuts to implement:
- G + H → Go to dashboard (home)
- G + D → Go to directory
- G + T → Go to tours
- G + P → Go to pricing
- N + O → New offer (navigate to directory to start)
- Escape → Close any open modal or panel
- / → Focus the search bar on the directory page

In the Navbar, show a small "?" button in the far right that opens a keyboard shortcuts reference modal. The modal lists all shortcuts in a clean two-column grid. Style it with the dark design system.

Add a useKeyboardShortcuts hook in src/hooks/useKeyboardShortcuts.ts that registers all shortcuts via useEffect with keydown event listeners. Clean up listeners on unmount.

─────────────────────────────────────────────────────
B4 — CONFIRMATION DIALOGS FOR DESTRUCTIVE ACTIONS
─────────────────────────────────────────────────────
Add confirmation dialogs before any action that cannot be undone.

Create a reusable ConfirmDialog component at src/components/ConfirmDialog.tsx. It's a modal overlay with: title, description of what will happen, a destructive action button (red), and a cancel button. Animated fade-in on open.

Apply to:
- Declining an offer: "Decline this offer?" + "This will notify the promoter and cannot be undone." + "Decline offer" (red) / "Keep reviewing" (cancel)
- Cancelling a booking: "Cancel this booking?" + "This will trigger the cancellation policy and may affect your BookScore." + "Cancel booking" (red) / "Go back" (cancel)
- Removing a tour stop: "Remove this stop?" + "All crew assignments and logistics for this stop will be deleted." + "Remove stop" (red) / "Keep it" (cancel)
- Removing a crew member: "Remove from tour?" + crew member name + "Remove" (red) / "Cancel"
- Deleting account: Multi-step — first ask "Are you sure?" then ask them to type their email to confirm

─────────────────────────────────────────────────────
B5 — COPY TO CLIPBOARD EVERYWHERE
─────────────────────────────────────────────────────
Add one-click copy functionality wherever a user needs to share something.

Create a useCopyToClipboard hook that returns a [copied, copyToClipboard] pair. When copied is true, show a brief "Copied!" feedback for 2 seconds.

Apply to:
- Artist smart link URL (on dashboard and profile page): show the URL in a read-only input with a "Copy link" button that turns to "Copied! ✓" on click
- Offer ID in deal rooms: small copy icon next to the reference number
- Promoter contact details in offer cards: copy phone and email with one click
- Embed widget code in settings (for the website widget feature)
- Referral link in settings

Style the copy buttons consistently: small gray icon, turns lime green for 2 seconds when clicked, no text label needed.

─────────────────────────────────────────────────────
B6 — SEARCH HISTORY & SAVED SEARCHES
─────────────────────────────────────────────────────
Add search history and saved search functionality to the Directory page.

1. Store the last 5 directory searches in localStorage. When the search input is focused and empty, show a dropdown with "Recent searches" header and the last 5 queries as clickable items. Each item has an X to remove it.

2. Add a "Save this search" button next to the search bar when filters are active. Saved searches are stored in localStorage as: { name, role, genre, city, maxFee, timestamp }. User can name the search: "Miami House DJs under $3k".

3. In the directory sidebar (or a dropdown), show "Saved searches" as clickable shortcuts that instantly apply all those filters. Add a small pencil icon to rename and an X to delete.

4. For Pro users, store saved searches in Supabase so they persist across devices. Free users: localStorage only.

─────────────────────────────────────────────────────
B7 — RICH TEXT EDITOR FOR BIOS AND NOTES
─────────────────────────────────────────────────────
Upgrade the plain textarea fields for artist bios, offer notes, and deal room messages to support basic rich text formatting.

Use the contenteditable div approach with execCommand for basic formatting (no heavy library needed):

Add a minimal formatting toolbar above bio/notes textareas with:
- Bold (B)
- Italic (I)  
- Bullet list (•)
- Line break

Store the content as HTML in the database. Render it safely using dangerouslySetInnerHTML with a sanitizer that only allows: <b>, <i>, <ul>, <li>, <br>, <p> tags.

Apply to: artist bio in ProfileSetup, offer additional_notes in OfferFlow, deal room messages, tour stop notes field.

Keep character limits: bio max 500 chars, notes max 1000 chars. Show live character count below each field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE C — MISSING FEATURES (highest value additions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────
C1 — FULL PROMOTER DASHBOARD REBUILD
─────────────────────────────────────────────────────
The promoter dashboard is underdeveloped compared to the artist dashboard. Rebuild it with proper sections.

Replace PromoterDashboard.tsx with a full-featured version that includes:

METRICS BAR: Offers sent (this month), accepted (%), pending responses, total spend committed, avg response time from artists.

PIPELINE VIEW: A Kanban-style board with 5 columns: "Searching", "Offer Sent", "Negotiating", "Confirmed", "Completed". Each offer card shows: artist avatar, event name, date, city, guarantee. Cards can be dragged between columns (use HTML5 drag-and-drop, no library needed). Column headers show total count and total guarantee per stage. This view is for Pro Promoter users. Free users see the list view.

UPCOMING SHOWS: A chronological list of all confirmed upcoming bookings with artist name, venue, date, and a "View Deal Room" button.

ARTIST ROSTER: A grid of artists the promoter has previously booked. Quick "Book again" button on each card that pre-fills an offer form with the same artist.

DISCOVERY FEED: 6 recommended artist cards based on the promoter's booking history (genre matching). Show "Recommended for you" above this section.

─────────────────────────────────────────────────────
C2 — VENUE DASHBOARD
─────────────────────────────────────────────────────
Venues currently have no dashboard — they get redirected to a generic view. Build a proper venue dashboard.

Create src/pages/VenueDashboard.tsx. The router in App.tsx should direct venue-role users here after login.

Sections:

VENUE HEADER: Venue name, photo, city, type, capacity, rate. "Edit venue" button.

CALENDAR VIEW: A monthly calendar showing: green days (available), red days (booked), yellow days (hold/pending). Clicking a date opens a quick-action: "Mark available", "Mark unavailable", "View booking for this date".

BOOKING REQUESTS: Incoming booking requests from promoters. Each request shows: promoter name, PromoScore, event date, event type, expected attendance, their message. Action buttons: Accept, Decline, Counter with different rate.

UPCOMING EVENTS: List of confirmed bookings at this venue — date, artist/event name, promoter, guarantee received.

ANALYTICS: Revenue per month chart, most popular nights of week, top genres booked, avg booking rate achieved vs listed rate.

METRICS ROW: Total shows hosted, avg rating, revenue this quarter, occupancy rate this month.

─────────────────────────────────────────────────────
C3 — PRODUCTION & CREATIVE DASHBOARD
─────────────────────────────────────────────────────
Production teams and photo/video creatives currently get no dashboard. Build one.

Create src/pages/CrewDashboard.tsx. Router sends production and photo_video roles here.

Sections:

PROFILE HEADER: Name, role type (sound engineer / photographer / etc.), location, rate, availability status toggle.

GIG CALENDAR: Monthly calendar showing assigned tour dates, confirmed gigs, and available dates. Color coded.

ACTIVE BOOKINGS: Current and upcoming gig assignments — show the artist name, tour name, stop city, show date, role, rate, and status (confirmed/offer sent).

EARNINGS: Total earned this month and year. Breakdown by artist/tour. Export as CSV for tax purposes.

PORTFOLIO: Upload 6 sample photos or embed 2 YouTube/Vimeo links to showcase their work. These appear on their directory profile.

AVAILABILITY: Quick toggle to mark themselves as available or unavailable for new bookings. Set blackout date ranges.

─────────────────────────────────────────────────────
C4 — SMART LINK / EPK PAGE
─────────────────────────────────────────────────────
Every artist needs a public-facing smart link at getbookedlive.lovable.app/[username] — this is their all-in-one booking page to share everywhere.

Create src/pages/SmartLink.tsx accessed via route /:username (add this as the last route before 404 in App.tsx to avoid conflicts).

The page layout:

HEADER: Artist photo (large circle), name, verified badge, genres as colored pills, location, BookScore badge. Below: "Book this artist" lime green button + "Follow for updates" email subscribe input.

STREAMING (if connected): Spotify monthly listeners, top 3 tracks with embedded 30s previews.

UPCOMING SHOWS: All confirmed upcoming bookings shown as event cards: date, venue, city. Each card has a "Get tickets" link field (artist can add this in settings).

STATS: Quick stats row — total bookings, cities performed in, years active, avg rating.

BIO: Full bio with read more toggle.

SOCIAL LINKS: Icon pills for Instagram, Spotify, SoundCloud, YouTube, TikTok, website.

CONTACT: "Send a booking inquiry" button opens a simple contact form (name, email, event details, budget). Form submission creates an offer_inquiry record in Supabase and notifies the artist.

FOOTER: "Powered by GetBooked.Live" with a link to sign up.

For the username setup: add a username field to profiles table (unique, lowercase, no spaces). Auto-suggest from display_name on signup. Let users customize in settings. Show "Your smart link: getbookedlive.lovable.app/djnexus" on the dashboard.

─────────────────────────────────────────────────────
C5 — REAL-TIME OFFER NEGOTIATION CHAT
─────────────────────────────────────────────────────
The offer messaging system exists but needs to be a proper real-time negotiation tool.

Upgrade the offer chat in ArtistDashboard.tsx:

1. Messages update in real time without refresh using the existing Supabase Realtime subscription. Show a typing indicator ("Promoter is typing...") using presence channels.

2. Add a "Make counter offer" button that opens an inline counter-offer form within the chat. The artist enters: their counter amount, adjusted deposit %, any changed logistics. This creates a new offer record with parent_offer_id pointing to the original. Both parties see the negotiation history as a thread.

3. Add message read receipts — show "Seen" with timestamp under sent messages when the other party has read them. Update offer.viewed_at in Supabase when the recipient opens the offer.

4. Add quick-reply templates as small clickable chips above the message input: "Thanks for the offer — reviewing now", "Can we discuss the fee?", "When is the deposit due?", "Deal — let's confirm this."

5. Show a negotiation timeline at the top of the chat: Original offer → Counter 1 → Counter 2 → Accepted. Each step shows the amount and who moved.

─────────────────────────────────────────────────────
C6 — ADVANCED TOUR MANAGEMENT FEATURES
─────────────────────────────────────────────────────
Add the missing functionality to the tour management hub to make it genuinely useful for working artists.

1. TOUR STOP DUPLICATE: Add a "Duplicate stop" button to each stop row. Creates a new stop with the same crew assignments and logistics but a blank date and city — saves setup time for similar venues.

2. TOUR EXPORT: Add an "Export tour" button to the tour header. Generates a PDF of the full itinerary: all stops with dates, venues, addresses, show times, hotel info, and crew assignments. Artists print this for their team. Use the pdf-lib or jsPDF library.

3. BUDGET ITEM CREATION: Add a "+ Add budget item" form at the bottom of the budget panel. Fields: category dropdown (Travel / Hotels / Crew / Production / Merch / Other), label (free text), budgeted amount, actual amount. Save to tour_budget_items table.

4. TOUR TASKS FROM TEMPLATE: Add a "Load task template" button to the task board. Offers pre-built checklists: "Club show template" (15 standard tasks), "Festival template" (22 tasks), "International tour template" (30 tasks). Tasks are added to the current tour.

5. ROUTING GAP VISUAL: On the calendar panel, highlight routing gap days with a red background and a "!" icon. Clicking a gap day shows a mini panel: "You have a gap here — [2 cities within 4hrs] have open promoter bids." Quick link to the directory filtered for those cities.

─────────────────────────────────────────────────────
C7 — COMPLETE SETTINGS PAGE
─────────────────────────────────────────────────────
Build a comprehensive settings page at /settings with sidebar navigation.

Create src/pages/Settings.tsx with these sections:

PROFILE: Edit display name, email, location, bio, social links. Save button. Avatar upload (same as onboarding).

NOTIFICATIONS: Toggle switches for: email when offer received, email when offer accepted/declined, email for new messages, in-app notifications for all, weekly digest email (summary of platform activity). Save preferences to profiles.email_preferences JSONB.

SUBSCRIPTION: Current plan, next billing date, usage this month (offers sent, offers received). Upgrade/downgrade buttons. Cancel subscription with confirmation.

SECURITY: Change password (current + new + confirm). Toggle two-factor authentication (2FA via authenticator app — use Supabase MFA). View active sessions with device name and last active. "Sign out all other devices" button.

INTEGRATIONS: Connect Spotify, Google Calendar, Instagram. Show connected status and last sync. Disconnect button. (Phase 1 — build the UI even if integrations aren't fully functional yet)

SMART LINK: Show and edit username. Preview of smart link. Copy link button. Toggle profile visibility (public/private).

DANGER ZONE: Delete account (with email confirmation), Export all my data (GDPR compliance — generates a JSON file of all user data).

Link to /settings from the profile menu dropdown in Navbar.

─────────────────────────────────────────────────────
C8 — ADVANCED DIRECTORY FILTERS
─────────────────────────────────────────────────────
The directory filter system is currently decorative. Build a proper advanced filter panel.

Add a "Filters" button next to the search bar that opens a slide-over filter panel on the right side of the screen.

For ARTISTS, filter options:
- Genre (multi-select checkboxes)
- Fee range (dual-handle slider $0 – $50,000)
- Tier (Rising / Established / Headliner)
- Location / city (text input with autocomplete)
- Availability (date picker — "available on this date")
- Response time (under 4hrs / under 24hrs / any)
- BookScore minimum (slider 0–100)
- Verified only (toggle)
- Accepting bookings (toggle)

For VENUES, filter options:
- Venue type (multi-select)
- Capacity range (slider 0 – 10,000)
- Rate range (slider)
- City
- Amenities (checkboxes: production rig, green room, parking, ADA, outdoor option)

For PRODUCTION/CREATIVE:
- Production type / creative type
- Touring available (toggle)
- Rate range
- City / region

Show active filter count as a badge on the Filters button. Show a "Clear all" link when filters are active. Wire all filters to real Supabase queries — every filter updates the results grid in real time.

─────────────────────────────────────────────────────
C9 — IN-APP HELP CENTRE
─────────────────────────────────────────────────────
Add a contextual help system so users can get answers without leaving the app.

1. Add a "?" floating button in the bottom-right corner of every page (except landing and auth). It opens a help panel slide-over from the right.

2. The help panel has: a search bar at the top, and below it categorised help articles:
- Getting started (5 articles)
- Sending and receiving offers (6 articles)
- Payments and commissions (4 articles)  
- Tour management (5 articles)
- Subscription plans (3 articles)
- Technical issues (4 articles)

3. Each article is stored as static content in a helpArticles.ts file — just title and HTML body. No CMS needed at this stage.

4. The panel is context-aware — when the user is on TourManagement, the default view shows tour management articles. When on OfferFlow, it shows offer-related articles.

5. At the bottom of the panel: "Still need help? Contact support" button that opens a pre-filled email to support@getbookedlive.com with the user's account ID and current page URL automatically included.

─────────────────────────────────────────────────────
C10 — ANALYTICS DASHBOARD FOR ARTISTS
─────────────────────────────────────────────────────
The analytics tab currently shows basic offer breakdown. Build a real analytics dashboard.

Replace the Analytics panel in ArtistDashboard.tsx with a full data dashboard:

EARNINGS CHART: Bar chart showing monthly earnings (artist_net from confirmed bookings) for the last 12 months. Built with Recharts (already in the stack). Hover shows exact amount per month.

OFFER FUNNEL: A horizontal funnel showing: Offers received → Viewed → Responded → Accepted → Completed. Shows count and % conversion at each stage.

TOP CITIES: A ranked list of the top 5 cities where the artist has performed — city name, number of shows, total earned. Sortable.

TOP PROMOTERS: The 3 promoters who have booked this artist most — promoter name, number of bookings, total paid. Quick "Accept priority offers" toggle for these trusted partners.

PEAK PERIODS: A heatmap showing which months have the most booking requests. Built as a 12-column grid with color intensity representing offer volume. Helps artists know when to mark availability.

BOOKSCORE HISTORY: A line chart showing BookScore over the last 6 months. "Your score increased 8 points this quarter."

RESPONSE TIME TRACKER: "Your avg response time is 6hrs. Artists who respond under 4hrs receive 34% more offers."

Add date range filter: Last 30 days / 90 days / 12 months / All time.

─────────────────────────────────────────────────────
C11 — MULTI-LANGUAGE SUPPORT (i18n)
─────────────────────────────────────────────────────
Add internationalisation support for English, Spanish, Portuguese, and French.

1. Install react-i18next: add to package.json. Create src/i18n.ts configuration file.

2. Create translation files:
- src/locales/en/translation.json
- src/locales/es/translation.json  
- src/locales/pt/translation.json
- src/locales/fr/translation.json

3. Start with translating the most visible strings — navbar labels, button text, dashboard headings, form labels, and error messages.

4. Add a language selector to the Navbar (shown as a globe icon + language code: EN / ES / PT / FR). On mobile, add it to the hamburger menu.

5. Store the user's language preference in localStorage and in profiles.preferred_language. Default to browser language detection using navigator.language.

6. Translate the Landing page fully in all 4 languages — this is the most impactful for SEO and international growth.

7. Date and currency formatting should automatically use the user's locale via JavaScript's Intl.DateTimeFormat and Intl.NumberFormat APIs everywhere dates and money amounts are displayed.

─────────────────────────────────────────────────────
C12 — SEO & META TAGS
─────────────────────────────────────────────────────
Add proper SEO meta tags to every page to make the platform discoverable on Google.

1. Install react-helmet-async. Wrap the app in HelmetProvider in App.tsx.

2. Add default meta tags in App.tsx:
- title: "GetBooked.Live — Music Booking Marketplace"
- description: "Book artists, production crews, photographers, and venues. The all-in-one platform for live music — structured offers, tour management, and fan economy."
- og:image: your logo on lime green background
- og:type: website
- twitter:card: summary_large_image

3. Add page-specific meta tags:
- Landing: focused on "music booking platform"
- Directory: "browse 2,400+ artists, venues, and production crews"
- ProfilePage: dynamically use the artist's name, genres, and bio as title and description. Format: "[Artist Name] — Book on GetBooked.Live | [Genre] | [City]"
- Pricing: "GetBooked.Live Pricing — Free, Pro, and Agency plans"
- SmartLink pages: "Book [Artist Name] | [Genre] | GetBooked.Live"

4. Add a sitemap.xml route that lists all public artist profile pages. This is critical for Google to index artist profiles.

5. Add JSON-LD structured data to artist profile pages so Google can show rich results: Person schema with name, genre, location, and a "BookAction" that links to the offer flow.

─────────────────────────────────────────────────────
C13 — PERFORMANCE OPTIMISATION
─────────────────────────────────────────────────────
Optimise the app for fast loading and smooth performance.

1. Add React.lazy() code splitting for all page components in App.tsx. Wrap Routes in <Suspense fallback={<LoadingScreen />}>. This reduces the initial bundle size by ~60%.

2. Add query result caching in src/lib/supabase.ts using a simple in-memory Map. Cache directory results for 60 seconds, profiles for 5 minutes. Invalidate cache on writes.

3. In Directory.tsx, implement virtual scrolling for large lists using a simple approach: only load 12 cards at a time. Add an "Load more" button at the bottom that fetches the next 12. Use the .range() Supabase query parameter.

4. Add image lazy loading: wrap all avatar img tags with loading="lazy" attribute. Add placeholder blurred background while images load using a tiny base64 placeholder.

5. Memoize expensive components with React.memo(): the talent grid cards, offer cards, and tour stop rows. Use useMemo for derived values like total earnings and filter results.

6. Add a service worker for offline support (basic): cache the app shell so the platform loads even with no connection and shows a "You're offline — showing cached data" banner.

─────────────────────────────────────────────────────
C14 — ADMIN PANEL COMPLETION
─────────────────────────────────────────────────────
Complete the admin panel with all critical management tools.

Build out /admin fully with these sections (add to the existing admin dashboard):

LIVE FEED: Real-time activity stream using Supabase Realtime. Every new signup, offer sent, booking confirmed, and payment received appears as a new row instantly without refresh. Show: timestamp, action type icon, user name, action description.

USER DETAIL PANEL: Clicking any user in the users table opens a full-screen slide-over with:
- All their profile data
- Their subscription history
- All offers they've sent or received
- All confirmed bookings
- Their BookScore breakdown
- Activity log (last 20 actions with timestamps)
- Admin actions: verify, suspend, add credit, change plan, send personal email, delete account

BOOKING OVERSIGHT: Table of all bookings with search. Click any booking to see the full deal room including all messages, milestones, and documents. Admin can intervene in disputes from here.

FINANCIAL CONTROLS: 
- Set commission rates per tier (free/pro/agency) — changes affect new offers immediately
- Issue platform credits to specific users
- Process manual refunds
- View Stripe payout history
- Toggle "maintenance mode" which shows a maintenance banner to all users

CONTENT MODERATION QUEUE: All new venue listings awaiting approval. All flagged reviews. Any profile with keywords that triggered the filter. One-click approve/reject with automated email to the submitter.

ANNOUNCEMENT SYSTEM: Create a platform-wide banner that appears on all user dashboards: title, message, type (info/warning/success), start date, end date. Users can dismiss it. Store in a platform_announcements table.

─────────────────────────────────────────────────────
C15 — STRIPE PAYMENTS INTEGRATION
─────────────────────────────────────────────────────
This is the most critical missing feature. Wire up real payments.

1. Add VITE_STRIPE_PUBLISHABLE_KEY to Lovable environment variables. Create a Supabase Edge Function called create-payment-intent.

2. The Edge Function accepts: booking_id, amount, currency, artist_stripe_account_id. It creates a Stripe PaymentIntent with automatic commission split using Stripe Connect: platform takes commission_amount, artist receives artist_net amount via transfer_data.

3. In ArtistDashboard.tsx, on the confirmed bookings tab, add a "Pay deposit" button that appears when payment_status is 'unpaid'. Clicking it opens a Stripe Payment Element embedded in a modal — the promoter enters card details and pays the deposit amount directly.

4. When payment succeeds, update bookings.payment_status to 'deposit_paid' and bookings.deposit_paid_at to now(). Update the relevant deal room milestone to completed. Send email notifications to both parties.

5. For artist payouts: add a "Connect Stripe" button to artist settings that starts the Stripe Connect OAuth flow. Artists add their bank account. After a booking is fully paid, the artist's net amount is automatically transferred to their connected Stripe account.

6. Show payment status badges on booking cards: Unpaid (red), Deposit paid (amber), Fully paid (green).

7. Add a Payments section to artist settings showing: total earnings, pending payouts, completed payouts, and a link to their Stripe Express dashboard for detailed payout history.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE D — TRUST & SOCIAL PROOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────
D1 — LANDING PAGE SOCIAL PROOF SECTION
─────────────────────────────────────────────────────
Add a social proof section to Landing.tsx that builds trust for new visitors.

Add between the marquee and the role tabs section:

TESTIMONIALS CAROUSEL: 3 testimonials in a horizontal auto-rotating carousel (rotates every 5 seconds, pausable on hover). Each testimonial: photo/avatar, name, role (e.g. "DJ — Miami, FL"), quote (2-3 sentences), star rating. Use realistic placeholder testimonials until real ones are collected.

STATS BAR (upgraded): Make the existing stats bar more impactful. Add animated number counters that count up from 0 when the section scrolls into view. Add a small pulsing green dot next to "12K+ shows booked" to suggest live/real-time activity.

TRUSTED BY: A row of small platform logos showing where artist show data gets distributed: Spotify, Apple Music, Google, Shazam, YouTube. Label: "Your shows distributed to."

PRESS MENTIONS PLACEHOLDER: A "As featured in" section with placeholder publication logos (Music Week, DJ Mag, Billboard, Resident Advisor). Replace with real mentions when coverage is secured.

─────────────────────────────────────────────────────
D2 — VERIFIED BADGE SYSTEM
─────────────────────────────────────────────────────
Build a proper verification system that makes the platform feel trustworthy.

Three tiers of verification, shown as different badge styles:

1. ID VERIFIED (blue shield): User has submitted government ID. For now, implement as admin-grantable only. In admin panel, admin can toggle id_verified on any profile. Show as a blue shield icon next to name.

2. PAYMENT VERIFIED (green circle): Artist has completed at least 3 bookings with full payment received on time. Calculate automatically from booking history.

3. PLATFORM VERIFIED (gold star): Reserved for top-performing users — BookScore 90+, 20+ bookings, 4.8+ average rating. Calculate automatically and grant/revoke dynamically.

Show the appropriate badge on: directory cards, offer cards (shows the promoter's verification when an artist receives an offer), profile pages, deal room headers.

Add to ProfilePage: an "About verification" expandable section explaining what each badge means and how to earn it.

─────────────────────────────────────────────────────
D3 — TRUST SCORE BREAKDOWN PAGE
─────────────────────────────────────────────────────
Make BookScore and PromoScore transparent and gamified.

Add a /score page accessible from the artist dashboard. Shows:

CURRENT SCORE: Large circular display of the score (0-100) with tier label: 0-40 New, 41-60 Building, 61-75 Trusted, 76-89 Top Rated, 90-100 Elite.

SCORE BREAKDOWN: Four components shown as individual progress bars:
- Booking history (30%): based on number of confirmed bookings
- Response rate (25%): % of offers responded to within 24hrs
- Rating average (25%): average of all received reviews
- Profile completeness (20%): based on completion %

HOW TO IMPROVE: A personalised list of specific actions to increase the score: "Respond to offers within 4 hours (+3 pts)", "Complete your profile (+5 pts)", "Confirm 2 more bookings (+8 pts)".

SCORE HISTORY: Line chart of score over the last 6 months.

TIER BENEFITS: A table showing what each tier unlocks: priority search placement, reduced commission, verified badge, featured in trending, etc.

LEADERBOARD: Top 10 artists by BookScore in the user's primary genre — anonymised except for top 3. Shows their score and number of bookings. Motivates users to climb the ranking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE E — FINAL POLISH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────
E1 — DEMO MODE FOR VISITORS
─────────────────────────────────────────────────────
Add a "Try a demo" option on the landing page so visitors can explore the platform without signing up.

When a logged-out user clicks "Try demo" on the landing page, create a temporary guest session with pre-populated demo data: a sample artist profile (DJ Nexus), a sample inbox with 3 demo offers, a sample tour with 5 stops, and sample analytics.

Show a persistent "Demo mode — create a free account to save your data" banner at the top. All actions in demo mode work visually but don't write to the database. The demo session expires after 30 minutes.

After 5 minutes in demo mode, show a prompt: "Like what you see? Create your free account in 60 seconds."

Store demo state in sessionStorage. Clear it when the user signs up (and migrate any demo data they created into their real account where applicable).

─────────────────────────────────────────────────────
E2 — PWA (PROGRESSIVE WEB APP)
─────────────────────────────────────────────────────
Make GetBooked.Live installable as an app on phones without needing the App Store.

1. Create public/manifest.json with: name "GetBooked.Live", short_name "GetBooked", start_url "/", display "standalone", background_color "#080C14", theme_color "#C8FF3E". Add icon entries for 192px and 512px sizes (use the logo PNG).

2. Link the manifest in index.html: <link rel="manifest" href="/manifest.json">. Add <meta name="theme-color" content="#C8FF3E">.

3. Create public/sw.js — a simple service worker that caches the app shell (index.html, main CSS, main JS) so the app loads instantly on repeat visits. Use a cache-first strategy for assets and network-first for API calls.

4. Register the service worker in src/main.tsx.

5. Add install prompt handling: listen for the beforeinstallprompt event. Show a subtle "Install the app" banner at the bottom of the screen on mobile when the browser triggers this event. The banner shows the app icon, "Get the GetBooked.Live app", and "Add to home screen" button.

─────────────────────────────────────────────────────
E3 — DARK/LIGHT MODE TOGGLE
─────────────────────────────────────────────────────
Add an optional light mode for users who prefer it, while keeping dark as the default.

1. Add a theme toggle (sun/moon icon) to the Navbar next to the notification bell.

2. Store theme preference in localStorage and in profiles.theme_preference ('dark' | 'light').

3. Implement by toggling a 'light' class on the <html> element. Create a src/styles/light-mode.css file that overrides the CSS custom properties:
--bg becomes #F8F9FA
--surface-1 becomes #FFFFFF
--surface-2 becomes #F1F3F5
The lime green accent (#C8FF3E) stays the same in light mode but text on lime green should always be #080C14.
Text colors invert: primary becomes #0D0D0D, muted becomes #6B7280.
Border colors become rgba(0,0,0,0.08).

4. The transition between modes should be smooth: add transition: background-color 0.3s ease, color 0.3s ease to the body and all major containers.

5. Default remains dark mode. The site looks exceptional in both modes.

─────────────────────────────────────────────────────
E4 — SCROLL-TRIGGERED ANIMATIONS ON LANDING PAGE
─────────────────────────────────────────────────────
Add professional scroll-triggered animations to Landing.tsx to make it feel premium.

Use IntersectionObserver (no animation library needed — pure CSS + JS):

1. Add a data-animate attribute to every section on the landing page.

2. In a useEffect, set up an IntersectionObserver that adds the class 'is-visible' when each section enters the viewport (threshold: 0.1).

3. CSS animations for each section type:
- Hero: already loads on mount (no scroll needed)
- Stats row: each number counts up from 0 when visible (use JS counter animation over 1.5s)
- Role cards: slide in from the bottom with 100ms stagger delay per card
- Feature bento: fade in with slight scale (0.96 → 1.0) per card with stagger
- Tour spotlight: slide in from left
- AI section: fade in from bottom
- Fan economy section: slide in from right
- Pricing cards: fade up with stagger
- Final CTA: zoom in slightly (0.95 → 1.0) with fade

4. Respect prefers-reduced-motion: wrap all animations in @media (prefers-reduced-motion: no-preference) so users who have motion sensitivity don't see animations.

─────────────────────────────────────────────────────
E5 — POLISHED AUTH PAGE
─────────────────────────────────────────────────────
The auth page is functional but plain. Make it feel like the rest of the brand.

Redesign Auth.tsx:

Layout: Split screen on desktop — left side is the form, right side is a visual panel. On mobile, full-screen form only.

LEFT SIDE (form):
- GetBooked.Live logo at top
- The existing form content (already works well)
- Social proof at bottom: "Join 2,400+ artists, 920+ promoters, and 840+ venues"

RIGHT SIDE (visual panel — desktop only):
- Background: #080C14 with grid pattern
- Centered lime green glow orb
- Large quote in Syne font: "the industry runs on relationships. we built the platform for it."
- Below: 3 mini profile cards stacked at an angle showing sample artists with their BookScore
- Animated: the profile cards slowly cycle through different users (CSS keyframe fade in/out every 3 seconds)

Form improvements:
- Password field: add show/hide toggle (eye icon)
- Email field: auto-focus on page load
- Submit button: shows spinner during loading, changes to "Success! Redirecting..." on success
- Error messages: appear with a shake animation
- Role selection: clicking a role card plays a subtle scale animation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL IMPACT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase A — Foundation (4 prompts): stops crashes, handles errors
Phase B — UX Polish (7 prompts): makes every interaction feel smooth
Phase C — Missing Features (15 prompts): completes the product vision
Phase D — Trust & Social Proof (3 prompts): builds credibility
Phase E — Final Polish (5 prompts): makes it feel production-grade

Total additional prompts: 34
Combined with Score Improvement Pack (12 prompts): 46 total prompts

After completing all 46 prompts + the 12 score improvement prompts:
Expected UX score: 9.2 – 9.5 / 10
