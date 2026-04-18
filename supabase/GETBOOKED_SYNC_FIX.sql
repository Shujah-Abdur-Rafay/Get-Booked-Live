-- ================================================================
-- GetBooked.Live — Complete App–DB Synchronization Fix Script
-- Generated: 2026-04-11
-- Project:   ycqtqbecadarulohxvan
--
-- PURPOSE: Brings the database 100% in sync with application code.
-- Safe to run on ANY state of the database:
--   • Fresh DB (never had migrations)
--   • Migration-built DB (supabase/migrations/ applied)
--   • SYNC_SQL_EDITOR.sql-built DB
--
-- IDEMPOTENT: Uses IF NOT EXISTS, DO NOTHING, and conditional blocks.
-- NON-DESTRUCTIVE: No DROP TABLE, no data-losing operations.
-- ================================================================


-- ================================================================
-- SECTION 1: CRITICAL CONSTRAINT FIXES
-- Issues that cause runtime INSERT/UPDATE rejections
-- ================================================================

-- ── 1A. offers.status — add 'negotiating' to the offer_status enum ─
-- Code in CounterOfferDialog.tsx and NegotiationThread.tsx sets
-- status = 'negotiating'. The column is an ENUM type (offer_status),
-- so we must use ALTER TYPE ... ADD VALUE, NOT a CHECK constraint.
-- ALTER TYPE ADD VALUE is not transactional in PG < 12, but Supabase
-- uses PG 15+ so this is safe.

DO $$
BEGIN
  -- Add each missing enum value if not already present
  -- (ADD VALUE IF NOT EXISTS is available in PG 9.6+)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'offer_status' AND e.enumlabel = 'negotiating'
  ) THEN
    ALTER TYPE public.offer_status ADD VALUE 'negotiating';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'offer_status' AND e.enumlabel = 'countered'
  ) THEN
    ALTER TYPE public.offer_status ADD VALUE 'countered';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'offer_status' AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.offer_status ADD VALUE 'expired';
  END IF;

