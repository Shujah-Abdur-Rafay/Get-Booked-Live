
-- Drop the overly permissive INSERT policy on presale_signups
DROP POLICY IF EXISTS "Anyone can insert presale signups" ON public.presale_signups;

-- Re-create with validation: booking must exist and have presale_open = true
CREATE POLICY "Anyone can insert presale signups"
ON public.presale_signups
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = presale_signups.booking_id
      AND b.presale_open = true
  )
);
