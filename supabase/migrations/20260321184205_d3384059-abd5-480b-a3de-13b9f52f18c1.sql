
-- Create bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  promoter_id uuid NOT NULL,
  venue_name text NOT NULL,
  event_date date NOT NULL,
  event_time time WITHOUT TIME ZONE,
  guarantee numeric NOT NULL DEFAULT 0,
  contract_url text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offer_id)
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = artist_id OR auth.uid() = promoter_id);

CREATE POLICY "System can insert bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artist_id OR auth.uid() = promoter_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = artist_id OR auth.uid() = promoter_id);

-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true)
ON CONFLICT DO NOTHING;

-- Storage RLS for contracts bucket
CREATE POLICY "Anyone can read contracts" ON storage.objects
  FOR SELECT USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can upload contracts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');
