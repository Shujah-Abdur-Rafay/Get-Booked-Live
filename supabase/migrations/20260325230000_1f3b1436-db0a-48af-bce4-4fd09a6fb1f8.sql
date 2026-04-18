-- =====================================================
-- Migration: 14-Day Pro Trial for New Users
-- =====================================================

-- 1. Add trial_ends_at column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- 2. Update handle_new_user to grant 14-day Pro trial on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, subscription_plan, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'pro',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create a function to check and expire trials (called by check-subscription edge function)
-- This is a helper RPC that the edge function can call
CREATE OR REPLACE FUNCTION public.check_trial_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  prof record;
BEGIN
  SELECT subscription_plan, trial_ends_at
  INTO prof
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF prof IS NULL THEN
    RETURN jsonb_build_object('is_trial', false, 'trial_active', false);
  END IF;

  -- If user has a trial_ends_at set and is currently on 'pro' plan
  IF prof.trial_ends_at IS NOT NULL AND prof.subscription_plan = 'pro' THEN
    IF NOW() < prof.trial_ends_at THEN
      -- Trial is still active
      RETURN jsonb_build_object(
        'is_trial', true,
        'trial_active', true,
        'trial_ends_at', prof.trial_ends_at,
        'days_remaining', EXTRACT(DAY FROM (prof.trial_ends_at - NOW()))::int
      );
    ELSE
      -- Trial has expired — downgrade to free
      UPDATE public.profiles
      SET subscription_plan = 'free'
      WHERE user_id = p_user_id
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= NOW()
        AND subscription_plan = 'pro';

      RETURN jsonb_build_object(
        'is_trial', true,
        'trial_active', false,
        'trial_ends_at', prof.trial_ends_at,
        'days_remaining', 0
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('is_trial', false, 'trial_active', false);
END;
$$;

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO service_role;
