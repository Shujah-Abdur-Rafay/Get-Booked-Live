
-- Recreate the public view WITHOUT security_invoker so it bypasses RLS
-- This is safe because the view only exposes non-sensitive columns (no phone/email)
DROP VIEW IF EXISTS public.venue_listings_public;

CREATE VIEW public.venue_listings_public AS
  SELECT id, name, city, state, address, region, capacity,
         claim_status, claimed_by, description, amenities, website, created_at
  FROM public.venue_listings;

-- Grant select to all roles so the view is publicly readable
GRANT SELECT ON public.venue_listings_public TO anon, authenticated;
