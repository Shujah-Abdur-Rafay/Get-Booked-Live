
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles WITH (security_invoker = true, security_barrier = true) AS
SELECT id, user_id, display_name, avatar_url, bio, city, state, genre, role, slug,
       is_verified, website, instagram, spotify, apple_music, soundcloud, youtube,
       tiktok, bandcamp, beatport, bandsintown, songkick, updated_at
FROM profiles
WHERE profile_complete = true;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
