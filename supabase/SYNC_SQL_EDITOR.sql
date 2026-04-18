-- ============================================================
-- GetBooked.Live — Complete Fresh-Start Database Script
-- Project: ycqtqbecadarulohxvan
-- Date: 2026-04-08
--
-- IDEMPOTENT — safe to run on an empty OR existing database.
-- All tables use CREATE TABLE IF NOT EXISTS with every column
-- already defined, so no ALTER TABLE is needed for base tables.
--
-- EXECUTION ORDER:
--   Part 0:  Extensions
--   Part 1:  Enums
--   Part 2:  Core utility functions (depended on by triggers)
--   Part 3:  user_roles table + has_role() (used by RLS policies)
--   Part 4:  All other tables (in FK-dependency order)
--   Part 5:  Indexes
--   Part 6:  Views
--   Part 7:  Functions (RPC helpers & trigger bodies)
--   Part 8:  Triggers
--   Part 9:  RLS Policies
--   Part 10: Storage buckets & policies
--   Part 11: Grants
--   Part 12: Realtime publication
--   Part 13: pg_cron job (requires Vault secrets)
-- ============================================================


-- ============================================================
-- PART 0: Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net    SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;

-- Email queues (idempotent)
DO $$ BEGIN PERFORM pgmq.create('auth_emails');           EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails');  EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq');       EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ============================================================
-- PART 1: Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('artist', 'promoter', 'venue', 'production', 'photo_video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- PART 2: Core utility functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


-- ============================================================
-- PART 3: user_roles table + has_role (used by later RLS policies)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT CASE
    WHEN _role = 'admin' THEN
      CASE WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN auth.users au ON au.id = ur.user_id
          WHERE ur.user_id = _user_id AND ur.role = _role
            AND au.email = 'getbookedlive@gmail.com'
        )
      ELSE false END
    ELSE
      CASE WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
      ELSE false END
  END
$$;


-- ============================================================
-- PART 4: All tables (in FK-dependency order)
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                       UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role                     public.app_role,
  display_name             TEXT,
  avatar_url               TEXT,
  banner_url               TEXT,
  bio                      TEXT,
  city                     TEXT,
  state                    TEXT,
  country                  TEXT        DEFAULT NULL,
  genre                    TEXT,
  website                  TEXT,
  instagram                TEXT,
  spotify                  TEXT,
  apple_music              TEXT,
  soundcloud               TEXT,
  youtube                  TEXT,
  tiktok                   TEXT,
  bandcamp                 TEXT,
  beatport                 TEXT,
  bandsintown              TEXT,
  songkick                 TEXT,
  facebook                 TEXT,
  twitter                  TEXT,
  threads                  TEXT,
  slug                     TEXT        UNIQUE,
  rate_min                 NUMERIC,
  rate_max                 NUMERIC,
  is_verified              BOOLEAN     DEFAULT false,
  profile_complete         BOOLEAN     DEFAULT false,
  suspended                BOOLEAN     NOT NULL DEFAULT false,
  subscription_plan        TEXT        NOT NULL DEFAULT 'free',
  trial_ends_at            TIMESTAMPTZ DEFAULT NULL,
  accepting_bookings       BOOLEAN     NOT NULL DEFAULT true,
  nudge_sent_at            TIMESTAMPTZ DEFAULT NULL,
  stripe_customer_id       TEXT        DEFAULT NULL,
  stripe_account_id        TEXT        DEFAULT NULL,
  stripe_onboarding_complete BOOLEAN   DEFAULT false,
  bookscore                NUMERIC     DEFAULT NULL,
  completion_score         INTEGER     DEFAULT 0,
  streaming_stats          JSONB       DEFAULT NULL,
  pitch_card_url           TEXT        DEFAULT NULL,
  email_preferences        JSONB       NOT NULL DEFAULT '{"offer_received":true,"offer_accepted":true,"offer_declined":true,"booking_confirmed":true,"new_message":false}'::jsonb,
  seen_welcome             BOOLEAN     NOT NULL DEFAULT false,
  timezone                 TEXT        DEFAULT 'America/New_York',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── artist_listings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artist_listings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  genre           TEXT,
  upcoming_concerts INTEGER   DEFAULT 0,
  origin          TEXT        DEFAULT NULL,
  bandsintown_url TEXT        DEFAULT NULL,
  notes           TEXT        DEFAULT NULL,
  claim_status    TEXT        NOT NULL DEFAULT 'unclaimed',
  claimed_by      UUID        DEFAULT NULL,
  slug            TEXT        UNIQUE,
  instagram       TEXT,
  spotify         TEXT,
  tiktok          TEXT,
  website         TEXT,
  avatar_url      TEXT,
  bookscore       NUMERIC,
  tier            TEXT,
  fee_min         NUMERIC,
  fee_max         NUMERIC,
  bio             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_listings ENABLE ROW LEVEL SECURITY;

-- ── venue_listings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_listings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  city         TEXT,
  state        TEXT,
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  website      TEXT,
  region       TEXT,
  claimed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  claim_status TEXT        NOT NULL DEFAULT 'unclaimed',
  description  TEXT,
  capacity     INTEGER,
  amenities    TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_listings ENABLE ROW LEVEL SECURITY;

