-- Add payment tracking columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_stripe_session_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_payment_paid_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_payment_stripe_session_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_payment_amount numeric DEFAULT NULL;

-- Add payment_received notification type to notifications if not already present
-- (notifications.type is typically a text column, no enum change needed)

-- Index for fast lookup by stripe session id
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_session ON public.bookings(deposit_stripe_session_id) WHERE deposit_stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_final_session ON public.bookings(final_payment_stripe_session_id) WHERE final_payment_stripe_session_id IS NOT NULL;
