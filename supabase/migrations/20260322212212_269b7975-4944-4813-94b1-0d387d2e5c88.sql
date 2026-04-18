
-- Auto-grant admin role to getbookedlive@gmail.com
-- First, insert if not already present
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'getbookedlive@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create a trigger function that auto-grants admin to this email on every new user creation
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

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_grant_admin ON auth.users;
