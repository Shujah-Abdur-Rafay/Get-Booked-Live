
-- Fix 1: Restrict contracts bucket upload to booking parties only
DROP POLICY IF EXISTS "Booking parties can upload contracts" ON storage.objects;
CREATE POLICY "Booking parties can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE artist_id = auth.uid() OR promoter_id = auth.uid()
  )
);

-- Fix 2: Add email format validation on waitlist and presale_signups
ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.presale_signups
  ADD CONSTRAINT presale_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Fix 3: Add unique constraint on artist_stats to prevent stat flooding
ALTER TABLE public.artist_stats
  ADD CONSTRAINT artist_stats_user_date_unique
  UNIQUE (user_id, snapshot_date);
