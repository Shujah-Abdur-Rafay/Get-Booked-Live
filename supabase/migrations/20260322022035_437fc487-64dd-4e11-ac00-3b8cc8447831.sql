
-- Expand artist_listings with Bandsintown data and claim support
ALTER TABLE public.artist_listings
  ADD COLUMN IF NOT EXISTS origin text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bandsintown_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN IF NOT EXISTS claimed_by uuid DEFAULT NULL;

-- Create artist_claims table (mirrors venue_claims pattern)
CREATE TABLE IF NOT EXISTS public.artist_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_listing_id uuid NOT NULL REFERENCES public.artist_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  proof_text text DEFAULT NULL,
  manager_name text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL
);

ALTER TABLE public.artist_claims ENABLE ROW LEVEL SECURITY;

-- Users can create claims
CREATE POLICY "Users can create artist claims"
  ON public.artist_claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own claims
CREATE POLICY "Users can view own artist claims"
  ON public.artist_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert artist listings (for admin/seeding)
CREATE POLICY "Service role can manage artist listings"
  ON public.artist_listings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Allow claimed owners to update their listing
CREATE POLICY "Claimed owners can update artist listing"
  ON public.artist_listings FOR UPDATE TO authenticated
  USING (claimed_by = auth.uid() AND claim_status = 'approved');
