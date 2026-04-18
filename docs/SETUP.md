# GetBooked.Live — Full Setup Guide
## Lovable + Supabase deployment in ~30 minutes

---

## OVERVIEW

This codebase is a production-ready React + Supabase SaaS application for GetBooked.Live.

**What's included:**
- Full Supabase schema (22 tables, RLS policies, triggers, storage buckets)
- TypeScript types for every table
- Supabase client with all CRUD queries + real-time subscriptions
- Auth flow (sign up, sign in, role selection, profile setup)
- 5 user roles: Artist, Promoter, Venue, Production, Photo/Video
- Artist dashboard with offer management and deal rooms
- Promoter dashboard with artist discovery
- 6-step offer flow with live commission calculator
- Full tour management (itinerary, crew manifest, budget, tasks, calendar, documents)
- Unified directory (Artists, Production, Photo/Video, Venues, Promoters)
- Pricing page with subscription calculator
- Real-time notifications via Supabase Realtime

---

## PART 1 — SUPABASE SETUP

### Step 1: Create your Supabase project
1. Go to https://supabase.com and create a new project
2. Choose a region close to your users
3. Note your **Project URL** and **anon public key** (Settings → API)

### Step 2: Run the database schema
1. Go to Supabase Dashboard → **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql`
3. Paste the **entire file** into the SQL editor
4. Click **Run** — this creates all 22 tables, RLS policies, triggers, and storage buckets

### Step 3: Configure Auth
1. Go to Authentication → **Providers**
2. Make sure **Email** is enabled (it is by default)
3. Go to Authentication → **Email Templates** — customize if desired
4. Go to Authentication → **URL Configuration**:
   - Site URL: `https://your-lovable-project.lovable.app`
   - Redirect URLs: `https://your-lovable-project.lovable.app/**`

### Step 4: Get your API keys
From Supabase Dashboard → Project Settings → API:
- `VITE_SUPABASE_URL` = your Project URL (e.g. `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = your anon/public key

---

## PART 2 — LOVABLE SETUP

### Step 1: Create a new Lovable project
1. Go to https://lovable.dev
2. Create a **new project**
3. Choose "Import from GitHub" or start blank

### Step 2: Upload all files
Upload the full file structure from this repo:
```
getbooked-live/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   └── supabase.ts
    ├── types/
    │   └── database.ts
    ├── contexts/
    │   └── AuthContext.tsx
    ├── components/
    │   └── Navbar.tsx
    └── pages/
        ├── Landing.tsx
        ├── Auth.tsx
        ├── ArtistDashboard.tsx
        ├── PromoterDashboard.tsx
        ├── Directory.tsx
        ├── VenueDirectory.tsx
        ├── OfferFlow.tsx
        ├── TourManagement.tsx
        ├── ProfileSetup.tsx
        ├── ProfilePage.tsx
        └── Pricing.tsx
```

### Step 3: Set environment variables
In Lovable → Project Settings → Environment Variables, add:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Install dependencies
Lovable should auto-install from package.json. If not, use the terminal:
```bash
npm install
```

### Step 5: Update supabase.ts
Open `src/lib/supabase.ts` — the env vars should be picked up automatically via:
```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### Step 6: Deploy
Click **Publish** in Lovable. Your app will be live at `https://your-project.lovable.app`

---

## PART 3 — FIRST RUN CHECKLIST

After deploying, verify these work:
- [ ] Landing page loads at `/`
- [ ] Sign up creates a user in Supabase Auth (check Dashboard → Authentication → Users)
- [ ] Profile is auto-created in `public.profiles` table on signup
- [ ] Role selection on signup saves to `profiles.role`
- [ ] Profile setup wizard routes correctly by role
- [ ] Directory loads artists/venues (will be empty until users sign up)
- [ ] Offer flow works end-to-end
- [ ] Notifications appear in Navbar after receiving an offer

---

## PART 4 — ADDING STRIPE (Payments & Commissions)

To activate the commission payment system, add Stripe Connect:

### Install
```bash
npm install @stripe/stripe-js
```

### Supabase Edge Function for Stripe webhooks
Create a Supabase Edge Function at `supabase/functions/stripe-webhook/index.ts`:
```ts
import Stripe from 'https://esm.sh/stripe@13.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    // Update booking payment status in Supabase
  }

  return new Response('ok')
})
```

### Environment variables to add (Lovable + Supabase)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## PART 5 — CUSTOMIZATION PRIORITIES

### MVP launch sequence (recommended order):
1. **Get auth + profiles working** — Users can sign up and set up profiles
2. **Directory shows real data** — Artists/venues appear after signing up
3. **Offer flow is live** — Promoters can send, artists can respond
4. **Notifications work** — Real-time updates via Supabase Realtime
5. **Add Stripe** — Enable actual payment collection
6. **Tour module** — Artists can create and manage tours

### Changing commission rates:
Edit the `calculate_offer_commission()` function in the SQL schema, or add logic in `src/lib/supabase.ts` to look up the user's subscription plan and apply the correct rate.

### Changing the brand colors:
All colors use CSS custom properties. Edit `tailwind.config.js`:
- `#C8FF3E` — primary green accent
- `#7B5CF0` — purple (production)
- `#3EC8FF` — cyan (photo/video)
- `#FFB83E` — amber (venues)
- `#FF5C8A` — pink (promoters)

---

## PART 6 — FILE REFERENCE

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Complete DB schema — run once in Supabase SQL Editor |
| `src/types/database.ts` | TypeScript interfaces for every table |
| `src/lib/supabase.ts` | Supabase client + all query functions |
| `src/contexts/AuthContext.tsx` | Auth state + user profile context |
| `src/App.tsx` | Router + protected routes |
| `src/components/Navbar.tsx` | Top nav with notifications |
| `src/pages/Landing.tsx` | Public landing page |
| `src/pages/Auth.tsx` | Sign in / sign up with role selection |
| `src/pages/ArtistDashboard.tsx` | Offer inbox, deal rooms, analytics |
| `src/pages/PromoterDashboard.tsx` | Offers sent + artist discovery |
| `src/pages/Directory.tsx` | All 5 role types in one directory |
| `src/pages/VenueDirectory.tsx` | Venue-specific directory entry |
| `src/pages/OfferFlow.tsx` | 6-step offer creation with commission calc |
| `src/pages/TourManagement.tsx` | Itinerary, crew, budget, tasks, docs |
| `src/pages/ProfileSetup.tsx` | Role-specific onboarding wizard |
| `src/pages/ProfilePage.tsx` | Public profile view |
| `src/pages/Pricing.tsx` | Subscription tiers + savings calculator |

---

## SUPPORT

Built by Claude. Questions? Iterate directly in Lovable by prompting with:
- "Add a search filter for artists by genre in the Directory"
- "Add a modal to edit tour stop details"  
- "Add a review form after a booking is completed"
- "Add a mobile-responsive drawer nav"
