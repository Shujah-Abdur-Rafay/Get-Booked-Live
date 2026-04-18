-- =====================================================
-- Migration: Fix handle_new_user to read role from signup metadata
-- This eliminates the race condition where the frontend UPDATE
-- could run before the trigger had finished inserting the profile row.
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
BEGIN
  -- Read the role that was embedded in the signUp metadata by AuthPage.tsx
  v_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (user_id, display_name, role, subscription_plan, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    -- Cast to app_role enum if valid, otherwise NULL (will be set by role picker)
    CASE
      WHEN v_role IN ('artist', 'promoter', 'venue', 'production', 'photo_video')
        THEN v_role::public.app_role
      ELSE NULL
    END,
    'pro',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
