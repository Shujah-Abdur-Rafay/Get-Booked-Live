-- Add payment tracking columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_paid_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

-- Add stripe_customer_id to profiles for subscription billing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_artist_payment ON bookings(artist_id, payment_status);
