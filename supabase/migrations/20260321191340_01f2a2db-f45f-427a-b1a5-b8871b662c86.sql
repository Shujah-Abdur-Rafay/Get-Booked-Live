
CREATE TABLE public.counter_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  guarantee numeric NOT NULL DEFAULT 0,
  door_split numeric,
  merch_split numeric,
  event_date date NOT NULL,
  event_time time without time zone,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view counters for their offers"
  ON public.counter_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers
      WHERE offers.id = counter_offers.offer_id
      AND (offers.sender_id = auth.uid() OR offers.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can create counters for their offers"
  ON public.counter_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.offers
      WHERE offers.id = counter_offers.offer_id
      AND (offers.sender_id = auth.uid() OR offers.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can update counters for their offers"
  ON public.counter_offers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers
      WHERE offers.id = counter_offers.offer_id
      AND (offers.sender_id = auth.uid() OR offers.recipient_id = auth.uid())
    )
  );
