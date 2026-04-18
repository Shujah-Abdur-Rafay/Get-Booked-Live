
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Authenticated users can view all profiles (needed for directory, offers, etc.)
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Create a public view with only non-sensitive fields for anonymous directory browsing
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, display_name, avatar_url, bio, city, state, genre, slug, role, is_verified
  FROM public.profiles
  WHERE profile_complete = true;
