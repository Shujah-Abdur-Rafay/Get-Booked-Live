
-- Add subscription_plan to public_profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  city,
  state,
  genre,
  role,
  slug,
  is_verified,
  website,
  instagram,
  spotify,
  subscription_plan,
  updated_at
FROM public.profiles
WHERE profile_complete = true;
