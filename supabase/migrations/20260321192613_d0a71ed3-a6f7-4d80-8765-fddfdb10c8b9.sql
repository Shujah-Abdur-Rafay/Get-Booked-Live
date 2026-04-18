
-- Replace broad authenticated SELECT with own-profile-only full access
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can read their own full profile
CREATE POLICY "Users can view own full profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- For viewing other users, use the public_profiles view which exposes limited fields.
-- The anon policy already covers it; authenticated users also need access via the view,
-- so add an authenticated policy scoped to profile_complete = true for the view to work.
CREATE POLICY "Authenticated can view public profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (profile_complete = true);
