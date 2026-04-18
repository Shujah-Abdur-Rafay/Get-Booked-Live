
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS twitter text,
  ADD COLUMN IF NOT EXISTS threads text,
  ADD COLUMN IF NOT EXISTS banner_url text;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, user_id, display_name, avatar_url, banner_url, bio, city, state, genre, slug,
  website, instagram, spotify, apple_music, soundcloud, youtube, tiktok,
  bandcamp, beatport, bandsintown, songkick, facebook, twitter, threads,
  updated_at, is_verified, role
FROM profiles
WHERE profile_complete = true AND suspended = false;
