CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'artists', (SELECT count(*) FROM profiles WHERE role = 'artist' AND profile_complete = true AND suspended = false),
    'promoters', (SELECT count(*) FROM profiles WHERE role = 'promoter' AND profile_complete = true AND suspended = false),
    'venues', (SELECT count(*) FROM profiles WHERE role = 'venue' AND profile_complete = true AND suspended = false),
    'production', (SELECT count(*) FROM profiles WHERE role = 'production' AND profile_complete = true AND suspended = false),
    'creatives', (SELECT count(*) FROM profiles WHERE role = 'photo_video' AND profile_complete = true AND suspended = false),
    'bookings', (SELECT count(*) FROM bookings WHERE status = 'confirmed')
  );
$$;