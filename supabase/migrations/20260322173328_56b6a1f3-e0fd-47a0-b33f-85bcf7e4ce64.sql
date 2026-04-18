
CREATE TABLE IF NOT EXISTS public.crew_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.crew_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crew availability"
  ON public.crew_availability
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view crew availability"
  ON public.crew_availability
  FOR SELECT
  TO public
  USING (true);
