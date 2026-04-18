
-- Fix security definer view by explicitly setting security_invoker
ALTER VIEW public.public_profiles SET (security_invoker = on);
