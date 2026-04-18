-- Migration: Add idempotency tracking for Stripe webhook events
-- This prevents duplicate processing if Stripe retries a successful delivery.
--
-- Strategy: Store each Stripe event ID after it is successfully processed.
-- On receipt, check for the ID first; if found, return 200 immediately.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  -- Stripe's own globally-unique event ID (e.g. "evt_1PxQ...")
  stripe_event_id   TEXT        PRIMARY KEY,
  -- Event type as reported by Stripe (e.g. "checkout.session.completed")
  event_type         TEXT        NOT NULL,
  -- When we successfully processed this event
  processed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The booking_id extracted from metadata (nullable for events without one)
  booking_id         UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  -- Short outcome note for the ops dashboard
  outcome            TEXT
);

-- Allow the service-role key (used by the webhook function) to insert/select
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on webhook events"
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast duplicate-check queries
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type, processed_at DESC);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency log for Stripe webhook events. Prevents duplicate processing on Stripe retries.';
