
-- Add suspended column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Admin can read ALL profiles (not just their own)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any profile (verify, suspend, change plan)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any profile
CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all offers
CREATE POLICY "Admins can view all offers"
ON public.offers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all tours
CREATE POLICY "Admins can view all tours"
ON public.tours FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can manage venue claims
CREATE POLICY "Admins can view all venue claims"
ON public.venue_claims FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update venue claims"
ON public.venue_claims FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can manage notifications (for platform announcements)
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
