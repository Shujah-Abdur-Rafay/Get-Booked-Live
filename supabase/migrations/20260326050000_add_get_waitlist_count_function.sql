-- Add get_waitlist_count security-definer function
-- This function is called by ComingSoonPage to display the waitlist count
-- without exposing any PII (emails, roles) to unauthenticated users.
-- The public SELECT policy on the waitlist table has been removed;
-- this function is the ONLY way unauthenticated users can read from the waitlist.

CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.waitlist;
$$;

-- Grant execute to anon and authenticated roles so the frontend can call it
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO authenticated;

-- Also add trial_ends_at column to profiles if not already present
-- (idempotent — safe to run multiple times)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL;
