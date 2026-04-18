
-- 1. Drop anonymous SELECT policy on profiles
DROP POLICY IF EXISTS "Anonymous can view basic profile info" ON public.profiles;

-- 2. Expand public_profiles view with fields needed by ProfilePage and sitemap
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  city,
  state,
  genre,
  role,
  slug,
  is_verified,
  website,
  instagram,
  spotify,
  updated_at
FROM public.profiles
WHERE profile_complete = true;

-- 3. Fix offer sender self-accept: remove 'accepted' from sender WITH CHECK
DROP POLICY IF EXISTS "Senders can update own offers" ON public.offers;
CREATE POLICY "Senders can update own offers"
ON public.offers FOR UPDATE TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (status = ANY (ARRAY['expired'::text, 'negotiating'::text]));

-- 4. Make contracts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'contracts';