-- ── waitlist ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  role       TEXT        DEFAULT 'artist',
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- ── admin_users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role       TEXT  DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'support')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ── tours ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tours (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  status      TEXT        NOT NULL DEFAULT 'planning'
                CHECK (status IN ('planning','confirmed','in_progress','completed','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

-- ── tour_stops ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tour_stops (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id         UUID        NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  venue_name      TEXT        NOT NULL,
  city            TEXT,
  state           TEXT,
  date            DATE        NOT NULL,
  load_in_time    TIME,
  sound_check_time TIME,
  doors_time      TIME,
  show_time       TIME,
  guarantee       NUMERIC     DEFAULT 0,
  notes           TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tour_stops ENABLE ROW LEVEL SECURITY;

-- ── crew_members ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_members (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id    UUID        NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  role       TEXT        NOT NULL,
  email      TEXT,
  phone      TEXT,
  day_rate   NUMERIC,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- ── tour_budget_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tour_budget_items (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id        UUID        NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  category       TEXT        NOT NULL
                   CHECK (category IN ('travel','lodging','food','gear','crew','marketing','misc')),
  description    TEXT        NOT NULL,
  estimated_cost NUMERIC     NOT NULL DEFAULT 0,
  actual_cost    NUMERIC,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tour_budget_items ENABLE ROW LEVEL SECURITY;

-- ── tour_documents ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tour_documents (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id     UUID        NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_size   INTEGER,
  mime_type   TEXT,
  uploaded_by UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tour_documents ENABLE ROW LEVEL SECURITY;

-- ── artist_availability ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artist_availability (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID        NOT NULL,
  date              DATE        NOT NULL,
  is_available      BOOLEAN     NOT NULL DEFAULT true,
  notes             TEXT,
  flash_bid_enabled BOOLEAN     NOT NULL DEFAULT false,
  flash_bid_deadline TIMESTAMPTZ,
  flash_bid_min_price NUMERIC   DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, date)
);
ALTER TABLE public.artist_availability ENABLE ROW LEVEL SECURITY;

-- ── artist_claims ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artist_claims (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_listing_id UUID        NOT NULL REFERENCES public.artist_listings(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL,
  proof_text        TEXT        DEFAULT NULL,
  manager_name      TEXT        DEFAULT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ DEFAULT NULL
);
ALTER TABLE public.artist_claims ENABLE ROW LEVEL SECURITY;

-- ── venue_claims ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_claims (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID        NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  proof_text    TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ
);
ALTER TABLE public.venue_claims ENABLE ROW LEVEL SECURITY;

-- ── venue_photos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID        NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  file_path   TEXT        NOT NULL,
  caption     TEXT,
  sort_order  INTEGER     DEFAULT 0,
  uploaded_by UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;

-- ── venue_availability ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_availability (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       UUID  NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  available_date DATE  NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, available_date)
);
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;

-- ── offers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offers (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_name        TEXT        NOT NULL,
  event_date        DATE        NOT NULL,
  event_time        TIME,
  guarantee         NUMERIC     NOT NULL DEFAULT 0,
  door_split        NUMERIC,
  merch_split       NUMERIC,
  hospitality       TEXT,
  backline          TEXT,
  notes             TEXT,
  commission_rate   NUMERIC     NOT NULL DEFAULT 0.10,
  commission_amount NUMERIC     DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','declined','countered','expired','negotiating')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- ── bookings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id                               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id                         UUID        NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  artist_id                        UUID        NOT NULL,
  promoter_id                      UUID        NOT NULL,
  venue_name                       TEXT        NOT NULL,
  event_date                       DATE        NOT NULL,
  event_time                       TIME WITHOUT TIME ZONE,
  guarantee                        NUMERIC     NOT NULL DEFAULT 0,
  contract_url                     TEXT,
  status                           TEXT        NOT NULL DEFAULT 'confirmed',
  payment_status                   TEXT        NOT NULL DEFAULT 'unpaid'
                                     CHECK (payment_status IN ('unpaid','deposit_paid','fully_paid','refunded')),
  deposit_paid_at                  TIMESTAMPTZ DEFAULT NULL,
  deposit_stripe_session_id        TEXT        DEFAULT NULL,
  deposit_amount                   NUMERIC     DEFAULT NULL,
  final_paid_at                    TIMESTAMPTZ DEFAULT NULL,
  final_payment_paid_at            TIMESTAMPTZ DEFAULT NULL,
  final_payment_stripe_session_id  TEXT        DEFAULT NULL,
  final_payment_amount             NUMERIC     DEFAULT NULL,
  stripe_customer_id               TEXT        DEFAULT NULL,
  stripe_payment_intent_id         TEXT        DEFAULT NULL,
  commission_rate                  NUMERIC     DEFAULT 0.20,
  presale_open                     BOOLEAN     NOT NULL DEFAULT false,
  presale_ticket_url               TEXT,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_id)
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ── deal_rooms ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);
ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

-- ── deal_room_messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_messages (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID  NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  sender_id    UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT  NOT NULL,
  message_type TEXT  DEFAULT 'text' CHECK (message_type IN ('text','file','system','offer_update')),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.deal_room_messages ENABLE ROW LEVEL SECURITY;

-- ── deal_milestones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_milestones (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID        NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending',
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info',
  read       BOOLEAN     NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── contract_signatures ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL,
  signature_data TEXT        NOT NULL,
  signature_type TEXT        NOT NULL DEFAULT 'draw',
  signed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id)
);
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- ── counter_offers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.counter_offers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id   UUID        NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL,
  guarantee  NUMERIC     NOT NULL DEFAULT 0,
  door_split NUMERIC,
  merch_split NUMERIC,
  event_date DATE        NOT NULL,
  event_time TIME WITHOUT TIME ZONE,
  message    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;

-- ── flash_bids ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flash_bids (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID        NOT NULL REFERENCES public.artist_availability(id) ON DELETE CASCADE,
  artist_id       UUID        NOT NULL,
  bidder_id       UUID        NOT NULL,
  amount          NUMERIC     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_bids ENABLE ROW LEVEL SECURITY;

-- ── reel_clips ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reel_clips (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  file_path  TEXT        NOT NULL,
  title      TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reel_clips ENABLE ROW LEVEL SECURITY;

-- ── show_attendance ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.show_attendance (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_name       TEXT        NOT NULL,
  artist_id        UUID        NOT NULL,
  promoter_id      UUID        NOT NULL,
  venue_capacity   INTEGER,
  actual_attendance INTEGER    NOT NULL,
  reported_by      UUID        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);
ALTER TABLE public.show_attendance ENABLE ROW LEVEL SECURITY;

-- ── artist_expenses ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artist_expenses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL,
  booking_id   UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  tour_stop_id UUID        REFERENCES public.tour_stops(id) ON DELETE SET NULL,
  amount       NUMERIC     NOT NULL DEFAULT 0,
  category     TEXT        NOT NULL DEFAULT 'misc',
  description  TEXT        NOT NULL DEFAULT '',
  expense_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_expenses ENABLE ROW LEVEL SECURITY;

-- ── transport_listings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_listings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID        NOT NULL,
  vehicle_type     TEXT        NOT NULL DEFAULT 'SUV',
  vehicle_capacity INTEGER     NOT NULL DEFAULT 4,
  rate_per_hour    NUMERIC,
  rate_per_trip    NUMERIC,
  cities_served    TEXT[]      DEFAULT '{}',
  description      TEXT,
  rating           NUMERIC     DEFAULT 0,
  review_count     INTEGER     DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_listings ENABLE ROW LEVEL SECURITY;

-- ── transport_bookings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID        NOT NULL REFERENCES public.transport_listings(id) ON DELETE CASCADE,
  tour_stop_id     UUID        NOT NULL REFERENCES public.tour_stops(id) ON DELETE CASCADE,
  booked_by        UUID        NOT NULL,
  provider_id      UUID        NOT NULL,
  pickup_time      TIMESTAMPTZ,
  pickup_location  TEXT,
  dropoff_location TEXT,
  total_cost       NUMERIC     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;

-- ── advance_requests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advance_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  artist_id        UUID        NOT NULL,
  amount_requested NUMERIC     NOT NULL DEFAULT 0,
  guarantee_net    NUMERIC     NOT NULL DEFAULT 0,
  fee_percent      NUMERIC     NOT NULL DEFAULT 3,
  fee_amount       NUMERIC     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending',
  evaluated_at     TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  collected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

-- ── booking_insurance ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_insurance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  policy_type     TEXT        NOT NULL DEFAULT 'cancellation',
  coverage_type   TEXT        NOT NULL,
  premium         NUMERIC     NOT NULL DEFAULT 89,
  coverage_amount NUMERIC     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'offered',
  policy_id       TEXT,
  purchased_by    UUID,
  purchased_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_insurance ENABLE ROW LEVEL SECURITY;

-- ── income_smoothing ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.income_smoothing (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id           UUID        NOT NULL,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  total_managed_income NUMERIC    NOT NULL DEFAULT 0,
  monthly_payout      NUMERIC     NOT NULL DEFAULT 0,
  fee_percent         NUMERIC     NOT NULL DEFAULT 1,
  start_date          DATE,
  end_date            DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id)
);
ALTER TABLE public.income_smoothing ENABLE ROW LEVEL SECURITY;

-- ── booking_financing ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_financing (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  promoter_id    UUID        NOT NULL,
  plan_type      TEXT        NOT NULL DEFAULT 'full',
  total_amount   NUMERIC     NOT NULL DEFAULT 0,
  monthly_payment NUMERIC,
  installments   INTEGER     DEFAULT 1,
  interest_rate  NUMERIC     DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_financing ENABLE ROW LEVEL SECURITY;

-- ── reviews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id      UUID        NOT NULL,
  reviewee_id      UUID        NOT NULL,
  reviewed_id      UUID,
  rating           INTEGER     NOT NULL,
  comment          TEXT,
  category_ratings JSONB       DEFAULT NULL,
  approved         BOOLEAN     DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ── presale_signups ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.presale_signups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  city       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT presale_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
);
ALTER TABLE public.presale_signups ENABLE ROW LEVEL SECURITY;

-- ── testimonials ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.testimonials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name TEXT        NOT NULL,
  reviewer_role TEXT        NOT NULL,
  reviewer_city TEXT,
  quote         TEXT        NOT NULL,
  rating        INTEGER     NOT NULL DEFAULT 5,
  approved      BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- ── artist_stats ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artist_stats (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID  NOT NULL,
  monthly_listeners INTEGER DEFAULT 0,
  followers        INTEGER DEFAULT 0,
  snapshot_date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);
ALTER TABLE public.artist_stats ENABLE ROW LEVEL SECURITY;

-- ── crew_availability ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_availability (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL,
  date         DATE        NOT NULL,
  is_available BOOLEAN     NOT NULL DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.crew_availability ENABLE ROW LEVEL SECURITY;

-- ── ai_tasks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  related_entity_type TEXT        NOT NULL,
  related_entity_id   UUID        NOT NULL,
  provider            TEXT        NOT NULL DEFAULT 'manus',
  task_type           TEXT        NOT NULL,
  input_payload       JSONB       DEFAULT '{}'::jsonb,
  output_payload      JSONB       DEFAULT '{}'::jsonb,
  status              TEXT        NOT NULL DEFAULT 'queued',
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

-- ── ai_recommendations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id  UUID,
  recommended_artist_id UUID      NOT NULL,
  recommendation_reason TEXT,
  suggested_price     NUMERIC,
  confidence_score    NUMERIC,
  rank_order          INTEGER     DEFAULT 0,
  status              TEXT        NOT NULL DEFAULT 'pending',
  requesting_user_id  UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- ── activity_logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  TEXT        NOT NULL DEFAULT 'system',
  actor_id    UUID,
  action_type TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  metadata    JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ── email_send_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       TEXT,
  template_name    TEXT        NOT NULL,
  recipient_email  TEXT        NOT NULL,
  status           TEXT        NOT NULL
                     CHECK (status IN ('pending','sent','suppressed','failed','bounced','complained','dlq')),
  error_message    TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- ── email_send_state ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id                              INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until               TIMESTAMPTZ,
  batch_size                      INTEGER     NOT NULL DEFAULT 10,
  send_delay_ms                   INTEGER     NOT NULL DEFAULT 200,
  auth_email_ttl_minutes          INTEGER     NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER     NOT NULL DEFAULT 60,
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

-- ── suppressed_emails ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  reason     TEXT        NOT NULL CHECK (reason IN ('unsubscribe','bounce','complaint')),
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- ── email_unsubscribe_tokens ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT        NOT NULL UNIQUE,
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at    TIMESTAMPTZ
);
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- ── stripe_webhook_events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT        PRIMARY KEY,
  event_type      TEXT        NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  booking_id      UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  outcome         TEXT
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- ── payout_failures ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payout_failures (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  artist_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id        TEXT        NOT NULL,
  payout_amount_cents      BIGINT      NOT NULL,
  currency                 TEXT        NOT NULL DEFAULT 'usd',
  stripe_error_code        TEXT,
  stripe_error_message     TEXT        NOT NULL,
  stripe_error_type        TEXT,
  stripe_event_id          TEXT,
  status                   TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','retrying','retried','failed','resolved')),
  retry_count              INTEGER     NOT NULL DEFAULT 0,
  max_retries              INTEGER     NOT NULL DEFAULT 3,
  next_retry_at            TIMESTAMPTZ,
  last_retried_at          TIMESTAMPTZ,
  resolved_transfer_id     TEXT,
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note          TEXT,
  admin_notified_at        TIMESTAMPTZ,
  admin_notification_count INTEGER     NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_failures ENABLE ROW LEVEL SECURITY;

-- ── payment_tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_tracking (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID        REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id                  UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_session_id        TEXT,
  amount_cents             INTEGER     NOT NULL DEFAULT 0,
  currency                 TEXT        DEFAULT 'usd',
  payment_type             TEXT        CHECK (payment_type IN ('deposit','final','subscription','refund')),
  status                   TEXT        DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','succeeded','failed','refunded','cancelled')),
  metadata                 JSONB       DEFAULT '{}',
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_tracking ENABLE ROW LEVEL SECURITY;

-- ── conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids  UUID[]      NOT NULL,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_message_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ── message_threads ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_threads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  subject         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- ── messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  thread_id       UUID        REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  message_type    TEXT        DEFAULT 'text' CHECK (message_type IN ('text','file','system')),
  read_by         UUID[]      DEFAULT '{}',
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── pipeline_stages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        DEFAULT '#6366f1',
  sort_order INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- ── pipeline_deals ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_deals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id    UUID        REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  artist_name TEXT,
  venue_name  TEXT,
  guarantee   NUMERIC,
  date        DATE,
  notes       TEXT,
  status      TEXT        DEFAULT 'active' CHECK (status IN ('active','won','lost','on_hold')),
  sort_order  INTEGER     DEFAULT 0,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;

-- ── booking_analytics ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_analytics (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id  UUID        REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL CHECK (event_type IN (
    'offer_sent','offer_accepted','offer_declined','offer_countered',
    'booking_confirmed','booking_cancelled','payment_received',
    'profile_view','directory_view'
  )),
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;

-- ── venue_booking_requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_booking_requests (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id           UUID        NOT NULL,
  venue_id            UUID        NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  proposed_date       DATE        NOT NULL,
  event_type          TEXT        NOT NULL DEFAULT '',
  expected_attendance INTEGER,
  message             TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending',
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_booking_requests ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 4B: Column catch-up for tables that may already exist
-- from older migrations that didn't include all columns.
-- CREATE TABLE IF NOT EXISTS is a no-op on existing tables,
-- so we must ALTER to add any missing columns before views
-- (Part 6) try to reference them.
-- ============================================================

-- ── venue_listings ────────────────────────────────────────────
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS address    TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS website    TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS region     TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS capacity   INTEGER;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS amenities  TEXT[];
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS description TEXT;

-- ── profiles ──────────────────────────────────────────────────
-- Add EVERY column from the full schema definition — covers databases
-- where profiles was created by any older migration (even a minimal one).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url               TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url               TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio                      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city                     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state                    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country                  TEXT         DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS genre                    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram                TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spotify                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apple_music              TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud               TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok                   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bandcamp                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beatport                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bandsintown              TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS songkick                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS threads                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug                     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rate_min                 NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rate_max                 NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified              BOOLEAN      DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_complete         BOOLEAN      DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended                BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan        TEXT         NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at            TIMESTAMPTZ  DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepting_bookings       BOOLEAN      NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nudge_sent_at            TIMESTAMPTZ  DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT         DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id        TEXT         DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN    DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bookscore                NUMERIC      DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completion_score         INTEGER      DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streaming_stats          JSONB        DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pitch_card_url           TEXT         DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_preferences        JSONB        NOT NULL DEFAULT '{"offer_received":true,"offer_accepted":true,"offer_declined":true,"booking_confirmed":true,"new_message":false}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seen_welcome             BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone                 TEXT         DEFAULT 'America/New_York';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_steps         JSONB        DEFAULT '{"complete_profile":false,"set_fee_range":false,"mark_available_dates":false,"share_epk":false,"receive_first_offer":false}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now();

-- Unique constraint on profiles.slug (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_slug_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ── offers ────────────────────────────────────────────────────
-- Fix offers.status if it's still an enum from old migrations
-- (SYNC_SQL_EDITOR.sql uses TEXT CHECK; old migrations used offer_status enum)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    -- Add missing enum values if the column is still enum type
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                   WHERE t.typname = 'offer_status' AND e.enumlabel = 'negotiating') THEN
      ALTER TYPE public.offer_status ADD VALUE 'negotiating';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                   WHERE t.typname = 'offer_status' AND e.enumlabel = 'countered') THEN
      ALTER TYPE public.offer_status ADD VALUE 'countered';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                   WHERE t.typname = 'offer_status' AND e.enumlabel = 'expired') THEN
      ALTER TYPE public.offer_status ADD VALUE 'expired';
    END IF;
  END IF;
END $$;

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS door_split        NUMERIC;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS merch_split       NUMERIC;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS hospitality       TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS backline          TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS commission_rate   NUMERIC NOT NULL DEFAULT 0.10;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;

-- ── bookings ──────────────────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status                   TEXT        NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_paid_at                  TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_stripe_session_id        TEXT        DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_amount                   NUMERIC     DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_paid_at                    TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_paid_at            TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_stripe_session_id  TEXT        DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_amount             NUMERIC     DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_customer_id               TEXT        DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id         TEXT        DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_rate                  NUMERIC     DEFAULT 0.20;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS presale_open                     BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS presale_ticket_url               TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS offer_id                         UUID;

-- ── reviews ───────────────────────────────────────────────────
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewed_id      UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS category_ratings JSONB    DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved         BOOLEAN  DEFAULT NULL;

UPDATE public.reviews SET reviewed_id = reviewee_id WHERE reviewed_id IS NULL AND reviewee_id IS NOT NULL;

-- ── notifications ─────────────────────────────────────────────
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- ── artist_availability ───────────────────────────────────────
ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_enabled   BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_deadline  TIMESTAMPTZ;
ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_min_price NUMERIC     DEFAULT 0;

-- ── tour_stops ────────────────────────────────────────────────
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS state            TEXT;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS load_in_time    TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS sound_check_time TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS doors_time       TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS show_time        TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS guarantee        NUMERIC DEFAULT 0;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS notes            TEXT;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS sort_order       INTEGER NOT NULL DEFAULT 0;


-- ============================================================
-- PART 5: Indexes
-- ============================================================

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_session
  ON public.bookings(deposit_stripe_session_id)
  WHERE deposit_stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_final_session
  ON public.bookings(final_payment_stripe_session_id)
  WHERE final_payment_stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_artist   ON public.bookings(artist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_promoter ON public.bookings(promoter_id);

-- stripe_webhook_events
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type, processed_at DESC);

-- payout_failures
CREATE INDEX IF NOT EXISTS idx_payout_failures_booking    ON public.payout_failures(booking_id);
CREATE INDEX IF NOT EXISTS idx_payout_failures_artist     ON public.payout_failures(artist_id);
CREATE INDEX IF NOT EXISTS idx_payout_failures_status
  ON public.payout_failures(status) WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_payout_failures_next_retry
  ON public.payout_failures(next_retry_at)
  WHERE status IN ('pending','retrying') AND next_retry_at IS NOT NULL;

-- payment_tracking
CREATE INDEX IF NOT EXISTS idx_payment_tracking_booking   ON public.payment_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_user      ON public.payment_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_stripe_pi ON public.payment_tracking(stripe_payment_intent_id);

-- admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_user ON public.admin_users(user_id);

-- deal_room_messages
CREATE INDEX IF NOT EXISTS idx_deal_room_messages_room   ON public.deal_room_messages(deal_room_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_messages_sender ON public.deal_room_messages(sender_id);

-- conversations / messages
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_messages_conversation     ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender           ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created          ON public.messages(created_at DESC);

-- crew_members
CREATE INDEX IF NOT EXISTS idx_crew_members_tour ON public.crew_members(tour_id);

-- pipeline
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user  ON public.pipeline_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deals_user   ON public.pipeline_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deals_stage  ON public.pipeline_deals(stage_id);

-- booking_analytics
CREATE INDEX IF NOT EXISTS idx_booking_analytics_user    ON public.booking_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_type    ON public.booking_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_created ON public.booking_analytics(created_at DESC);

-- venue_booking_requests
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_artist ON public.venue_booking_requests(artist_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_venue  ON public.venue_booking_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_status ON public.venue_booking_requests(status);

-- presale_signups
CREATE INDEX IF NOT EXISTS idx_presale_signups_booking ON public.presale_signups(booking_id);
CREATE INDEX IF NOT EXISTS idx_presale_signups_email   ON public.presale_signups(email);

-- email_send_log
CREATE INDEX IF NOT EXISTS idx_email_send_log_created   ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message   ON public.email_send_log(message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- suppressed_emails / unsubscribe tokens
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);


-- ============================================================
-- PART 6: Views
-- ============================================================

-- ── public_profiles ───────────────────────────────────────────
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, user_id, display_name, avatar_url, banner_url, bio, city, state, genre, slug,
  website, instagram, spotify, apple_music, soundcloud, youtube, tiktok,
  bandcamp, beatport, bandsintown, songkick, facebook, twitter, threads,
  updated_at, is_verified, role, streaming_stats, pitch_card_url
FROM public.profiles
WHERE profile_complete = true AND suspended = false;

-- ── venue_listings_public ─────────────────────────────────────
CREATE OR REPLACE VIEW public.venue_listings_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, name, city, state, address, region, capacity,
       claim_status, description, amenities, website, created_at
FROM public.venue_listings;

-- ── directory_listings ────────────────────────────────────────
CREATE OR REPLACE VIEW public.directory_listings AS
SELECT
  id,
  name,
  avatar_url,
  CASE WHEN genre IS NOT NULL THEN ARRAY[genre] ELSE '{}'::text[] END AS genres,
  origin AS city,
  NULL::text AS state,
  'artist'::text AS listing_type,
  slug,
  COALESCE(bio, notes) AS bio,
  bookscore,
  tier,
  fee_min,
  fee_max,
  CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
  claimed_by,
  instagram,
  spotify,
  tiktok,
  website
FROM public.artist_listings

UNION ALL

SELECT
  id,
  name,
  NULL::text AS avatar_url,
  '{}'::text[] AS genres,
  city,
  state,
  'venue'::text AS listing_type,
  NULL::text AS slug,
  description AS bio,
  NULL::numeric AS bookscore,
  NULL::text AS tier,
  NULL::numeric AS fee_min,
  NULL::numeric AS fee_max,
  CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
  claimed_by,
  NULL::text AS instagram,
  NULL::text AS spotify,
  NULL::text AS tiktok,
  NULL::text AS website
FROM public.venue_listings;

ALTER VIEW public.directory_listings SET (security_invoker = true);


-- ============================================================
-- PART 7: Functions
-- ============================================================

-- ── Email queue helpers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END; $$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN RETURN FALSE; END; $$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- ── Auth & user functions ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';
  INSERT INTO public.profiles (user_id, display_name, role, subscription_plan, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    CASE WHEN v_role IN ('artist','promoter','venue','production','photo_video')
         THEN v_role::public.app_role ELSE NULL END,
    'pro',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'getbookedlive@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- Grant admin to existing account (if already signed up)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'getbookedlive@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ── Trial status ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_trial_status(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prof record;
BEGIN
  SELECT subscription_plan, trial_ends_at INTO prof
  FROM public.profiles WHERE user_id = p_user_id;
  IF prof IS NULL THEN RETURN jsonb_build_object('is_trial',false,'trial_active',false); END IF;
  IF prof.trial_ends_at IS NOT NULL AND prof.subscription_plan = 'pro' THEN
    IF NOW() < prof.trial_ends_at THEN
      RETURN jsonb_build_object('is_trial',true,'trial_active',true,
        'trial_ends_at',prof.trial_ends_at,
        'days_remaining',EXTRACT(DAY FROM (prof.trial_ends_at - NOW()))::int);
    ELSE
      UPDATE public.profiles SET subscription_plan = 'free'
      WHERE user_id = p_user_id AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= NOW() AND subscription_plan = 'pro';
      RETURN jsonb_build_object('is_trial',true,'trial_active',false,
        'trial_ends_at',prof.trial_ends_at,'days_remaining',0);
    END IF;
  END IF;
  RETURN jsonb_build_object('is_trial',false,'trial_active',false);
END; $$;

GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO service_role;

-- ── Waitlist count (public RPC) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT COUNT(*)::integer FROM public.waitlist; $$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO authenticated;

-- ── PostgREST schema cache reload ────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_pgrst_reload()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN NOTIFY pgrst, 'reload schema'; END; $$;

GRANT EXECUTE ON FUNCTION public.notify_pgrst_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_pgrst_reload() TO anon;

-- ── Artist social data RPCs ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_artist_social(p_slug TEXT)
RETURNS TABLE(id UUID, name TEXT, instagram TEXT, spotify TEXT, tiktok TEXT, website TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT dl.id, dl.name, dl.instagram, dl.spotify, dl.tiktok, dl.website
  FROM public.directory_listings dl
  WHERE dl.slug = p_slug AND dl.listing_type = 'artist';
END; $$;

GRANT EXECUTE ON FUNCTION public.get_artist_social(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_artist_social(TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.get_all_artists_social()
RETURNS TABLE(id UUID, name TEXT, slug TEXT, instagram TEXT, spotify TEXT, tiktok TEXT, website TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT dl.id, dl.name, dl.slug, dl.instagram, dl.spotify, dl.tiktok, dl.website
  FROM public.directory_listings dl
  WHERE dl.listing_type = 'artist' ORDER BY dl.name;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_all_artists_social() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_artists_social() TO anon;

-- ── Artist-by-slug RPC ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_artist_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, avatar_url TEXT, bio TEXT,
  genres TEXT[], city TEXT, state TEXT, tier TEXT, bookscore NUMERIC,
  fee_min NUMERIC, fee_max NUMERIC, instagram TEXT, spotify TEXT,
  tiktok TEXT, website TEXT, is_claimed BOOLEAN, listing_type TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT dl.id, dl.name, dl.slug, dl.avatar_url, dl.bio,
         dl.genres, dl.city, dl.state, dl.tier, dl.bookscore,
         dl.fee_min, dl.fee_max, dl.instagram, dl.spotify,
         dl.tiktok, dl.website, dl.is_claimed, dl.listing_type
  FROM public.directory_listings dl
  WHERE dl.slug = p_slug LIMIT 1;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_artist_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_artist_by_slug(TEXT) TO authenticated;

-- ── Platform stats ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'artists',   (SELECT count(*) FROM profiles WHERE role='artist'     AND profile_complete=true AND suspended=false),
    'promoters', (SELECT count(*) FROM profiles WHERE role='promoter'   AND profile_complete=true AND suspended=false),
    'venues',    (SELECT count(*) FROM profiles WHERE role='venue'      AND profile_complete=true AND suspended=false),
    'production',(SELECT count(*) FROM profiles WHERE role='production' AND profile_complete=true AND suspended=false),
    'creatives', (SELECT count(*) FROM profiles WHERE role='photo_video'AND profile_complete=true AND suspended=false),
    'bookings',  (SELECT count(*) FROM bookings WHERE status='confirmed')
  ); $$;

-- ── BookScore recalculation ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_bookscore()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewed_id uuid;
  v_avg numeric;
BEGIN
  v_reviewed_id := COALESCE(NEW.reviewed_id, OLD.reviewed_id);
  IF v_reviewed_id IS NULL THEN RETURN NEW; END IF;

  SELECT ROUND(AVG(rating)::numeric, 1) INTO v_avg
  FROM public.reviews
  WHERE reviewed_id = v_reviewed_id AND (approved IS NULL OR approved = true);

  UPDATE public.profiles SET bookscore = v_avg WHERE user_id = v_reviewed_id;
  RETURN NEW;
END; $$;

-- ── Commission rate trigger function ─────────────────────────
CREATE OR REPLACE FUNCTION public.set_offer_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipient_plan text;
  computed_rate  numeric;
BEGIN
  SELECT subscription_plan INTO recipient_plan
  FROM public.profiles WHERE user_id = NEW.recipient_id;
  computed_rate := CASE COALESCE(recipient_plan,'free')
    WHEN 'pro'    THEN 0.10
    WHEN 'agency' THEN 0.06
    ELSE 0.20 END;
  NEW.commission_rate   := computed_rate;
  NEW.commission_amount := floor(NEW.guarantee * computed_rate);
  RETURN NEW;
END; $$;

-- ── Profile slug generator ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  base_slug text;
  new_slug  text;
  counter   integer := 0;
BEGIN
  IF NEW.slug IS NOT NULL THEN RETURN NEW; END IF;
  base_slug := lower(regexp_replace(COALESCE(NEW.display_name,'user'),'[^a-zA-Z0-9]+','-','g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'user'; END IF;
  new_slug := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = new_slug AND id != NEW.id);
    counter  := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := new_slug;
  RETURN NEW;
END; $$;

-- ── Protect billing fields on profiles ───────────────────────
CREATE OR REPLACE FUNCTION public.protect_billing_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    NEW.subscription_plan          := OLD.subscription_plan;
    NEW.stripe_account_id          := OLD.stripe_account_id;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.is_verified                := OLD.is_verified;
    NEW.suspended                  := OLD.suspended;
    NEW.bookscore                  := OLD.bookscore;
    NEW.completion_score           := OLD.completion_score;
  END IF;
  RETURN NEW;
END; $$;

-- ── Protect offer financial fields ────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_offer_financial_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.recipient_id AND auth.uid() != OLD.sender_id THEN
    NEW.guarantee         := OLD.guarantee;
    NEW.commission_rate   := OLD.commission_rate;
    NEW.commission_amount := OLD.commission_amount;
    NEW.door_split        := OLD.door_split;
    NEW.merch_split       := OLD.merch_split;
    NEW.venue_name        := OLD.venue_name;
    NEW.event_date        := OLD.event_date;
    NEW.event_time        := OLD.event_time;
  END IF;
  RETURN NEW;
END; $$;

-- ── Protect income smoothing fields ──────────────────────────
CREATE OR REPLACE FUNCTION public.protect_smoothing_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    NEW.fee_percent          := OLD.fee_percent;
    NEW.total_managed_income := OLD.total_managed_income;
    NEW.monthly_payout       := OLD.monthly_payout;
  END IF;
  RETURN NEW;
END; $$;

-- ── Enforce advance fee ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_advance_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan text;
BEGIN
  SELECT subscription_plan INTO v_plan FROM public.profiles WHERE user_id = NEW.artist_id;
  NEW.fee_percent := CASE COALESCE(v_plan,'free') WHEN 'pro' THEN 2 WHEN 'agency' THEN 1.5 ELSE 3 END;
  NEW.fee_amount  := floor(NEW.amount_requested * NEW.fee_percent / 100);
  RETURN NEW;
END; $$;

-- ── Artist claim approval handler ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_artist_claim_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE listing RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT name, genre, bandsintown_url INTO listing
    FROM public.artist_listings WHERE id = NEW.artist_listing_id;
    UPDATE public.profiles SET
      display_name   = COALESCE(NULLIF(display_name,''), listing.name),
      genre          = COALESCE(genre, listing.genre),
      website        = COALESCE(website, listing.bandsintown_url),
      role           = 'artist',
      profile_complete = true,
      updated_at     = now()
    WHERE user_id = NEW.user_id;
    UPDATE public.artist_listings SET
      claimed_by   = NEW.user_id,
      claim_status = 'approved'
    WHERE id = NEW.artist_listing_id;
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END; $$;

-- ── Review rating validation ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END; $$;

-- ── Notification email trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payload jsonb;
BEGIN
  payload := jsonb_build_object('record', row_to_json(NEW));
  PERFORM net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='SUPABASE_URL' LIMIT 1)
               || '/functions/v1/on-notification-created',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    ),
    body    := payload
  );
  RETURN NEW;
END; $$;


-- ============================================================
-- PART 8: Triggers
-- ============================================================

-- Auth user created → profile + admin check
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_auto_grant_admin    ON auth.users;
CREATE TRIGGER trg_auto_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_role();

-- updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tours_updated_at ON public.tours;
CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_failures_updated_at ON public.payout_failures;
CREATE TRIGGER update_payout_failures_updated_at
  BEFORE UPDATE ON public.payout_failures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_tasks_updated_at ON public.ai_tasks;
CREATE TRIGGER update_ai_tasks_updated_at
  BEFORE UPDATE ON public.ai_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile slug auto-generation
DROP TRIGGER IF EXISTS set_profile_slug ON public.profiles;
CREATE TRIGGER set_profile_slug
  BEFORE INSERT OR UPDATE OF display_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_profile_slug();

-- Commission rate on new offer
DROP TRIGGER IF EXISTS trg_set_offer_commission ON public.offers;
CREATE TRIGGER trg_set_offer_commission
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_offer_commission();

-- Protect billing fields
DROP TRIGGER IF EXISTS protect_billing_fields_trigger ON public.profiles;
CREATE TRIGGER protect_billing_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_fields();

-- Protect offer financial fields
DROP TRIGGER IF EXISTS protect_offer_financial_fields_trigger ON public.offers;
CREATE TRIGGER protect_offer_financial_fields_trigger
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.protect_offer_financial_fields();

-- Protect income smoothing
DROP TRIGGER IF EXISTS protect_smoothing_fee_trigger ON public.income_smoothing;
CREATE TRIGGER protect_smoothing_fee_trigger
  BEFORE UPDATE ON public.income_smoothing
  FOR EACH ROW EXECUTE FUNCTION public.protect_smoothing_fee();

-- Enforce advance fee
DROP TRIGGER IF EXISTS enforce_advance_fee_trigger ON public.advance_requests;
CREATE TRIGGER enforce_advance_fee_trigger
  BEFORE INSERT ON public.advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_advance_fee();

-- Artist claim approval
DROP TRIGGER IF EXISTS trg_artist_claim_approval ON public.artist_claims;
CREATE TRIGGER trg_artist_claim_approval
  BEFORE UPDATE ON public.artist_claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_artist_claim_approval();

-- Review rating validation
DROP TRIGGER IF EXISTS trg_validate_review_rating ON public.reviews;
CREATE TRIGGER trg_validate_review_rating
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- BookScore recalculation
DROP TRIGGER IF EXISTS trg_recalculate_bookscore ON public.reviews;
CREATE TRIGGER trg_recalculate_bookscore
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_bookscore();

-- Notification email trigger
DROP TRIGGER IF EXISTS on_notification_insert_email ON public.notifications;
CREATE TRIGGER on_notification_insert_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notification_email();


-- ============================================================
-- PART 9: RLS Policies
-- All wrapped in DO blocks so they're idempotent (duplicate = skip)
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── artist_listings ───────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Artist listings are viewable by everyone"
  ON public.artist_listings FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage artist listings"
  ON public.artist_listings FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Claimed owners can update artist listing"
  ON public.artist_listings FOR UPDATE TO authenticated
  USING (claimed_by = auth.uid() AND claim_status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── venue_listings ────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can browse venues via public view"
  ON public.venue_listings FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Venue owners can update their listing"
  ON public.venue_listings FOR UPDATE TO authenticated
  USING (claimed_by = auth.uid() AND claim_status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all venue listings"
  ON public.venue_listings FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── waitlist ──────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Public can join waitlist"
  ON public.waitlist FOR INSERT TO public
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view waitlist"
  ON public.waitlist FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can read waitlist"
  ON public.waitlist FOR SELECT TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── user_roles ────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Admins can view roles"
  ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Only service role can insert roles"
  ON public.user_roles FOR INSERT TO service_role WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Only service role can update roles"
  ON public.user_roles FOR UPDATE TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Only service role can delete roles"
  ON public.user_roles FOR DELETE TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── admin_users ───────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "admin_users_self"
  ON public.admin_users FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "admin_users_service"
  ON public.admin_users FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── tours ─────────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view own tours"   ON public.tours FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can create own tours" ON public.tours FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own tours" ON public.tours FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own tours" ON public.tours FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can view all tours"  ON public.tours FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── tour_stops / tour_budget_items / tour_documents ───────────
DO $$ BEGIN CREATE POLICY "Users can manage tour stops"
  ON public.tour_stops FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tours WHERE id = tour_stops.tour_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can manage budget"
  ON public.tour_budget_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tours WHERE id = tour_budget_items.tour_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can manage tour docs"
  ON public.tour_documents FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tours WHERE id = tour_documents.tour_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── crew_members ──────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can manage crew"
  ON public.crew_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tours WHERE id = crew_members.tour_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tours WHERE id = crew_members.tour_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── artist_availability ───────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can view artist availability"
  ON public.artist_availability FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Artists can manage own availability"
  ON public.artist_availability FOR ALL TO authenticated
  USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── artist_claims ─────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can create artist claims"
  ON public.artist_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view own artist claims"
  ON public.artist_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all artist claims"
  ON public.artist_claims FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can update artist claims"
  ON public.artist_claims FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── venue_claims ──────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can create claims"
  ON public.venue_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view own claims"
  ON public.venue_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all venue claims"
  ON public.venue_claims FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can update venue claims"
  ON public.venue_claims FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── venue_photos ──────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can view venue photos"
  ON public.venue_photos FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Venue owners can manage photos"
  ON public.venue_photos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.venue_listings
            WHERE id = venue_photos.venue_id AND claimed_by = auth.uid() AND claim_status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── venue_availability ────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can view availability"
  ON public.venue_availability FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Venue owners can manage availability"
  ON public.venue_availability FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.venue_listings
            WHERE id = venue_availability.venue_id AND claimed_by = auth.uid() AND claim_status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── offers ────────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view their offers"
  ON public.offers FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can create offers"
  ON public.offers FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Recipients can respond to offers"
  ON public.offers FOR UPDATE TO authenticated USING (auth.uid() = recipient_id)
  WITH CHECK (status IN ('accepted','declined','negotiating'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Senders can update own offers"
  ON public.offers FOR UPDATE TO authenticated USING (auth.uid() = sender_id)
  WITH CHECK (status = ANY(ARRAY['expired','negotiating']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all offers"
  ON public.offers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── bookings ──────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = artist_id OR auth.uid() = promoter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "System can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artist_id OR auth.uid() = promoter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = artist_id OR auth.uid() = promoter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage bookings"
  ON public.bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── deal_rooms ────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Booking parties can access deal rooms"
  ON public.deal_rooms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = deal_rooms.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = deal_rooms.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── deal_room_messages ────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "deal_room_messages_select"
  ON public.deal_room_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.deal_rooms dr
      JOIN public.bookings b ON b.id = dr.booking_id
      WHERE dr.id = deal_room_messages.deal_room_id
        AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "deal_room_messages_insert"
  ON public.deal_room_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage deal_room_messages"
  ON public.deal_room_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── deal_milestones ───────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Deal milestone access"
  ON public.deal_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deal_rooms dr
    JOIN public.bookings b ON b.id = dr.booking_id
    WHERE dr.id = deal_milestones.deal_room_id
      AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.deal_rooms dr
    JOIN public.bookings b ON b.id = dr.booking_id
    WHERE dr.id = deal_milestones.deal_room_id
      AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── notifications ─────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Only service role can insert notifications"
  ON public.notifications FOR INSERT TO service_role WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── contract_signatures ───────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view signatures for their bookings"
  ON public.contract_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE id = contract_signatures.booking_id
    AND (artist_id = auth.uid() OR promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can sign their own bookings"
  ON public.contract_signatures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.bookings WHERE id = contract_signatures.booking_id
    AND (artist_id = auth.uid() OR promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── counter_offers ────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view counters for their offers"
  ON public.counter_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.offers WHERE id = counter_offers.offer_id
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can create counters for their offers"
  ON public.counter_offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.offers WHERE id = counter_offers.offer_id
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update counters for their offers"
  ON public.counter_offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.offers WHERE id = counter_offers.offer_id
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── flash_bids ────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can view relevant flash bids"
  ON public.flash_bids FOR SELECT TO authenticated
  USING (bidder_id = auth.uid() OR artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Authenticated users can place bids"
  ON public.flash_bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Artists can update flash bids"
  ON public.flash_bids FOR UPDATE TO authenticated USING (artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── reel_clips ────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can manage own clips"
  ON public.reel_clips FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Anyone can view reel clips"
  ON public.reel_clips FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── show_attendance ───────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can report attendance for their bookings"
  ON public.show_attendance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by AND (auth.uid() = promoter_id OR auth.uid() = artist_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view attendance for their bookings"
  ON public.show_attendance FOR SELECT TO authenticated
  USING (auth.uid() = promoter_id OR auth.uid() = artist_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── artist_expenses ───────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can manage own expenses"
  ON public.artist_expenses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── transport_listings ────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can view active transport listings"
  ON public.transport_listings FOR SELECT TO public USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Providers can manage own listings"
  ON public.transport_listings FOR ALL TO authenticated USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── transport_bookings ────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can manage own transport bookings"
  ON public.transport_bookings FOR ALL TO authenticated
  USING (booked_by = auth.uid() OR provider_id = auth.uid()) WITH CHECK (booked_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── advance_requests ──────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Artists can view own advance requests"
  ON public.advance_requests FOR SELECT TO authenticated USING (artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Artists can create advance requests"
  ON public.advance_requests FOR INSERT TO authenticated WITH CHECK (artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Artists can cancel own pending requests"
  ON public.advance_requests FOR UPDATE TO authenticated
  USING (artist_id = auth.uid() AND status = 'pending') WITH CHECK (status = 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage advance requests"
  ON public.advance_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── booking_insurance ─────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Booking parties can view insurance"
  ON public.booking_insurance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_insurance.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Booking parties can manage insurance"
  ON public.booking_insurance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_insurance.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_insurance.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── income_smoothing ──────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Artists can manage own smoothing"
  ON public.income_smoothing FOR ALL TO authenticated USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── booking_financing ─────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Booking parties can view financing"
  ON public.booking_financing FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = booking_financing.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Promoters can create financing"
  ON public.booking_financing FOR INSERT TO authenticated WITH CHECK (promoter_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Promoters can update own financing"
  ON public.booking_financing FOR UPDATE TO authenticated USING (promoter_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── reviews ───────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Booking parties can create reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = reviews.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── presale_signups ───────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can insert presale signups"
  ON public.presale_signups FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = presale_signups.booking_id AND b.presale_open = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Booking parties can view presale signups"
  ON public.presale_signups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b
    WHERE b.id = presale_signups.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all presale signups"
  ON public.presale_signups FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── testimonials ──────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials FOR SELECT TO public USING (approved = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can manage all testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── artist_stats ──────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Public can read artist stats"
  ON public.artist_stats FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage stats"
  ON public.artist_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Artists can insert own stats"
  ON public.artist_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── crew_availability ─────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Users can manage own crew availability"
  ON public.crew_availability FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Anyone can view crew availability"
  ON public.crew_availability FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ai_tasks / ai_recommendations / activity_logs ─────────────
DO $$ BEGIN CREATE POLICY "Service role can manage ai_tasks"
  ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view ai_tasks"
  ON public.ai_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage ai_recommendations"
  ON public.ai_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all recommendations"
  ON public.ai_recommendations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view own recommendations"
  ON public.ai_recommendations FOR SELECT TO authenticated USING (requesting_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage activity_logs"
  ON public.activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view activity_logs"
  ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── email infrastructure ──────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Service role can read send log"
  ON public.email_send_log FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can insert send log"
  ON public.email_send_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can update send log"
  ON public.email_send_log FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage send state"
  ON public.email_send_state FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can read suppressed emails"
  ON public.suppressed_emails FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can insert suppressed emails"
  ON public.suppressed_emails FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can read tokens"
  ON public.email_unsubscribe_tokens FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can insert tokens"
  ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can mark tokens as used"
  ON public.email_unsubscribe_tokens FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── stripe_webhook_events ─────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Service role can manage stripe_webhook_events"
  ON public.stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can read stripe_webhook_events"
  ON public.stripe_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── payout_failures ───────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Artists can view own payout failures"
  ON public.payout_failures FOR SELECT TO authenticated USING (artist_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all payout failures"
  ON public.payout_failures FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can update payout failures"
  ON public.payout_failures FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role can manage payout failures"
  ON public.payout_failures FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── payment_tracking ──────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "payment_tracking_owner"
  ON public.payment_tracking FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "payment_tracking_service"
  ON public.payment_tracking FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── conversations / messages ──────────────────────────────────
DO $$ BEGIN CREATE POLICY "conversations_participant"
  ON public.conversations FOR ALL USING (auth.uid() = ANY(participant_ids));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "message_threads_via_conversation"
  ON public.message_threads FOR ALL USING (
    EXISTS (SELECT 1 FROM public.conversations c
      WHERE c.id = message_threads.conversation_id AND auth.uid() = ANY(c.participant_ids)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "messages_participant"
  ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND auth.uid() = ANY(c.participant_ids)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── pipeline ──────────────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "pipeline_stages_owner"
  ON public.pipeline_stages FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "pipeline_deals_owner"
  ON public.pipeline_deals FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── booking_analytics ─────────────────────────────────────────
DO $$ BEGIN CREATE POLICY "booking_analytics_owner"
  ON public.booking_analytics FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "booking_analytics_insert"
  ON public.booking_analytics FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "booking_analytics_service"
  ON public.booking_analytics FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── venue_booking_requests ────────────────────────────────────
DO $$ BEGIN CREATE POLICY "Artists can create booking requests"
  ON public.venue_booking_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Artists can view own booking requests"
  ON public.venue_booking_requests FOR SELECT TO authenticated USING (auth.uid() = artist_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Venue owners can view requests"
  ON public.venue_booking_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.venue_listings vl
    WHERE vl.id = venue_booking_requests.venue_id AND vl.claimed_by = auth.uid() AND vl.claim_status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Venue owners can respond to requests"
  ON public.venue_booking_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.venue_listings vl
    WHERE vl.id = venue_booking_requests.venue_id AND vl.claimed_by = auth.uid() AND vl.claim_status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all booking requests"
  ON public.venue_booking_requests FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- PART 10: Storage buckets & policies
-- ============================================================

-- Create buckets (idempotent)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',        'avatars',        true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts',      'contracts',      false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reel-clips',     'reel-clips',     true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-documents', 'tour-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('venue-photos',   'venue-photos',   true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets',   'email-assets',   true)  ON CONFLICT DO NOTHING;

-- Make contracts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'contracts';

-- Storage policies (idempotent with DO blocks)
DO $$ BEGIN CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Booking parties can read contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contracts' AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.contract_url LIKE '%' || name || '%'
      AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Booking parties can upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND EXISTS (
    SELECT 1 FROM public.bookings WHERE artist_id = auth.uid() OR promoter_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can upload reel clips"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can update own reel clips"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can delete own reel clips"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Anyone can view reel clips"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'reel-clips');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can upload tour docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tour-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view own tour docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tour-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can delete own tour docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tour-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Anyone can view venue photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'venue-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Authenticated users can upload venue photos"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'venue-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can delete own venue photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'venue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- PART 11: Grants
-- ============================================================

GRANT SELECT ON public.public_profiles        TO anon, authenticated;
GRANT SELECT ON public.venue_listings_public  TO anon, authenticated;
GRANT SELECT ON public.directory_listings     TO anon, authenticated;

-- Anon cannot read profiles table directly (must use public_profiles view)
REVOKE SELECT ON public.profiles FROM anon;


-- ============================================================
-- PART 12: Realtime publication
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['deal_room_messages','messages','notifications'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- PART 13: pg_cron — retry-payout-failures job
-- Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vault.
-- Safe to run without Vault — just skips with a NOTICE.
-- ============================================================

SELECT cron.unschedule('retry-payout-failures')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-payout-failures');

DO $$
DECLARE
  project_url TEXT;
  service_key TEXT;
BEGIN
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL'            LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'retry-payout-failures',
      '5 * * * *',
      format($cron$
        SELECT net.http_post(
          url     := %L || '/functions/v1/retry-payout',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body    := '{}'::jsonb
        );
      $cron$, project_url, service_key)
    );
    RAISE NOTICE 'retry-payout-failures cron job scheduled.';
  ELSE
    RAISE NOTICE 'Vault secrets not found — cron job NOT scheduled. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vault, then re-run Part 13.';
  END IF;
END $$;


-- ============================================================
-- VERIFICATION QUERIES (uncomment to run after the script)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
--
-- SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;
--
-- SELECT schemaname, tablename, policyname FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename, policyname;
--
-- SELECT jobname, schedule FROM cron.job WHERE jobname = 'retry-payout-failures';
--
-- SELECT id, name, public FROM storage.buckets ORDER BY name;
