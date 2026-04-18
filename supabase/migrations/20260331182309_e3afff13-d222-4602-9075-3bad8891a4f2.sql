
-- Create venue booking requests table
CREATE TABLE public.venue_booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  venue_id UUID NOT NULL REFERENCES public.venue_listings(id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  expected_attendance INTEGER,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venue_booking_requests ENABLE ROW LEVEL SECURITY;

-- Artists can create requests
CREATE POLICY "Artists can create booking requests"
ON public.venue_booking_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = artist_id);

-- Artists can view own requests
CREATE POLICY "Artists can view own booking requests"
ON public.venue_booking_requests
FOR SELECT
TO authenticated
USING (auth.uid() = artist_id);

-- Venue owners can view requests for their venues
CREATE POLICY "Venue owners can view requests"
ON public.venue_booking_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venue_listings vl
    WHERE vl.id = venue_booking_requests.venue_id
    AND vl.claimed_by = auth.uid()
    AND vl.claim_status = 'approved'
  )
);

-- Venue owners can respond (update status)
CREATE POLICY "Venue owners can respond to requests"
ON public.venue_booking_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venue_listings vl
    WHERE vl.id = venue_booking_requests.venue_id
    AND vl.claimed_by = auth.uid()
    AND vl.claim_status = 'approved'
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all booking requests"
ON public.venue_booking_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_venue_booking_requests_artist ON public.venue_booking_requests(artist_id);
CREATE INDEX idx_venue_booking_requests_venue ON public.venue_booking_requests(venue_id);
CREATE INDEX idx_venue_booking_requests_status ON public.venue_booking_requests(status);
