
-- Add name column to waitlist table
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS name text;

-- Ensure public INSERT policy exists for waitlist signups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'Anyone can insert into waitlist'
  ) THEN
    CREATE POLICY "Anyone can insert into waitlist"
    ON public.waitlist FOR INSERT
    TO public
    WITH CHECK (true);
  END IF;
END $$;
