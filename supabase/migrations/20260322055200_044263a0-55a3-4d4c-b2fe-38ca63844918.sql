
CREATE TABLE public.presale_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_presale_signups_booking ON public.presale_signups(booking_id);
CREATE INDEX idx_presale_signups_email ON public.presale_signups(email);

ALTER TABLE public.presale_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up (public page)
CREATE POLICY "Anyone can insert presale signups"
  ON public.presale_signups FOR INSERT
  TO public
  WITH CHECK (true);

-- Booking parties can view signups
CREATE POLICY "Booking parties can view presale signups"
  ON public.presale_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = presale_signups.booking_id
      AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
    )
  );

-- Admins can view all
CREATE POLICY "Admins can view all presale signups"
  ON public.presale_signups FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add presale columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS presale_open boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS presale_ticket_url text;
