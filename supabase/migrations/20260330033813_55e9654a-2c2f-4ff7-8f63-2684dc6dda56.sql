-- Remove duplicate waitlist INSERT policies and replace with a single validated one
DROP POLICY IF EXISTS "Anyone can insert into waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

-- Create a single policy for public waitlist signups (not using bare true)
CREATE POLICY "Public can join waitlist"
ON public.waitlist
FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL AND length(trim(email)) > 0
);