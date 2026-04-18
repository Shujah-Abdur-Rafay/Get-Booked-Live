-- Fix 1: Complete the truncated admin trigger migration
-- The previous migration dropped the trigger but never recreated it.
-- This migration recreates the trigger so getbookedlive@gmail.com is
-- automatically granted admin on every login/signup.

-- Recreate the trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'getbookedlive@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS trg_auto_grant_admin ON auth.users;
CREATE TRIGGER trg_auto_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_role();

-- Fix 2: Ensure getbookedlive@gmail.com already in auth.users gets the role
-- (handles the case where the account already exists before this migration ran)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'getbookedlive@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix 3: Add an email-level guard to the has_role function so that even if
-- someone manually inserts a row into user_roles, only getbookedlive@gmail.com
-- can ever be granted the 'admin' role via the RPC.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE
    -- Only allow admin role check to return true for the designated admin email
    WHEN _role = 'admin' THEN
      CASE
        WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
          EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN auth.users au ON au.id = ur.user_id
            WHERE ur.user_id = _user_id
              AND ur.role = _role
              AND au.email = 'getbookedlive@gmail.com'
          )
        ELSE false
      END
    -- For non-admin roles (e.g. 'moderator'), use standard check
    ELSE
      CASE
        WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
          EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
        ELSE false
      END
  END
$$;
