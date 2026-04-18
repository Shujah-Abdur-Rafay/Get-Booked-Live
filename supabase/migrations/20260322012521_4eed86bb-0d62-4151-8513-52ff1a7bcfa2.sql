-- Fix security definer views by recreating them with security_invoker = true

CREATE OR REPLACE VIEW public.venue_listings_public
WITH (security_invoker = true)
AS
SELECT id, name, city, state, address, region, capacity, claim_status, claimed_by, description, amenities, website, created_at
FROM venue_listings;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT id, user_id, display_name, avatar_url, bio, city, state, genre, role, slug, is_verified, website, instagram, spotify, subscription_plan, updated_at
FROM profiles
WHERE profile_complete = true;

-- Grant SELECT to anon and authenticated so the views remain publicly readable
GRANT SELECT ON public.venue_listings_public TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;