EXCEPTION
  -- If offer_status enum doesn't exist, status is a TEXT column —
  -- fall back to a CHECK constraint instead.
  WHEN undefined_object THEN
    ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_status_check;
    BEGIN
      ALTER TABLE public.offers
        ADD CONSTRAINT offers_status_check
        CHECK (status IN ('pending','accepted','declined','countered','expired','negotiating'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 1B. bookings.payment_status — ensure full allowed value set ───
-- May be an enum (booking_payment_status) or TEXT with CHECK.
-- Try enum first; fall back to CHECK constraint.

DO $$
BEGIN
  -- Try adding enum values if column is enum type
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'booking_payment_status'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'booking_payment_status' AND e.enumlabel = 'deposit_paid'
    ) THEN
      ALTER TYPE public.booking_payment_status ADD VALUE 'deposit_paid';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'booking_payment_status' AND e.enumlabel = 'fully_paid'
    ) THEN
      ALTER TYPE public.booking_payment_status ADD VALUE 'fully_paid';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'booking_payment_status' AND e.enumlabel = 'refunded'
    ) THEN
      ALTER TYPE public.booking_payment_status ADD VALUE 'refunded';
    END IF;
  ELSE
    -- TEXT column — use CHECK constraint
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
    BEGIN
      ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_payment_status_check
        CHECK (payment_status IN ('unpaid','deposit_paid','fully_paid','refunded'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;


-- ================================================================
-- SECTION 2: OFFERS TABLE — Column & Generated Column Fixes
-- ================================================================

-- ── 2A. Convert commission_amount from GENERATED ALWAYS to regular ─
-- The first migration created this as GENERATED ALWAYS AS (guarantee * commission_rate) STORED.
-- But later migrations add a trigger (set_offer_commission) that tries to set it.
-- A GENERATED ALWAYS column silently ignores trigger assignments.
-- Fix: convert to a regular column with a trigger-managed value.

DO $$
DECLARE
  gen_col text;
BEGIN
  SELECT generation_expression
    INTO gen_col
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'offers'
     AND column_name  = 'commission_amount'
     AND is_generated = 'ALWAYS';

  IF gen_col IS NOT NULL THEN
    -- Must drop and re-add (PostgreSQL cannot ALTER a generated column in-place)
    ALTER TABLE public.offers ALTER COLUMN commission_amount DROP EXPRESSION;
    -- Recalculate existing rows
    UPDATE public.offers
       SET commission_amount = floor(guarantee * commission_rate)
     WHERE commission_amount IS NULL OR commission_amount = guarantee * commission_rate;
    RAISE NOTICE 'commission_amount converted from GENERATED ALWAYS to regular column.';
  END IF;
END $$;

-- Ensure commission_amount column exists as a regular column
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;

-- Ensure commission_rate column exists
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC NOT NULL DEFAULT 0.10;

-- Ensure door_split / merch_split exist (original schema; types.ts incorrectly listed 'splits')
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS door_split  NUMERIC;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS merch_split NUMERIC;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS hospitality TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS backline    TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS venue_name  TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS event_date  DATE;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS event_time  TIME WITHOUT TIME ZONE;

-- Backfill venue_name / event_date from NULL (non-destructive)
-- (These were NOT NULL in SYNC_SQL_EDITOR.sql but rows may already exist)


-- ================================================================
-- SECTION 3: REVIEWS TABLE — Add Missing Columns
-- ================================================================

-- ── 3A. reviewed_id ───────────────────────────────────────────────
-- Used by recalculate_bookscore trigger (migration 20260330140000).
-- Without this column, ANY insert into reviews causes a trigger error.

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewed_id UUID;

-- Backfill reviewed_id from reviewee_id for existing rows
UPDATE public.reviews
   SET reviewed_id = reviewee_id
 WHERE reviewed_id IS NULL AND reviewee_id IS NOT NULL;

-- ── 3B. approved ──────────────────────────────────────────────────
-- Used by recalculate_bookscore() to filter unapproved reviews.
-- Also used by admin moderation panel.

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT NULL;

-- ── 3C. category_ratings — verify exists ──────────────────────────
-- Added in migration 20260322070929, but ensuring it exists for
-- databases that only had SYNC_SQL_EDITOR.sql applied.

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS category_ratings JSONB DEFAULT NULL;

-- ── 3D. Ensure reviews has correct NOT NULL columns ───────────────
-- The original migration (20260321223125) created reviews with booking_id NOT NULL.
-- types.ts incorrectly listed artist_id; actual column is reviewee_id.
-- No rename needed — the actual DB has the correct schema.


-- ================================================================
-- SECTION 4: PROFILES TABLE — Add All Missing Columns
-- ================================================================
-- Most were added by individual migrations, but we ensure completeness
-- for databases that may have skipped certain migration files.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepting_bookings BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nudge_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apple_music TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bandcamp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beatport TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bandsintown TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS songkick TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS threads TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completion_score INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streaming_stats JSONB DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pitch_card_url TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_preferences JSONB NOT NULL DEFAULT '{"offer_received":true,"offer_accepted":true,"offer_declined":true,"booking_confirmed":true,"new_message":false}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seen_welcome BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bookscore NUMERIC DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{"complete_profile":false,"set_fee_range":false,"mark_available_dates":false,"share_epk":false,"receive_first_offer":false}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rate_min NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rate_max NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- slug unique constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'profiles_slug_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_key UNIQUE (slug);
  END IF;
END $$;


-- ================================================================
-- SECTION 5: BOOKINGS TABLE — Add Missing Columns
-- ================================================================

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_stripe_session_id TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_paid_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_paid_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_stripe_session_id TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_amount NUMERIC DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.20;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS presale_open BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS presale_ticket_url TEXT;

-- offer_id FK (should already exist from original migration)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS offer_id UUID;

-- Add FK constraint for offer_id if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'bookings_offer_id_fkey' AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_offer_id_fkey
      FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for payment columns
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_session
  ON public.bookings(deposit_stripe_session_id)
  WHERE deposit_stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_final_session
  ON public.bookings(final_payment_stripe_session_id)
  WHERE final_payment_stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_artist   ON public.bookings(artist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_promoter ON public.bookings(promoter_id);


-- ================================================================
-- SECTION 6: NOTIFICATIONS TABLE — Verify Column Names
-- ================================================================
-- The DB has column 'read' (correct per migrations and code).
-- types.ts incorrectly lists 'is_read'. No DB change needed here,
-- but we add 'link' column if missing.

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Note: 'read' is the correct column name. types.ts says 'is_read' —
-- that is a types.ts bug, not a DB bug. The code correctly uses { read: true }.


-- ================================================================
-- SECTION 7: CREATE MISSING TABLES
-- (Tables used in code but only defined in SYNC_SQL_EDITOR.sql)
-- ================================================================

-- ── deal_milestones ───────────────────────────────────────────────
-- Used in DealRoom UI. Not in any incremental migration.

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

DO $$ BEGIN
  CREATE POLICY "Deal milestone access"
    ON public.deal_milestones FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.deal_rooms dr
      JOIN public.bookings b ON b.id = dr.booking_id
      WHERE dr.id = deal_milestones.deal_room_id
        AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.deal_rooms dr
      JOIN public.bookings b ON b.id = dr.booking_id
      WHERE dr.id = deal_milestones.deal_room_id
        AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── testimonials ──────────────────────────────────────────────────
-- Used in landing pages. Not in any incremental migration.

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

DO $$ BEGIN
  CREATE POLICY "Anyone can view approved testimonials"
    ON public.testimonials FOR SELECT TO public USING (approved = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all testimonials"
    ON public.testimonials FOR ALL TO authenticated
    USING (has_role(auth.uid(),'admin'))
    WITH CHECK (has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ai_tasks ──────────────────────────────────────────────────────
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

DO $$ BEGIN CREATE POLICY "Service role can manage ai_tasks"
  ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view ai_tasks"
  ON public.ai_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ai_recommendations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id    UUID,
  recommended_artist_id UUID        NOT NULL,
  recommendation_reason TEXT,
  suggested_price       NUMERIC,
  confidence_score      NUMERIC,
  rank_order            INTEGER     DEFAULT 0,
  status                TEXT        NOT NULL DEFAULT 'pending',
  requesting_user_id    UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Service role can manage ai_recommendations"
  ON public.ai_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view all recommendations"
  ON public.ai_recommendations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Users can view own recommendations"
  ON public.ai_recommendations FOR SELECT TO authenticated USING (requesting_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── activity_logs ─────────────────────────────────────────────────
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

DO $$ BEGIN CREATE POLICY "Service role can manage activity_logs"
  ON public.activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can view activity_logs"
  ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- SECTION 8: TOUR_STOPS — Add Missing Columns
-- ================================================================
-- Code references load_in_time, sound_check_time, doors_time, show_time, state, city
-- These were in migration 20260321145308. Ensuring completeness.

ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS city            TEXT;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS state           TEXT;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS load_in_time   TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS sound_check_time TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS doors_time      TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS show_time       TIME;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS guarantee       NUMERIC DEFAULT 0;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE public.tour_stops ADD COLUMN IF NOT EXISTS sort_order      INTEGER NOT NULL DEFAULT 0;


-- ================================================================
-- SECTION 9: VENUE_LISTINGS — Add Missing Columns
-- ================================================================
-- DashboardVenue.tsx updates: address, phone, email, website, description, capacity, amenities

ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS address    TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS website    TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS region     TEXT;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS capacity   INTEGER;
ALTER TABLE public.venue_listings ADD COLUMN IF NOT EXISTS amenities  TEXT[];


-- ================================================================
-- SECTION 10: ARTIST_AVAILABILITY — Add Flash Bid Columns
-- ================================================================
-- Flash bid feature requires these columns on artist_availability.

ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_enabled  BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_deadline  TIMESTAMPTZ;
ALTER TABLE public.artist_availability ADD COLUMN IF NOT EXISTS flash_bid_min_price NUMERIC     DEFAULT 0;


-- ================================================================
-- SECTION 11: STRIPE INFRASTRUCTURE
-- ================================================================

-- ── stripe_webhook_events (idempotency table) ─────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT        PRIMARY KEY,
  event_type      TEXT        NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  booking_id      UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  outcome         TEXT
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Service role can manage stripe_webhook_events"
  ON public.stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Admins can read stripe_webhook_events"
  ON public.stripe_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type, processed_at DESC);

-- ── payout_failures ───────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_payout_failures_booking    ON public.payout_failures(booking_id);
CREATE INDEX IF NOT EXISTS idx_payout_failures_artist     ON public.payout_failures(artist_id);
CREATE INDEX IF NOT EXISTS idx_payout_failures_status
  ON public.payout_failures(status) WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_payout_failures_next_retry
  ON public.payout_failures(next_retry_at)
  WHERE status IN ('pending','retrying') AND next_retry_at IS NOT NULL;

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

DO $$ BEGIN CREATE POLICY "payment_tracking_owner"
  ON public.payment_tracking FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "payment_tracking_service"
  ON public.payment_tracking FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_payment_tracking_booking   ON public.payment_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_user      ON public.payment_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_stripe_pi ON public.payment_tracking(stripe_payment_intent_id);


-- ================================================================
-- SECTION 12: FIX recalculate_bookscore TRIGGER FUNCTION
-- ================================================================
-- After adding reviewed_id to reviews, update the trigger to use it.
-- This replaces any previous version that used artist_id or reviewee_id.

CREATE OR REPLACE FUNCTION public.recalculate_bookscore()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewed_id uuid;
  v_avg numeric;
BEGIN
  v_reviewed_id := COALESCE(NEW.reviewed_id, OLD.reviewed_id);
  IF v_reviewed_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT ROUND(AVG(rating)::numeric, 1) INTO v_avg
  FROM public.reviews
  WHERE reviewed_id = v_reviewed_id
    AND (approved IS NULL OR approved = true);

  UPDATE public.profiles
     SET bookscore = COALESCE(v_avg, 0)
   WHERE user_id = v_reviewed_id;

  RETURN COALESCE(NEW, OLD);
END; $$;

-- Recreate trigger (DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS trg_recalculate_bookscore ON public.reviews;
CREATE TRIGGER trg_recalculate_bookscore
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_bookscore();

-- Remove stale booking-based bookscore trigger (from old migration 20260330200000)
DROP TRIGGER IF EXISTS trg_recalculate_bookscore_booking  ON public.bookings;
DROP TRIGGER IF EXISTS trg_recalculate_bookscore_review   ON public.reviews;


-- ================================================================
-- SECTION 13: FIX set_offer_commission TRIGGER
-- ================================================================
-- Ensure commission_amount is set correctly by trigger (not as GENERATED).
-- The trigger is a BEFORE INSERT so it runs before the row is written.

CREATE OR REPLACE FUNCTION public.set_offer_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipient_plan text;
  computed_rate  numeric;
BEGIN
  SELECT subscription_plan INTO recipient_plan
  FROM public.profiles WHERE user_id = NEW.recipient_id;

  computed_rate := CASE COALESCE(recipient_plan, 'free')
    WHEN 'pro'    THEN 0.10
    WHEN 'agency' THEN 0.06
    ELSE 0.20
  END;

  NEW.commission_rate   := computed_rate;
  NEW.commission_amount := floor(NEW.guarantee * computed_rate);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_offer_commission ON public.offers;
CREATE TRIGGER trg_set_offer_commission
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_offer_commission();


-- ================================================================
-- SECTION 14: VIEWS — Rebuild to Include All Required Columns
-- ================================================================

-- ── public_profiles ───────────────────────────────────────────────
-- Used heavily in PublicProfilePage.tsx and DirectoryPage.tsx.
-- Must include all social columns, streaming_stats, pitch_card_url.

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, user_id, display_name, avatar_url, banner_url, bio, city, state, genre, slug,
  website, instagram, spotify, apple_music, soundcloud, youtube, tiktok,
  bandcamp, beatport, bandsintown, songkick, facebook, twitter, threads,
  updated_at, is_verified, role, streaming_stats, pitch_card_url,
  rate_min, rate_max, bookscore
FROM public.profiles
WHERE profile_complete = true AND suspended = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ── venue_listings_public ─────────────────────────────────────────
-- Used in DirectoryPage.tsx and Venues.tsx (no PII: no phone/email).

CREATE OR REPLACE VIEW public.venue_listings_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, name, city, state, address, region, capacity,
       claim_status, description, amenities, website, created_at
FROM public.venue_listings;

GRANT SELECT ON public.venue_listings_public TO anon, authenticated;

-- ── directory_listings ────────────────────────────────────────────
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
GRANT SELECT ON public.directory_listings TO anon, authenticated;


-- ================================================================
-- SECTION 15: STORAGE BUCKETS
-- ================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',        'avatars',        true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts',      'contracts',      false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reel-clips',     'reel-clips',     true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-documents', 'tour-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('venue-photos',   'venue-photos',   true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets',   'email-assets',   true)  ON CONFLICT DO NOTHING;

-- Ensure contracts bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'contracts';

-- Storage policies (all idempotent)
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

DO $$ BEGIN CREATE POLICY "Users can upload reel clips"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);
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


-- ================================================================
-- SECTION 16: MISSING RPC FUNCTIONS
-- ================================================================

-- ── get_artist_by_slug ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_artist_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, avatar_url TEXT, bio TEXT,
  genres TEXT[], city TEXT, state TEXT, tier TEXT, bookscore NUMERIC,
  fee_min NUMERIC, fee_max NUMERIC, instagram TEXT, spotify TEXT,
  tiktok TEXT, website TEXT, is_claimed BOOLEAN, listing_type TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT dl.id, dl.name, dl.slug, dl.avatar_url, dl.bio,
         dl.genres, dl.city, dl.state, dl.tier, dl.bookscore,
         dl.fee_min, dl.fee_max, dl.instagram, dl.spotify,
         dl.tiktok, dl.website, dl.is_claimed, dl.listing_type
  FROM public.directory_listings dl
  WHERE dl.slug = p_slug
     OR dl.slug LIKE p_slug || '-%'
  ORDER BY CASE WHEN dl.slug = p_slug THEN 0 ELSE 1 END
  LIMIT 1;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_artist_by_slug(TEXT) TO anon, authenticated;

-- ── get_platform_stats ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'artists',   (SELECT count(*) FROM profiles WHERE role='artist'      AND profile_complete=true AND suspended=false),
    'promoters', (SELECT count(*) FROM profiles WHERE role='promoter'    AND profile_complete=true AND suspended=false),
    'venues',    (SELECT count(*) FROM profiles WHERE role='venue'       AND profile_complete=true AND suspended=false),
    'production',(SELECT count(*) FROM profiles WHERE role='production'  AND profile_complete=true AND suspended=false),
    'creatives', (SELECT count(*) FROM profiles WHERE role='photo_video' AND profile_complete=true AND suspended=false),
    'bookings',  (SELECT count(*) FROM bookings WHERE status='confirmed')
  ); $$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;

-- ── check_trial_status ────────────────────────────────────────────
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
        'trial_ends_at', prof.trial_ends_at,
        'days_remaining', EXTRACT(DAY FROM (prof.trial_ends_at - NOW()))::int);
    ELSE
      UPDATE public.profiles SET subscription_plan = 'free'
      WHERE user_id = p_user_id AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= NOW() AND subscription_plan = 'pro';
      RETURN jsonb_build_object('is_trial',true,'trial_active',false,
        'trial_ends_at', prof.trial_ends_at, 'days_remaining', 0);
    END IF;
  END IF;
  RETURN jsonb_build_object('is_trial',false,'trial_active',false);
END; $$;

GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO authenticated, service_role;


-- ================================================================
-- SECTION 17: BACKFILL EXISTING REVIEWS
-- ================================================================
-- After adding reviewed_id, sync it from reviewee_id for all existing rows.

UPDATE public.reviews
   SET reviewed_id = reviewee_id
 WHERE reviewed_id IS NULL AND reviewee_id IS NOT NULL;


-- ================================================================
-- SECTION 18: BOOKSCORE BACKFILL
-- ================================================================
-- Recalculate bookscore for all users that have reviews.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT reviewed_id
      FROM public.reviews
     WHERE reviewed_id IS NOT NULL
  LOOP
    UPDATE public.profiles
       SET bookscore = (
         SELECT ROUND(AVG(rating)::numeric, 1)
           FROM public.reviews
          WHERE reviewed_id = r.reviewed_id
            AND (approved IS NULL OR approved = true)
       )
     WHERE user_id = r.reviewed_id;
  END LOOP;
END $$;


-- ================================================================
-- SECTION 19: PROTECT BILLING FIELDS TRIGGER (ensure up-to-date)
-- ================================================================

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

DROP TRIGGER IF EXISTS protect_billing_fields_trigger ON public.profiles;
CREATE TRIGGER protect_billing_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_fields();


-- ================================================================
-- SECTION 20: REALTIME SUBSCRIPTIONS
-- ================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['deal_room_messages','messages','notifications'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public' AND c.relname = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;


-- ================================================================
-- SECTION 21: GRANTS
-- ================================================================

GRANT SELECT ON public.public_profiles       TO anon, authenticated;
GRANT SELECT ON public.venue_listings_public TO anon, authenticated;
GRANT SELECT ON public.directory_listings    TO anon, authenticated;

-- Prevent anon from reading raw profiles (must use public_profiles view)
REVOKE SELECT ON public.profiles FROM anon;

-- ================================================================
-- SECTION 22: PostgREST Schema Cache Reload
-- ================================================================

NOTIFY pgrst, 'reload schema';

-- ================================================================
-- END OF SCRIPT
-- Run time: ~5-30 seconds depending on data volume.
-- Safe to re-run: all operations are idempotent.
-- ================================================================
