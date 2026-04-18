
-- Drop the blanket public SELECT policy that exposes phone/email
DROP POLICY IF EXISTS "Venue listings public read (safe fields only)" ON public.venue_listings;

-- Allow only authenticated users to read full venue details (including phone/email)
CREATE POLICY "Authenticated users can view venue listings"
  ON public.venue_listings FOR SELECT
  TO authenticated
  USING (true);
