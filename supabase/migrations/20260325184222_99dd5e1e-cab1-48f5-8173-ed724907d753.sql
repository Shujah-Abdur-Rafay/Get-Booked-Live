
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Public can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Waitlist is viewable by everyone" ON public.waitlist;

-- Allow only admins to read waitlist
CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));

-- Allow service role full access
CREATE POLICY "Service role can manage waitlist"
ON public.waitlist
FOR SELECT
TO service_role
USING (true);

-- Keep the existing anon count ability via a secure approach:
-- Allow anon to insert only (for signups), no read access
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO public
WITH CHECK (true);
