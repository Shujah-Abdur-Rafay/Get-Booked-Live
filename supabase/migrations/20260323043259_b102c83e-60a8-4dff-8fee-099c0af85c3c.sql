
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  reviewer_role text NOT NULL,
  reviewer_city text,
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved boolean NOT NULL DEFAULT false
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials FOR SELECT TO public
  USING (approved = true);

CREATE POLICY "Admins can manage all testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
