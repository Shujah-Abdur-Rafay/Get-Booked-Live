
-- 1. Fix venue_listings: remove broad public SELECT, restrict to owners/admins
DROP POLICY IF EXISTS "Anyone can browse venues via public view" ON public.venue_listings;

CREATE POLICY "Owners can view own venue listings"
ON public.venue_listings
FOR SELECT
TO authenticated
USING (claimed_by = auth.uid() AND claim_status = 'approved');

CREATE POLICY "Admins can view all venue listings"
ON public.venue_listings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 2. Fix user_roles: explicit service_role-only INSERT/UPDATE/DELETE
CREATE POLICY "Only service role can insert roles"
ON public.user_roles
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can delete roles"
ON public.user_roles
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Only service role can update roles"
ON public.user_roles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
