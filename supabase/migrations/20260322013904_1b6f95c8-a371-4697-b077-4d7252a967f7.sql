-- Must drop and recreate since we're removing subscription_plan column from public_profiles
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.venue_listings_public;

-- Recreate venue_listings_public with security_barrier (not security_invoker)
CREATE VIEW public.venue_listings_public
WITH (security_barrier = true)
AS
SELECT id, name, city, state, address, region, capacity, claim_status, claimed_by, description, amenities, website, created_at
FROM venue_listings;

-- Recreate public_profiles without subscription_plan (prevents account tier leakage)
CREATE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT id, user_id, display_name, avatar_url, bio, city, state, genre, role, slug, is_verified, website, instagram, spotify, updated_at
FROM profiles
WHERE profile_complete = true;

GRANT SELECT ON public.venue_listings_public TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;