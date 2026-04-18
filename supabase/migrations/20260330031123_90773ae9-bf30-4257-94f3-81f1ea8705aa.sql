
-- Fix 1: Remove public SELECT on waitlist
DROP POLICY IF EXISTS "Public can count waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Anyone can view waitlist" ON public.waitlist;

-- Recreate admin policy (drop first if exists)
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
CREATE POLICY "Admins can view waitlist"
ON public.waitlist FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can read waitlist" ON public.waitlist;
CREATE POLICY "Service role can read waitlist"
ON public.waitlist FOR SELECT
TO service_role
USING (true);

-- Fix 2: Attach protect_billing_fields trigger to profiles table
DROP TRIGGER IF EXISTS protect_billing_fields_trigger ON public.profiles;
CREATE TRIGGER protect_billing_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_billing_fields();
