
-- Make notifications INSERT more restrictive - only allow inserting for the target user
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users can receive notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
