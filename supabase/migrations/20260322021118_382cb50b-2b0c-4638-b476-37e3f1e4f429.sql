
-- Fix advance_requests: restrict artist UPDATE to only cancellation
DROP POLICY IF EXISTS "System can update advance requests" ON public.advance_requests;

-- Artists can only cancel their own pending requests
CREATE POLICY "Artists can cancel own pending requests"
  ON public.advance_requests
  FOR UPDATE TO authenticated
  USING (artist_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');
