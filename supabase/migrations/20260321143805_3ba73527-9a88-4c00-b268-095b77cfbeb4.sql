
-- Fix overly permissive INSERT policy on notifications
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only authenticated users can insert notifications (for system use, edge functions will use service role)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
