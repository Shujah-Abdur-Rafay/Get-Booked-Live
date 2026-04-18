
-- Reviews table: post-booking ratings between parties
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);

-- Validation trigger: rating must be 1-5
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_review_rating
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users can view reviews for profiles they can see
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);

-- Users can only review bookings they're part of
CREATE POLICY "Booking parties can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = reviews.booking_id
      AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid());
