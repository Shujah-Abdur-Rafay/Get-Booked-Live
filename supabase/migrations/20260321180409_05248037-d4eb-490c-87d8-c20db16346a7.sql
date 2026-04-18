
-- Add claim-related columns to venue_listings
ALTER TABLE public.venue_listings
  ADD COLUMN claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN claim_status text NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN description text,
  ADD COLUMN capacity integer,
  ADD COLUMN amenities text[];

-- Venue claim requests
CREATE TABLE public.venue_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  proof_text text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.venue_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create claims" ON public.venue_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own claims" ON public.venue_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Venue photos
CREATE TABLE public.venue_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venue photos" ON public.venue_photos
  FOR SELECT TO public USING (true);

CREATE POLICY "Venue owners can manage photos" ON public.venue_photos
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.venue_listings
      WHERE id = venue_photos.venue_id
        AND claimed_by = auth.uid()
        AND claim_status = 'approved'
    )
  );

-- Venue availability
CREATE TABLE public.venue_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, available_date)
);

ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability" ON public.venue_availability
  FOR SELECT TO public USING (true);

CREATE POLICY "Venue owners can manage availability" ON public.venue_availability
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.venue_listings
      WHERE id = venue_availability.venue_id
        AND claimed_by = auth.uid()
        AND claim_status = 'approved'
    )
  );

-- Update RLS on venue_listings to allow claimed owners to update
CREATE POLICY "Venue owners can update their listing" ON public.venue_listings
  FOR UPDATE TO authenticated USING (claimed_by = auth.uid() AND claim_status = 'approved');

-- Storage bucket for venue photos
INSERT INTO storage.buckets (id, name, public) VALUES ('venue-photos', 'venue-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view venue photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'venue-photos');

CREATE POLICY "Authenticated users can upload venue photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'venue-photos');

CREATE POLICY "Users can delete own venue photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'venue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
