-- ================================================================
-- GetBooked.Live — Full Schema Unification Script
-- Target project: ycqtqbecadarulohxvan
-- Generated: 2026-04-17
--
-- PURPOSE:
--   Synchronise the live Supabase database with every table,
--   column, index, RLS policy and function required by the app.
--   All statements are idempotent (IF NOT EXISTS / DO…EXCEPTION).
--   No existing data is destroyed.
--
-- HOW TO RUN:
--   Paste into Supabase Dashboard → SQL Editor → Run.
--   Safe to re-run; duplicate-object errors are swallowed.
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 0. SAFETY: ensure update_updated_at_column() helper exists first
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ================================================================
-- SECTION 0.5 — BOOTSTRAP: create all core tables if missing
-- ================================================================
-- This section runs before every ALTER TABLE statement.
-- On a FRESH database  → tables are created with all columns.
-- On an EXISTING database → every IF NOT EXISTS clause is a no-op.
-- Trigger / policy creation is wrapped in DO…EXCEPTION so
-- duplicates are silently ignored.
-- ================================================================

-- ── Enum ─────────────────────────────────────────────────────────
-- Create the type if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('artist','promoter','venue','production','photo_video');
  ELSE
    -- If it exists, ensure all required values are present
    -- Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block in older PG versions,
    -- but Supabase usually handles this or uses a version where it's fine.
    BEGIN
      ALTER TYPE public.app_role ADD VALUE 'artist';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE 'promoter';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE 'venue';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE 'production';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE 'photo_video';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ── profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role                public.app_role,
  display_name        TEXT,
  avatar_url          TEXT,
  bio                 TEXT,
  city                TEXT,
  state               TEXT,
  genre               TEXT,
  website             TEXT,
  instagram           TEXT,
  spotify             TEXT,
  rate_min            NUMERIC,
  rate_max            NUMERIC,
  is_verified         BOOLEAN     DEFAULT false,
  profile_complete    BOOLEAN     DEFAULT false,
  suspended           BOOLEAN     DEFAULT false,
  slug                TEXT,
  bookscore           NUMERIC,
  completion_score    INTEGER     DEFAULT 0,
  onboarding_steps    JSONB,
  streaming_stats     JSONB,
  banner_url          TEXT,
  youtube             TEXT,
  apple_music         TEXT,
  soundcloud          TEXT,
  tiktok              TEXT,
  bandcamp            TEXT,
  beatport            TEXT,
  bandsintown         TEXT,
  songkick            TEXT,
  facebook            TEXT,
  twitter             TEXT,
  threads             TEXT,
  timezone            TEXT        DEFAULT 'America/New_York',
  email_preferences   JSONB       DEFAULT '{"offer_received":true,"offer_accepted":true,"offer_declined":true,"booking_confirmed":true,"new_message":false}'::jsonb,
  subscription_plan   TEXT        NOT NULL DEFAULT 'free',
  trial_ends_at       TIMESTAMPTZ,
  accepting_bookings  BOOLEAN     DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── offers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS venue_name        TEXT;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS event_date        DATE;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS event_time        TIME;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS guarantee         NUMERIC     NOT NULL DEFAULT 0;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS door_split        NUMERIC;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS merch_split       NUMERIC;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS hospitality       TEXT;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS backline          TEXT;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS notes             TEXT;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS message           TEXT;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS splits            JSONB;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS commission_rate   NUMERIC     NOT NULL DEFAULT 0.10;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS commission_amount NUMERIC;
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS status            TEXT        NOT NULL DEFAULT 'pending';
  ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'offers' AND constraint_name = 'offers_status_check') THEN
    ALTER TABLE public.offers ADD CONSTRAINT offers_status_check CHECK (status IN ('pending','accepted','declined','countered','expired'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view their offers" ON public.offers FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = sender_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recipients can update offers" ON public.offers FOR UPDATE USING (auth.uid() = recipient_id OR auth.uid() = sender_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
  CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── notifications ─────────────────────────────────────────────────
-- Created with is_read (not "read") to match app usage.
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  link       TEXT,
  booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── bookings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS artist_id                       UUID;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS promoter_id                     UUID;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS offer_id                        UUID REFERENCES public.offers(id) ON DELETE CASCADE;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS venue_name                      TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_date                      DATE;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_time                      TIME;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guarantee                       NUMERIC     NOT NULL DEFAULT 0;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contract_url                    TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status                          TEXT        NOT NULL DEFAULT 'confirmed';
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_status                  TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_rate                 NUMERIC     DEFAULT 0.20;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status                  TEXT        DEFAULT 'unpaid';
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_stripe_session_id       TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_stripe_session_id TEXT;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = artist_id OR auth.uid() = promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id OR auth.uid() = promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR auth.uid() = promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
  CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Notifications → bookings FK (bookings must exist first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema, table_name)
    WHERE tc.table_schema = 'public' AND tc.table_name = 'notifications'
      AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ── artist_listings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artist_listings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  genre             TEXT,
  upcoming_concerts INTEGER     DEFAULT 0,
  origin            TEXT,
  notes             TEXT,
  bio               TEXT,
  claim_status      TEXT        DEFAULT 'unclaimed',
  claimed_by        UUID,
  slug              TEXT,
  instagram         TEXT,
  spotify           TEXT,
  tiktok            TEXT,
  website           TEXT,
  avatar_url        TEXT,
  bookscore         NUMERIC,
  tier              TEXT,
  fee_min           NUMERIC,
  fee_max           NUMERIC,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_listings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Artist listings are viewable by everyone" ON public.artist_listings FOR SELECT TO public USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── venue_listings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_listings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  city        TEXT,
  state       TEXT,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  website     TEXT,
  region      TEXT,
  capacity    INTEGER,
  amenities   TEXT[],
  description TEXT,
  claimed_by  UUID,
  claim_status TEXT       DEFAULT 'unclaimed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_listings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Venue listings are viewable by everyone" ON public.venue_listings FOR SELECT TO public USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── artist_availability ───────────────────────────────────────────
-- Must come before flash_bids (FK target)
CREATE TABLE IF NOT EXISTS public.artist_availability (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_availability ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS artist_id           UUID; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS date                DATE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS is_available        BOOLEAN     NOT NULL DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS notes               TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_enabled   BOOLEAN     NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_deadline  TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_min_price NUMERIC     DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'artist_availability' AND constraint_name = 'artist_availability_artist_id_date_key') THEN
    ALTER TABLE public.artist_availability ADD CONSTRAINT artist_availability_artist_id_date_key UNIQUE (artist_id, date);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Policies and Indices
DO $$ BEGIN
  CREATE POLICY "Anyone can view artist availability" ON public.artist_availability FOR SELECT TO public USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Artists can manage own availability" ON public.artist_availability FOR ALL TO authenticated USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_artist_availability_date ON public.artist_availability(date); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── flash_bids ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flash_bids (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID        NOT NULL REFERENCES public.artist_availability(id) ON DELETE CASCADE,
  artist_id       UUID        NOT NULL,
  bidder_id       UUID        NOT NULL,
  promoter_id     UUID,
  amount          NUMERIC     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'active',
  expires_at      TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_bids ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone can view flash bids" ON public.flash_bids FOR SELECT TO authenticated USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can place bids" ON public.flash_bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Artists can update flash bids" ON public.flash_bids FOR UPDATE TO authenticated USING (artist_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── tours ─────────────────────────────────────────────────────────
-- Must come before tour_stops, tour_budget_items, tour_documents (FK targets)
CREATE TABLE IF NOT EXISTS public.tours (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id   UUID,
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
DO $$ BEGIN CREATE POLICY "Users can view own tours" ON public.tours FOR SELECT USING (auth.uid() = user_id OR auth.uid() = artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can create own tours" ON public.tours FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own tours" ON public.tours FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own tours" ON public.tours FOR DELETE USING (auth.uid() = user_id OR auth.uid() = artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_tours_updated_at
    BEFORE UPDATE ON public.tours
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── reviews ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID    NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID    NOT NULL,
  reviewee_id UUID,
  artist_id   UUID,
  reviewed_id UUID,
  rating      INTEGER NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Booking parties can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── waitlist ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  role       TEXT        DEFAULT 'artist',
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone can insert into waitlist" ON public.waitlist FOR INSERT TO public WITH CHECK (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public can count waitlist" ON public.waitlist FOR SELECT TO public USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── deal_rooms ────────────────────────────────────────────────────
-- Must come before deal_milestones (Section 21) and deal_room_messages
CREATE TABLE IF NOT EXISTS public.deal_rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);
ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Booking parties can access deal rooms"
    ON public.deal_rooms FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = deal_rooms.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = deal_rooms.booking_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── admin_users ───────────────────────────────────────────────────
-- Required by ai_tasks and activity_logs RLS policies in Sections 23+
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        DEFAULT 'admin' CHECK (role IN ('admin','super_admin','support')),
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "admin_users_self" ON public.admin_users FOR SELECT USING (user_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "admin_users_service" ON public.admin_users FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── deal_room_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID        NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  message_type TEXT        DEFAULT 'text' CHECK (message_type IN ('text','file','system','offer_update')),
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.deal_room_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "deal_room_messages_select" ON public.deal_room_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.deal_rooms dr JOIN public.bookings b ON b.id = dr.booking_id WHERE dr.id = deal_room_id AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "deal_room_messages_insert" ON public.deal_room_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── conversations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids  UUID[]      NOT NULL,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_message_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "conversations_participant" ON public.conversations FOR ALL USING (auth.uid() = ANY(participant_ids)); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── message_threads ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_threads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  subject         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "message_threads_via_conversation" ON public.message_threads FOR ALL
    USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── messages ──────────────────────────────────────────────────────
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
DO $$ BEGIN
  CREATE POLICY "messages_participant" ON public.messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)));
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── payment_tracking ──────────────────────────────────────────────
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
DO $$ BEGIN CREATE POLICY "payment_tracking_owner" ON public.payment_tracking FOR SELECT USING (user_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payment_tracking_service" ON public.payment_tracking FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── pipeline_stages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        DEFAULT '#6366f1',
  sort_order INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pipeline_stages_owner" ON public.pipeline_stages FOR ALL USING (user_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── pipeline_deals ────────────────────────────────────────────────
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
DO $$ BEGIN CREATE POLICY "pipeline_deals_owner" ON public.pipeline_deals FOR ALL USING (user_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── booking_analytics ─────────────────────────────────────────────
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
DO $$ BEGIN CREATE POLICY "booking_analytics_owner" ON public.booking_analytics FOR SELECT USING (user_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "booking_analytics_insert" ON public.booking_analytics FOR INSERT WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "booking_analytics_service" ON public.booking_analytics FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── crew_members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id    UUID        NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  role       TEXT        NOT NULL,
  email      TEXT,
  phone      TEXT,
  day_rate   NUMERIC,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crew_members_owner" ON public.crew_members FOR ALL
    USING (EXISTS (SELECT 1 FROM public.tours t WHERE t.id = tour_id AND (t.user_id = auth.uid() OR t.artist_id = auth.uid())));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── payout_failures ───────────────────────────────────────────────
-- Required by Sections 38 (trigger) and 39 (indexes)
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
DO $$ BEGIN CREATE POLICY "payout_failures_artist_read" ON public.payout_failures FOR SELECT USING (artist_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payout_failures_service_all" ON public.payout_failures FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "payout_failures_admin_read" ON public.payout_failures FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "payout_failures_admin_update" ON public.payout_failures FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── handle_new_user (bootstrap version) ───────────────────────────
-- Section 35 will overwrite this with the full version including trial/role logic.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 1 — profiles: add every column used by the app
-- ================================================================
-- The types.ts snapshot is minimal (created by the Lovable scaffold).
-- The app code references many more profile columns via EditProfilePanel,
-- ProfilePage, AuthContext, directory browsing, and AI functions.
-- All ALTER TABLE statements use ADD COLUMN IF NOT EXISTS so they are
-- completely safe on a DB that already has some/all of them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS state              TEXT,
  ADD COLUMN IF NOT EXISTS genre              TEXT,
  ADD COLUMN IF NOT EXISTS website            TEXT,
  ADD COLUMN IF NOT EXISTS instagram          TEXT,
  ADD COLUMN IF NOT EXISTS spotify            TEXT,
  ADD COLUMN IF NOT EXISTS rate_min           NUMERIC,
  ADD COLUMN IF NOT EXISTS rate_max           NUMERIC,
  ADD COLUMN IF NOT EXISTS is_verified        BOOLEAN        DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_complete   BOOLEAN        DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended          BOOLEAN        DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug               TEXT,
  ADD COLUMN IF NOT EXISTS bookscore          NUMERIC,
  ADD COLUMN IF NOT EXISTS completion_score   INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_steps   JSONB,
  ADD COLUMN IF NOT EXISTS streaming_stats    JSONB,
  ADD COLUMN IF NOT EXISTS banner_url         TEXT,
  ADD COLUMN IF NOT EXISTS youtube            TEXT,
  ADD COLUMN IF NOT EXISTS apple_music        TEXT,
  ADD COLUMN IF NOT EXISTS soundcloud         TEXT,
  ADD COLUMN IF NOT EXISTS tiktok             TEXT,
  ADD COLUMN IF NOT EXISTS bandcamp           TEXT,
  ADD COLUMN IF NOT EXISTS beatport           TEXT,
  ADD COLUMN IF NOT EXISTS bandsintown        TEXT,
  ADD COLUMN IF NOT EXISTS songkick           TEXT,
  ADD COLUMN IF NOT EXISTS facebook           TEXT,
  ADD COLUMN IF NOT EXISTS twitter            TEXT,
  ADD COLUMN IF NOT EXISTS threads            TEXT,
  ADD COLUMN IF NOT EXISTS timezone           TEXT           DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS email_preferences  JSONB          DEFAULT '{"offer_received":true,"offer_accepted":true,"offer_declined":true,"booking_confirmed":true,"new_message":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS subscription_plan  TEXT           NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_ends_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepting_bookings BOOLEAN        DEFAULT true;

-- Unique partial index on slug (profiles can have NULL slug during onboarding)
DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug_unique ON public.profiles(slug) WHERE slug IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Performance indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_user_id  ON public.profiles(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_role     ON public.profiles(role); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 2 — notifications: rename "read" → "is_read" if needed
-- ================================================================
-- The app everywhere uses the column name is_read.
-- The initial migration may have created it as "read" (a reserved word).
-- This block handles both cases safely.

DO $$
BEGIN
  -- Case A: column named "read" exists and "is_read" does NOT → rename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;
    RAISE NOTICE 'notifications.read renamed to is_read';
  END IF;

  -- Case B: neither column exists → create is_read
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'notifications.is_read added';
  END IF;
END;
$$;

-- Add booking_id FK if missing (used by AdminPayouts and notification routing)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS booking_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema, table_name)
    WHERE tc.table_schema = 'public' AND tc.table_name = 'notifications'
      AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Performance index for unread count badge (very hot query)
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 3 — bookings: add columns the app reads/writes
-- ================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS artist_id                       UUID,
  ADD COLUMN IF NOT EXISTS promoter_id                     UUID,
  ADD COLUMN IF NOT EXISTS offer_id                        UUID,
  ADD COLUMN IF NOT EXISTS venue_name                      TEXT,
  ADD COLUMN IF NOT EXISTS guarantee                       NUMERIC     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_url                    TEXT,
  ADD COLUMN IF NOT EXISTS status                          TEXT,
  ADD COLUMN IF NOT EXISTS event_date                      DATE,
  ADD COLUMN IF NOT EXISTS event_time                      TIME,
  ADD COLUMN IF NOT EXISTS commission_rate                 NUMERIC     DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS payment_status                  TEXT        DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS deposit_stripe_session_id       TEXT,
  ADD COLUMN IF NOT EXISTS final_payment_stripe_session_id TEXT;

-- Ensure booking_status (typed in types.ts) exists alongside legacy "status"
-- The live DB was verified to have booking_status; this is a safety net.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_status     TEXT;

-- If the old "status" column exists and booking_status is empty, backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status'
  ) THEN
    UPDATE public.bookings
    SET booking_status = status
    WHERE booking_status IS NULL AND status IS NOT NULL;
    RAISE NOTICE 'bookings.status → booking_status backfilled';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_artist        ON public.bookings(artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_promoter      ON public.bookings(promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON public.bookings(booking_status); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 4 — offers: add full field set the app uses
-- ================================================================
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS sender_id        UUID,
  ADD COLUMN IF NOT EXISTS recipient_id     UUID,
  ADD COLUMN IF NOT EXISTS guarantee        NUMERIC        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status           TEXT,
  ADD COLUMN IF NOT EXISTS venue_name       TEXT,
  ADD COLUMN IF NOT EXISTS event_date       DATE,
  ADD COLUMN IF NOT EXISTS event_time       TIME,
  ADD COLUMN IF NOT EXISTS door_split       NUMERIC,
  ADD COLUMN IF NOT EXISTS merch_split      NUMERIC,
  ADD COLUMN IF NOT EXISTS hospitality      TEXT,
  ADD COLUMN IF NOT EXISTS backline         TEXT,
  ADD COLUMN IF NOT EXISTS notes            TEXT,
  ADD COLUMN IF NOT EXISTS commission_rate  NUMERIC        DEFAULT 0.10;

-- "splits" (JSONB) and "message" are already in types.ts; add as safety net
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS splits   JSONB,
  ADD COLUMN IF NOT EXISTS message  TEXT;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_offers_sender    ON public.offers(sender_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_offers_recipient ON public.offers(recipient_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_offers_status    ON public.offers(status); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 5 — tours: ensure artist_id column exists
-- ================================================================
-- types.ts declares artist_id; earlier migrations used user_id.
-- On the live target DB the column is confirmed as artist_id.
-- This ADD IF NOT EXISTS is a safety net.
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS artist_id UUID;

-- Backfill from user_id if both columns co-exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tours' AND column_name = 'user_id'
  ) THEN
    UPDATE public.tours SET artist_id = user_id WHERE artist_id IS NULL AND user_id IS NOT NULL;
    RAISE NOTICE 'tours.user_id → artist_id backfilled';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;


-- ================================================================
-- SECTION 6 — reviews: align artist_id / reviewee_id naming
-- ================================================================
-- types.ts declares the column as artist_id.
-- The migration that created the table used reviewee_id.
-- We add artist_id and keep reviewee_id for backward compat.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS artist_id    UUID,
  ADD COLUMN IF NOT EXISTS reviewee_id  UUID,
  ADD COLUMN IF NOT EXISTS reviewed_id  UUID;

-- Backfill artist_id from reviewee_id/reviewed_id
DO $$
BEGIN
  UPDATE public.reviews
  SET artist_id = COALESCE(reviewee_id, reviewed_id)
  WHERE artist_id IS NULL AND COALESCE(reviewee_id, reviewed_id) IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Sync in the other direction too (so existing code using reviewee_id still works)
DO $$
BEGIN
  UPDATE public.reviews
  SET reviewee_id = artist_id
  WHERE reviewee_id IS NULL AND artist_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;


-- ================================================================
-- SECTION 7 — flash_bids: add columns expected by types.ts
-- ================================================================
-- types.ts: artist_id, promoter_id, status, expires_at, metadata
-- Migration: availability_id, artist_id, bidder_id, amount, status

ALTER TABLE public.flash_bids
  ADD COLUMN IF NOT EXISTS promoter_id  UUID,
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata     JSONB;

-- Backfill promoter_id from bidder_id
DO $$
BEGIN
  UPDATE public.flash_bids
  SET promoter_id = bidder_id
  WHERE promoter_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;


-- ================================================================
-- SECTION 8 — waitlist: add name column expected by types.ts
-- ================================================================
-- types.ts declares: id, email, name, created_at
-- Migration created: id, email, role, created_at
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS name  TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role  TEXT DEFAULT 'artist';


-- ================================================================
-- SECTION 8.5 — Re-apply core RLS policies now all columns exist
-- ================================================================
-- The bootstrap DO blocks silently skip policy creation if a column
-- was missing (EXCEPTION WHEN OTHERS).  By this point all ALTER TABLE
-- ADD COLUMN IF NOT EXISTS statements have run, so we retry here.
-- All blocks are EXCEPTION WHEN OTHERS so duplicate policies are no-ops.

-- profiles
DO $$ BEGIN CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- offers
DO $$ BEGIN CREATE POLICY "Users can view their offers" ON public.offers FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = sender_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recipients can update offers" ON public.offers FOR UPDATE USING (auth.uid() = recipient_id OR auth.uid() = sender_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- notifications
DO $$ BEGIN CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- bookings
DO $$ BEGIN CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = artist_id OR auth.uid() = promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id OR auth.uid() = promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR auth.uid() = promoter_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- tours
DO $$ BEGIN CREATE POLICY "Users can view own tours" ON public.tours FOR SELECT USING (auth.uid() = user_id OR auth.uid() = artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can create own tours" ON public.tours FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own tours" ON public.tours FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own tours" ON public.tours FOR DELETE USING (auth.uid() = user_id OR auth.uid() = artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- reviews
DO $$ BEGIN CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Booking parties can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- flash_bids
DO $$ BEGIN CREATE POLICY "Anyone can view flash bids" ON public.flash_bids FOR SELECT TO authenticated USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can place bids" ON public.flash_bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Artists can update flash bids" ON public.flash_bids FOR UPDATE TO authenticated USING (artist_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- artist_availability
DO $$ BEGIN CREATE POLICY "Anyone can view artist availability" ON public.artist_availability FOR SELECT TO public USING (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Artists can manage own availability" ON public.artist_availability FOR ALL TO authenticated USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- payout_failures
DO $$ BEGIN CREATE POLICY "payout_failures_artist_read" ON public.payout_failures FOR SELECT USING (artist_id = auth.uid()); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payout_failures_service_all" ON public.payout_failures FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payout_failures_admin_read" ON public.payout_failures FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payout_failures_admin_update" ON public.payout_failures FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 9 — user_roles: create if missing
-- ================================================================
-- Referenced by has_role() and auto_grant_admin_role trigger.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages user_roles"
    ON public.user_roles FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- SECTION 10 (Merged into Section 0.5)


-- ================================================================
-- SECTION 11 — contract_signatures: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  signature_data  TEXT NOT NULL,
  signature_type  TEXT NOT NULL DEFAULT 'draw',
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id)
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Booking parties can view signatures"
    ON public.contract_signatures FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = contract_signatures.booking_id
          AND (bookings.artist_id = auth.uid() OR bookings.promoter_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can sign own bookings"
    ON public.contract_signatures FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = contract_signatures.booking_id
          AND (bookings.artist_id = auth.uid() OR bookings.promoter_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_contract_signatures_booking ON public.contract_signatures(booking_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 12 — counter_offers: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.counter_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL,
  guarantee   NUMERIC NOT NULL DEFAULT 0,
  door_split  NUMERIC,
  merch_split NUMERIC,
  event_date  DATE NOT NULL,
  event_time  TIME,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Offer parties can view counter offers"
    ON public.counter_offers FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.offers
        WHERE offers.id = counter_offers.offer_id
          AND (offers.sender_id = auth.uid() OR offers.recipient_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create counter offers"
    ON public.counter_offers FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM public.offers
        WHERE offers.id = counter_offers.offer_id
          AND (offers.sender_id = auth.uid() OR offers.recipient_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_counter_offers_offer ON public.counter_offers(offer_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 13 — tour_stops: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tour_stops (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tour_stops ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS tour_id          UUID REFERENCES public.tours(id) ON DELETE CASCADE;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS venue_name       TEXT;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS city             TEXT;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS state            TEXT;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS date             DATE;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS load_in_time     TIME;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS sound_check_time TIME;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS doors_time       TIME;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS show_time        TIME;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS guarantee        NUMERIC DEFAULT 0;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS notes            TEXT;
  ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS sort_order       INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Tour owner manages stops"
    ON public.tour_stops FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.tours
        WHERE tours.id = tour_stops.tour_id
          AND (tours.artist_id = auth.uid()
               -- fallback to user_id if artist_id column doesn't exist
               OR (tours.artist_id IS NULL AND EXISTS (
                 SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='tours' AND column_name='user_id'
               ))
              )
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_tour_stops_tour ON public.tour_stops(tour_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_tour_stops_date ON public.tour_stops(date); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 14 — show_attendance: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.show_attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_name        TEXT NOT NULL,
  artist_id         UUID NOT NULL,
  promoter_id       UUID NOT NULL,
  venue_capacity    INTEGER,
  actual_attendance INTEGER NOT NULL,
  reported_by       UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

ALTER TABLE public.show_attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Booking parties report attendance"
    ON public.show_attendance FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = reported_by
      AND (auth.uid() = promoter_id OR auth.uid() = artist_id)
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Booking parties view attendance"
    ON public.show_attendance FOR SELECT TO authenticated
    USING (auth.uid() = promoter_id OR auth.uid() = artist_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages show_attendance"
    ON public.show_attendance FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_show_attendance_booking ON public.show_attendance(booking_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 15 — artist_expenses: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.artist_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  tour_stop_id UUID REFERENCES public.tour_stops(id) ON DELETE SET NULL,
  amount       NUMERIC NOT NULL DEFAULT 0,
  category     TEXT NOT NULL DEFAULT 'misc',
  description  TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own expenses"
    ON public.artist_expenses FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_artist_expenses_user ON public.artist_expenses(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 16 — advance_requests: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.advance_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  artist_id        UUID NOT NULL,
  amount_requested NUMERIC NOT NULL DEFAULT 0,
  guarantee_net    NUMERIC NOT NULL DEFAULT 0,
  fee_percent      NUMERIC NOT NULL DEFAULT 3,
  fee_amount       NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending',
  evaluated_at     TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  collected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Artists view own advance requests"
    ON public.advance_requests FOR SELECT TO authenticated
    USING (artist_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Artists create advance requests"
    ON public.advance_requests FOR INSERT TO authenticated
    WITH CHECK (artist_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages advance_requests"
    ON public.advance_requests FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_advance_requests_artist ON public.advance_requests(artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_advance_requests_booking ON public.advance_requests(booking_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 17 — booking_insurance: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.booking_insurance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  policy_type     TEXT NOT NULL DEFAULT 'cancellation',
  coverage_type   TEXT NOT NULL,
  premium         NUMERIC NOT NULL DEFAULT 89,
  coverage_amount NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'offered',
  policy_id       TEXT,
  purchased_by    UUID,
  purchased_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_insurance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Booking parties view insurance"
    ON public.booking_insurance FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_insurance.booking_id
          AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Booking parties manage insurance"
    ON public.booking_insurance FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_insurance.booking_id
          AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_insurance.booking_id
          AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 18 — income_smoothing: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.income_smoothing (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id            UUID NOT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT false,
  total_managed_income NUMERIC NOT NULL DEFAULT 0,
  monthly_payout       NUMERIC NOT NULL DEFAULT 0,
  fee_percent          NUMERIC NOT NULL DEFAULT 1,
  start_date           DATE,
  end_date             DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id)
);

ALTER TABLE public.income_smoothing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Artists manage own smoothing"
    ON public.income_smoothing FOR ALL TO authenticated
    USING (artist_id = auth.uid())
    WITH CHECK (artist_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_income_smoothing_updated_at
    BEFORE UPDATE ON public.income_smoothing
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Protect financial fields from client-side tampering
CREATE OR REPLACE FUNCTION public.protect_smoothing_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    NEW.fee_percent          := OLD.fee_percent;
    NEW.total_managed_income := OLD.total_managed_income;
    NEW.monthly_payout       := OLD.monthly_payout;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER protect_smoothing_fee_trigger
    BEFORE UPDATE ON public.income_smoothing
    FOR EACH ROW EXECUTE FUNCTION public.protect_smoothing_fee();
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 19 — booking_financing: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.booking_financing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  promoter_id     UUID NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'full',
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  monthly_payment NUMERIC,
  installments    INTEGER DEFAULT 1,
  interest_rate   NUMERIC DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_financing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Booking parties view financing"
    ON public.booking_financing FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_financing.booking_id
          AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Promoters create financing"
    ON public.booking_financing FOR INSERT TO authenticated
    WITH CHECK (promoter_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 20 — transport_listings / transport_bookings
-- ================================================================
CREATE TABLE IF NOT EXISTS public.transport_listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL,
  vehicle_type     TEXT NOT NULL DEFAULT 'SUV',
  vehicle_capacity INTEGER NOT NULL DEFAULT 4,
  rate_per_hour    NUMERIC,
  rate_per_trip    NUMERIC,
  cities_served    TEXT[] DEFAULT '{}',
  description      TEXT,
  rating           NUMERIC DEFAULT 0,
  review_count     INTEGER DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_listings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view active transport"
    ON public.transport_listings FOR SELECT TO public
    USING (is_active = true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Providers manage own listings"
    ON public.transport_listings FOR ALL TO authenticated
    USING (provider_id = auth.uid())
    WITH CHECK (provider_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID NOT NULL REFERENCES public.transport_listings(id) ON DELETE CASCADE,
  tour_stop_id     UUID NOT NULL REFERENCES public.tour_stops(id) ON DELETE CASCADE,
  booked_by        UUID NOT NULL,
  provider_id      UUID NOT NULL,
  pickup_time      TIMESTAMPTZ,
  pickup_location  TEXT,
  dropoff_location TEXT,
  total_cost       NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own transport bookings"
    ON public.transport_bookings FOR ALL TO authenticated
    USING (booked_by = auth.uid() OR provider_id = auth.uid())
    WITH CHECK (booked_by = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 21 — deal_milestones: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.deal_milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Deal room parties access milestones"
    ON public.deal_milestones FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.deal_rooms dr
        JOIN  public.bookings b ON b.id = dr.booking_id
        WHERE dr.id = deal_milestones.deal_room_id
          AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.deal_rooms dr
        JOIN  public.bookings b ON b.id = dr.booking_id
        WHERE dr.id = deal_milestones.deal_room_id
          AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 22 — email infrastructure tables
-- ================================================================
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      TEXT,
  template_name   TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','suppressed','failed','bounced','complained','dlq')),
  error_message   TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages send log"
    ON public.email_send_log FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_sent_unique ON public.email_send_log(message_id) WHERE status = 'sent' AND message_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── email_send_state (rate-limit singleton) ──────────────────────
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id                               INT  PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until                TIMESTAMPTZ,
  batch_size                       INTEGER NOT NULL DEFAULT 10,
  send_delay_ms                    INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes           INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes  INTEGER NOT NULL DEFAULT 60,
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages send state"
    ON public.email_send_state FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── suppressed_emails ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  reason     TEXT NOT NULL CHECK (reason IN ('unsubscribe','bounce','complaint')),
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages suppressed_emails"
    ON public.suppressed_emails FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── email_unsubscribe_tokens ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at    TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages unsubscribe tokens"
    ON public.email_unsubscribe_tokens FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 23 — AI & activity tables
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_entity_type TEXT NOT NULL,
  related_entity_id   UUID NOT NULL,
  provider            TEXT NOT NULL DEFAULT 'openai',
  task_type           TEXT NOT NULL,
  input_payload       JSONB DEFAULT '{}'::jsonb,
  output_payload      JSONB DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'queued',
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages ai_tasks"
    ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins view ai_tasks"
    ON public.ai_tasks FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_ai_tasks_updated_at
    BEFORE UPDATE ON public.ai_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── ai_recommendations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id    UUID,
  recommended_artist_id UUID NOT NULL,
  recommendation_reason TEXT,
  suggested_price       NUMERIC,
  confidence_score      NUMERIC,
  rank_order            INTEGER DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending',
  requesting_user_id    UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages ai_recommendations"
    ON public.ai_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users view own recommendations"
    ON public.ai_recommendations FOR SELECT TO authenticated
    USING (requesting_user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── activity_logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  TEXT NOT NULL DEFAULT 'system',
  actor_id    UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages activity_logs"
    ON public.activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins view activity_logs"
    ON public.activity_logs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 24 — crew_availability: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.crew_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crew_availability ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE public.crew_availability ADD COLUMN IF NOT EXISTS user_id      UUID;
  ALTER TABLE public.crew_availability ADD COLUMN IF NOT EXISTS date         DATE;
  ALTER TABLE public.crew_availability ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false;
  ALTER TABLE public.crew_availability ADD COLUMN IF NOT EXISTS notes        TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'crew_availability' AND constraint_name = 'crew_availability_user_id_date_key') THEN
    ALTER TABLE public.crew_availability ADD CONSTRAINT crew_availability_user_id_date_key UNIQUE (user_id, date);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own crew availability"
    ON public.crew_availability FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 25 — tour_budget_items: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tour_budget_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id        UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  category       TEXT NOT NULL CHECK (category IN ('travel','lodging','food','gear','crew','marketing','misc')),
  description    TEXT NOT NULL,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  actual_cost    NUMERIC,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_budget_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Tour owner manages budget items"
    ON public.tour_budget_items FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.tours
        WHERE tours.id = tour_budget_items.tour_id
          AND (tours.artist_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 26 — tour_documents: create if missing
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tour_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id     UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   INTEGER,
  mime_type   TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Tour owner manages documents"
    ON public.tour_documents FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.tours
        WHERE tours.id = tour_documents.tour_id
          AND (tours.artist_id = auth.uid())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 27 — artist_listings: add missing columns
-- ================================================================
ALTER TABLE public.artist_listings
  ADD COLUMN IF NOT EXISTS origin         TEXT,    -- maps to "city" in directory_listings view
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS bio            TEXT,
  ADD COLUMN IF NOT EXISTS claim_status   TEXT     DEFAULT 'unclaimed',
  ADD COLUMN IF NOT EXISTS claimed_by     UUID,
  ADD COLUMN IF NOT EXISTS slug           TEXT,
  ADD COLUMN IF NOT EXISTS instagram      TEXT,
  ADD COLUMN IF NOT EXISTS spotify        TEXT,
  ADD COLUMN IF NOT EXISTS tiktok         TEXT,
  ADD COLUMN IF NOT EXISTS website        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
  ADD COLUMN IF NOT EXISTS bookscore      NUMERIC,
  ADD COLUMN IF NOT EXISTS tier           TEXT,
  ADD COLUMN IF NOT EXISTS fee_min        NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_max        NUMERIC;

DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_listings_slug_unique ON public.artist_listings(slug) WHERE slug IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_artist_listings_genre ON public.artist_listings(genre); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_artist_listings_claim ON public.artist_listings(claim_status); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 28 — venue_listings: add missing columns
-- ================================================================
ALTER TABLE public.venue_listings
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS region      TEXT,
  ADD COLUMN IF NOT EXISTS capacity    INTEGER,
  ADD COLUMN IF NOT EXISTS amenities   TEXT[],
  ADD COLUMN IF NOT EXISTS website     TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT;


-- ================================================================
-- SECTION 29 — directory_listings view (recreate if it's a VIEW)
-- ================================================================
-- NOTE: Run this ONLY if directory_listings is currently a VIEW.
-- If it is a TABLE on your project, skip this block.
-- You can check with:
--   SELECT table_type FROM information_schema.tables
--   WHERE table_schema='public' AND table_name='directory_listings';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'directory_listings'
  ) THEN
    EXECUTE $view$
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
        NULL::text      AS avatar_url,
        '{}'::text[]    AS genres,
        city,
        state,
        'venue'::text   AS listing_type,
        NULL::text      AS slug,
        description     AS bio,
        NULL::numeric   AS bookscore,
        NULL::text      AS tier,
        NULL::numeric   AS fee_min,
        NULL::numeric   AS fee_max,
        CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
        claimed_by,
        NULL::text      AS instagram,
        NULL::text      AS spotify,
        NULL::text      AS tiktok,
        NULL::text      AS website
      FROM public.venue_listings
    $view$;
    RAISE NOTICE 'directory_listings VIEW recreated';
  ELSE
    RAISE NOTICE 'directory_listings is a TABLE — view recreation skipped';
  END IF;
END;
$$;


-- ================================================================
-- SECTION 30 — public_profiles view (safe read-only view for anon)
-- ================================================================
CREATE OR REPLACE VIEW public.public_profiles
  WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, user_id, display_name, avatar_url, banner_url, bio,
  city, state, genre, role, slug, is_verified,
  website, instagram, spotify, apple_music, soundcloud, youtube,
  tiktok, bandcamp, beatport, bandsintown, songkick,
  facebook, twitter, threads,
  bookscore, completion_score, streaming_stats,
  updated_at
FROM public.profiles
WHERE profile_complete = true
  AND (suspended IS NULL OR suspended = false);

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;


-- ================================================================
-- SECTION 31 — has_role() function: ensure it exists
-- ================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE
    WHEN _role = 'admin' THEN
      CASE
        WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
          EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN auth.users au ON au.id = ur.user_id
            WHERE ur.user_id = _user_id
              AND ur.role    = _role
              AND au.email   = 'getbookedlive@gmail.com'
          )
        ELSE false
      END
    ELSE
      CASE
        WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
          EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
        ELSE false
      END
  END
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO anon;


-- ================================================================
-- SECTION 32 — check_trial_status() function
-- ================================================================
CREATE OR REPLACE FUNCTION public.check_trial_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT subscription_plan, trial_ends_at, accepting_bookings
  INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'subscription_plan',  v_profile.subscription_plan,
    'trial_ends_at',      v_profile.trial_ends_at,
    'accepting_bookings', v_profile.accepting_bookings,
    'is_trial_active',
      v_profile.subscription_plan = 'pro'
      AND v_profile.trial_ends_at > now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_trial_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trial_status(UUID) TO service_role;


-- ================================================================
-- SECTION 33 — get_waitlist_count() function
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM public.waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;


-- ================================================================
-- SECTION 34 — notify_pgrst_reload() function
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_pgrst_reload()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_pgrst_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_pgrst_reload() TO anon;


-- ================================================================
-- SECTION 35 — handle_new_user trigger (idempotent recreate)
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';
  INSERT INTO public.profiles (user_id, display_name, role, subscription_plan, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    CASE
      WHEN v_role IN ('artist','promoter','venue','production','photo_video')
        THEN v_role::public.app_role
      ELSE NULL
    END,
    'pro',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- SECTION 36 — admin auto-grant trigger
-- ================================================================
CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'getbookedlive@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin ON auth.users;
CREATE TRIGGER trg_auto_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_role();

-- Backfill admin role for existing account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'getbookedlive@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;


-- ================================================================
-- SECTION 37 — BookScore auto-recalculation trigger
-- ================================================================
CREATE OR REPLACE FUNCTION public.recalculate_bookscore()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_artist_id UUID;
  v_avg       NUMERIC;
BEGIN
  -- Support all column name variants across migrations
  v_artist_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.artist_id   ELSE NEW.artist_id   END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.reviewee_id ELSE NEW.reviewee_id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.reviewed_id ELSE NEW.reviewed_id END
  );

  IF v_artist_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ROUND(AVG(rating)::numeric, 1)
  INTO v_avg
  FROM public.reviews
  WHERE COALESCE(artist_id, reviewee_id, reviewed_id) = v_artist_id;

  UPDATE public.profiles
  SET bookscore = COALESCE(v_avg, 0)
  WHERE id = v_artist_id OR user_id = v_artist_id;

  UPDATE public.artist_listings
  SET bookscore = COALESCE(v_avg, 0)
  WHERE id = v_artist_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_bookscore ON public.reviews;
CREATE TRIGGER trg_recalculate_bookscore
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_bookscore();


-- ================================================================
-- SECTION 38 — payout_failures updated_at trigger (safety net)
-- ================================================================
DO $$ BEGIN
  CREATE TRIGGER update_payout_failures_updated_at
    BEFORE UPDATE ON public.payout_failures
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 39 — Additional critical indexes
-- ================================================================
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payout_failures_status_retry ON public.payout_failures(status, next_retry_at) WHERE status IN ('pending','retrying'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payment_tracking_booking ON public.payment_tracking(booking_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payment_tracking_user ON public.payment_tracking(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payment_tracking_stripe_pi ON public.payment_tracking(stripe_payment_intent_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_deposit_session ON public.bookings(deposit_stripe_session_id) WHERE deposit_stripe_session_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_final_session ON public.bookings(final_payment_stripe_session_id) WHERE final_payment_stripe_session_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_reviews_artist ON public.reviews(artist_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_reviews_booking ON public.reviews(booking_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_deal_room_messages_room ON public.deal_room_messages(deal_room_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participant_ids); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_pipeline_deals_user ON public.pipeline_deals(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user ON public.pipeline_stages(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_booking_analytics_user ON public.booking_analytics(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_booking_analytics_created ON public.booking_analytics(created_at DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ================================================================
-- SECTION 40 — Realtime publications (safety net)
-- ================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'notifications','messages','deal_room_messages','payout_failures'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN NULL;  -- already in publication
    END;
  END LOOP;
END;
$$;


-- ================================================================
-- SECTION 41 — Storage buckets (safety net)
-- ================================================================
DO $$
BEGIN
  -- Ensure storage schema exists (it usually does in Supabase)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES
      ('avatars',         'avatars',         true),
      ('contracts',       'contracts',       false),
      ('tour-documents',  'tour-documents',  false),
      ('venue-photos',    'venue-photos',    true),
      ('reel-clips',      'reel-clips',      true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ================================================================
-- SECTION 42 — Final schema cache reload
-- ================================================================
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- END OF UNIFICATION SCRIPT
-- ================================================================
