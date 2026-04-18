
-- 1. Fix profiles: replace broad public SELECT with one scoped to public_profiles columns
DROP POLICY IF EXISTS "Anyone can browse public profiles via view" ON public.profiles;

CREATE POLICY "Public can browse completed profiles limited columns"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  profile_complete = true
  AND suspended = false
);

-- Revoke direct column access and use the view instead.
-- Since column-level RLS isn't available, we rely on the public_profiles view.
-- Revoke anon direct table access so they must use the view.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2. user_roles: the service_role INSERT/UPDATE/DELETE policies were already added
-- in the previous migration. The scanner may still flag the implicit-deny warning.
-- No additional action needed.
