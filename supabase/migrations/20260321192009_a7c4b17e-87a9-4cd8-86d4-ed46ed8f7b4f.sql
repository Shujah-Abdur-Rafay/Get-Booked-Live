
DROP POLICY IF EXISTS "Recipients can update offers" ON public.offers;

-- Recipients can accept, decline, or set negotiating
CREATE POLICY "Recipients can respond to offers" ON public.offers
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (status IN ('accepted', 'declined', 'negotiating'));

-- Senders can only cancel/expire their own pending offers, or set negotiating (when accepting a counter)
CREATE POLICY "Senders can update own offers" ON public.offers
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (status IN ('expired', 'negotiating', 'accepted'));
