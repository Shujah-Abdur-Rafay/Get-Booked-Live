
CREATE TABLE public.artist_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  genre text,
  upcoming_concerts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist listings are viewable by everyone"
  ON public.artist_listings
  FOR SELECT
  TO public
  USING (true);
