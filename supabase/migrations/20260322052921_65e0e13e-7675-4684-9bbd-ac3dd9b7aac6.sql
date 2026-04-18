
-- Table for weekly listener snapshots (momentum tracking)
CREATE TABLE public.artist_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  monthly_listeners integer DEFAULT 0,
  followers integer DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.artist_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read stats (public data for directory badges)
CREATE POLICY "Public can read artist stats"
  ON public.artist_stats FOR SELECT
  TO public
  USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage stats"
  ON public.artist_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Artists can insert their own stats
CREATE POLICY "Artists can insert own stats"
  ON public.artist_stats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add pitch_card_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pitch_card_url text DEFAULT null;

-- Update the public_profiles view to include pitch_card_url
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, user_id, display_name, avatar_url, banner_url, bio, city, state, genre, slug,
  website, instagram, spotify, apple_music, soundcloud, youtube, tiktok,
  bandcamp, beatport, bandsintown, songkick, facebook, twitter, threads,
  updated_at, is_verified, role, streaming_stats, pitch_card_url
FROM profiles
WHERE profile_complete = true AND suspended = false;
