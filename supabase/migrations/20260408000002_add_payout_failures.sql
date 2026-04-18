-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: payout_failures — Auditable payout failure tracking
-- ─────────────────────────────────────────────────────────────────────────────
-- Every time a Stripe Connect transfer fails, a row is inserted here.
-- Ops can view all failures, trigger manual retries, and mark them resolved.
--
-- Status lifecycle:
--   pending  → Row created, not yet retried
--   retrying → An automated or manual retry is in progress
--   retried  → Retry succeeded (transfer_id populated)
--   failed   → All retries exhausted, manual intervention needed
--   resolved → Ops manually confirmed resolution (e.g., bank wire sent)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payout_failures (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The booking this payout belongs to
  booking_id            UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- The artist who should receive the payout
  artist_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe Connect account that was the intended destination
  stripe_account_id     TEXT        NOT NULL,

  -- Amount we attempted to transfer (in cents for precision)
  payout_amount_cents   BIGINT      NOT NULL,
  currency              TEXT        NOT NULL DEFAULT 'usd',

  -- The Stripe error that caused the failure
  stripe_error_code     TEXT,
  stripe_error_message  TEXT        NOT NULL,
  stripe_error_type     TEXT,       -- e.g. 'StripeInvalidRequestError'

  -- The Stripe event that triggered this payout attempt
  stripe_event_id       TEXT,

  -- Lifecycle tracking
  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'retrying', 'retried', 'failed', 'resolved')),

  -- Retry tracking
  retry_count           INTEGER     NOT NULL DEFAULT 0,
  max_retries           INTEGER     NOT NULL DEFAULT 3,
  next_retry_at         TIMESTAMPTZ,               -- when to attempt next retry
  last_retried_at       TIMESTAMPTZ,               -- when last retry was attempted

  -- If retry succeeded, record the resulting Stripe transfer ID
  resolved_transfer_id  TEXT,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- admin who resolved
  resolution_note       TEXT,       -- free-text note from ops

  -- Admin alert tracking
  admin_notified_at     TIMESTAMPTZ,  -- when we emailed/notified admins
  admin_notification_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.payout_failures ENABLE ROW LEVEL SECURITY;

-- Artists can see their own payout failures (read-only)
CREATE POLICY "payout_failures_artist_read"
  ON public.payout_failures FOR SELECT
  USING (artist_id = auth.uid());

-- Service role (webhook, retry function) has full access
CREATE POLICY "payout_failures_service_all"
  ON public.payout_failures FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins (rows in admin_users) can view and update all failures
CREATE POLICY "payout_failures_admin_read"
  ON public.payout_failures FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "payout_failures_admin_update"
  ON public.payout_failures FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payout_failures_booking
  ON public.payout_failures(booking_id);

CREATE INDEX IF NOT EXISTS idx_payout_failures_artist
  ON public.payout_failures(artist_id);

CREATE INDEX IF NOT EXISTS idx_payout_failures_status
  ON public.payout_failures(status) WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_payout_failures_next_retry
  ON public.payout_failures(next_retry_at)
  WHERE status IN ('pending', 'retrying') AND next_retry_at IS NOT NULL;

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE TRIGGER update_payout_failures_updated_at
  BEFORE UPDATE ON public.payout_failures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.payout_failures IS
  'Audit log for every failed Stripe Connect payout transfer. '
  'Supports retry tracking, admin resolution, and full audit trail. '
  'No payout failure should ever be silently lost.';

COMMENT ON COLUMN public.payout_failures.payout_amount_cents IS
  'Amount in cents (e.g. 50000 = $500.00). Using integer to avoid floating-point errors.';

COMMENT ON COLUMN public.payout_failures.next_retry_at IS
  'Populate this to schedule automated retry via the retry-payout edge function. '
  'Uses exponential backoff: 1h → 6h → 24h.';

COMMENT ON COLUMN public.payout_failures.resolved_transfer_id IS
  'Stripe transfer ID if retry succeeded. Null until then.';
