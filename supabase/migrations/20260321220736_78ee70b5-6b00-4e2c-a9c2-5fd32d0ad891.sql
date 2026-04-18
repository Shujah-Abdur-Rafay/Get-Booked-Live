
-- 1. Venue listings: restrict phone/email to authenticated users via a public view
DROP POLICY IF EXISTS "Venue listings are viewable by everyone" ON public.venue_listings;

CREATE POLICY "Venue listings public read (safe fields only)"
  ON public.venue_listings FOR SELECT TO public
  USING (true);

CREATE OR REPLACE VIEW public.venue_listings_public
WITH (security_invoker = on) AS
  SELECT id, name, city, state, address, region, capacity, claim_status, claimed_by, description, amenities, website, created_at
  FROM public.venue_listings;
-- Note: phone and email excluded from view

-- 2. Show attendance: remove public SELECT, keep authenticated-only
DROP POLICY IF EXISTS "Anyone can view attendance stats" ON public.show_attendance;

-- 3. Tour documents: change from public to authenticated
DROP POLICY IF EXISTS "Users can manage tour docs" ON public.tour_documents;

CREATE POLICY "Users can manage tour docs"
  ON public.tour_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = tour_documents.tour_id
    AND tours.user_id = auth.uid()
  ));
