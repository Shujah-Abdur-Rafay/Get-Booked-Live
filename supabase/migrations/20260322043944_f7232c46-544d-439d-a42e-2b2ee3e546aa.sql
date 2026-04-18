
-- 1) Harden has_role: restrict to checking own roles only (prevents info disclosure via RPC)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE
    WHEN _user_id = auth.uid() OR auth.role() = 'service_role' THEN
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false
  END
$$;

-- 2) Drop the broad public SELECT policy on profiles that exposes sensitive fields
DROP POLICY IF EXISTS "Public can browse completed profiles limited columns" ON public.profiles;
