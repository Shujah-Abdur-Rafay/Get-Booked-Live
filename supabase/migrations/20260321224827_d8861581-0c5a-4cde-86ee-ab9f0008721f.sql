
-- 1. VENUE LISTINGS: Restrict phone/email to venue owners only
DROP POLICY IF EXISTS "Authenticated users can view venue listings" ON public.venue_listings;

-- Owners see everything
CREATE POLICY "Venue owners can view own listing"
  ON public.venue_listings FOR SELECT
  TO authenticated
  USING (claimed_by = auth.uid() AND claim_status = 'approved');

-- Everyone else uses the venue_listings_public view (no phone/email)
-- We need a policy for the view's security_invoker to work
CREATE POLICY "Authenticated can read safe venue fields"
  ON public.venue_listings FOR SELECT
  TO authenticated
  USING (true);

-- Actually, having both policies means authenticated users see all columns.
-- We need a different approach: drop the broad policy and only allow owner access.
-- The public view doesn't need RLS since it's not security_invoker.
DROP POLICY IF EXISTS "Authenticated can read safe venue fields" ON public.venue_listings;

-- 2. CREW MEMBERS: Change from public to authenticated
DROP POLICY IF EXISTS "Users can manage crew" ON public.crew_members;

CREATE POLICY "Users can manage crew"
  ON public.crew_members FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = crew_members.tour_id AND tours.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = crew_members.tour_id AND tours.user_id = auth.uid()
  ));

-- 3. FLASH BIDS: Restrict to bidders + artist owners
DROP POLICY IF EXISTS "Anyone can view flash bids" ON public.flash_bids;

CREATE POLICY "Users can view relevant flash bids"
  ON public.flash_bids FOR SELECT
  TO authenticated
  USING (
    bidder_id = auth.uid()
    OR artist_id = auth.uid()
  );

-- 4. PROFILES: Tighten base table SELECT to own profile only; others use public_profiles view
DROP POLICY IF EXISTS "Authenticated can view public profiles" ON public.profiles;
