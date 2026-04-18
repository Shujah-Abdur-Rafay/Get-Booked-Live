-- IMPROVEMENT 6: Add accepting_bookings column to profiles table
-- Default is TRUE so new artists are immediately discoverable
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepting_bookings boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.accepting_bookings IS 'Whether the artist is currently open to receiving booking offers. Defaults to true for new signups.';

-- IMPROVEMENT 8: Track when the 24h activation nudge email was sent
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nudge_sent_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN profiles.nudge_sent_at IS 'Timestamp when the 24h activation nudge email was sent. NULL means not yet sent.';
