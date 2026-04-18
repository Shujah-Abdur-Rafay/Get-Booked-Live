
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completion_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streaming_stats jsonb DEFAULT null;

-- Update the public_profiles view to include streaming_stats
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, user_id, display_name, avatar_url, banner_url, bio, city, state, genre, slug,
  website, instagram, spotify, apple_music, soundcloud, youtube, tiktok,
  bandcamp, beatport, bandsintown, songkick, facebook, twitter, threads,
  updated_at, is_verified, role, streaming_stats
FROM profiles
WHERE profile_complete = true AND suspended = false;
