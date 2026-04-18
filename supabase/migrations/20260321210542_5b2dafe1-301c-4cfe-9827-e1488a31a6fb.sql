
-- Add flash bid columns to artist_availability
ALTER TABLE public.artist_availability
  ADD COLUMN IF NOT EXISTS flash_bid_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flash_bid_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS flash_bid_min_price numeric DEFAULT 0;

-- Create flash_bids table
CREATE TABLE public.flash_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id uuid NOT NULL REFERENCES public.artist_availability(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  bidder_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flash_bids ENABLE ROW LEVEL SECURITY;

-- Anyone can view bids for flash bid dates (bid amounts are public, bidder identity hidden in UI)
CREATE POLICY "Anyone can view flash bids" ON public.flash_bids
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can place bids
CREATE POLICY "Authenticated users can place bids" ON public.flash_bids
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = bidder_id);

-- Artists can update bids on their availability (for accepting)
CREATE POLICY "Artists can update flash bids" ON public.flash_bids
  FOR UPDATE TO authenticated
  USING (artist_id = auth.uid());
