
CREATE TABLE public.venue_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  address text,
  phone text,
  email text,
  website text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue listings are viewable by everyone"
  ON public.venue_listings
  FOR SELECT
  TO public
  USING (true);
