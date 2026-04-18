
-- Fix 1: Recreate venue_listings_public as SECURITY INVOKER, remove claimed_by
DROP VIEW IF EXISTS public.venue_listings_public;

CREATE VIEW public.venue_listings_public
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  id,
  name,
  city,
  state,
  address,
  region,
  capacity,
  claim_status,
  description,
  amenities,
  website,
  created_at
FROM public.venue_listings;

-- Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.venue_listings_public TO anon, authenticated;

-- Add a SELECT policy on venue_listings for anon/authenticated to read non-PII columns
-- (the view restricts which columns are visible)
CREATE POLICY "Anyone can browse venues via public view"
  ON public.venue_listings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Drop the old owner-only SELECT policy since the new broad one covers it
DROP POLICY IF EXISTS "Venue owners can view own listing" ON public.venue_listings;

-- Fix 2: Recreate public_profiles as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true)
AS
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

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a SELECT policy on profiles for anon to read completed profiles
-- (view already filters to profile_complete = true and excludes PII)
CREATE POLICY "Anyone can browse public profiles via view"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (profile_complete = true);
