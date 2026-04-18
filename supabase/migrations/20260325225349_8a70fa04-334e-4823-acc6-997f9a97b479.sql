-- Create a unified directory_listings view combining artist_listings and venue_listings
CREATE OR REPLACE VIEW public.directory_listings AS
SELECT
  id,
  name,
  NULL::text AS avatar_url,
  CASE WHEN genre IS NOT NULL THEN ARRAY[genre] ELSE '{}'::text[] END AS genres,
  origin AS city,
  NULL::text AS state,
  'artist'::text AS listing_type,
  NULL::text AS slug,
  notes AS bio,
  NULL::numeric AS bookscore,
  NULL::text AS tier,
  NULL::numeric AS fee_min,
  NULL::numeric AS fee_max,
  CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
  claimed_by
FROM public.artist_listings

UNION ALL

SELECT
  id,
  name,
  NULL::text AS avatar_url,
  '{}'::text[] AS genres,
  city,
  state,
  'venue'::text AS listing_type,
  NULL::text AS slug,
  description AS bio,
  NULL::numeric AS bookscore,
  NULL::text AS tier,
  NULL::numeric AS fee_min,
  NULL::numeric AS fee_max,
  CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
  claimed_by
FROM public.venue_listings;