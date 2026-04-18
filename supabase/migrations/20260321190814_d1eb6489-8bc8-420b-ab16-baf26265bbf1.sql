
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  signature_data text NOT NULL,
  signature_type text NOT NULL DEFAULT 'draw',
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id)
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures for their bookings"
  ON public.contract_signatures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = contract_signatures.booking_id
      AND (bookings.artist_id = auth.uid() OR bookings.promoter_id = auth.uid())
    )
  );

CREATE POLICY "Users can sign their own bookings"
  ON public.contract_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = contract_signatures.booking_id
      AND (bookings.artist_id = auth.uid() OR bookings.promoter_id = auth.uid())
    )
  );
