
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text DEFAULT 'artist',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert into waitlist" ON public.waitlist
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can count waitlist" ON public.waitlist
  FOR SELECT TO public USING (true);
