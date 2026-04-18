-- Fix security definer view by setting security_invoker = true
ALTER VIEW public.directory_listings SET (security_invoker = true);