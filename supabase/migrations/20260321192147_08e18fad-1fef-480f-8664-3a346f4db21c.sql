
-- Recreate as security invoker view (safe for anonymous access)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
  WITH (security_invoker = true)
  AS SELECT id, display_name, avatar_url, bio, city, state, genre, slug, role, is_verified
  FROM public.profiles
  WHERE profile_complete = true;

-- Allow anonymous/public to read the view by adding a limited SELECT policy for anon
CREATE POLICY "Anonymous can view basic profile info" ON public.profiles
  FOR SELECT TO anon
  USING (profile_complete = true);
