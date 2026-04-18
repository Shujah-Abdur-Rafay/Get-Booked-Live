
-- Remove the authenticated user INSERT policy so only service role can insert notifications
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

-- Create a policy that only allows service_role to insert notifications
CREATE POLICY "Only service role can insert notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);
