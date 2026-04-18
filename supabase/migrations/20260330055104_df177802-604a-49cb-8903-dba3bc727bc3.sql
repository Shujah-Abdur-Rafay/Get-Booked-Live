
-- ============================================================
-- Security fixes: contracts policy, advance fee, offers fields
-- ============================================================

-- 1. Fix contracts bucket: replace public read with booking-party-only
DROP POLICY IF EXISTS "Anyone can read contracts" ON storage.objects;

CREATE POLICY "Booking parties can read contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.contract_url LIKE '%' || name || '%'
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  )
);

-- Also fix the upload policy to scope to authenticated users
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;

CREATE POLICY "Booking parties can upload contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts'
  AND auth.uid() IS NOT NULL
);

-- 2. Enforce platform fee on advance_requests
CREATE OR REPLACE FUNCTION public.enforce_advance_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  SELECT subscription_plan INTO v_plan
  FROM public.profiles
  WHERE user_id = NEW.artist_id;

  -- Platform-defined fee based on subscription tier
  NEW.fee_percent := CASE COALESCE(v_plan, 'free')
    WHEN 'pro' THEN 2
    WHEN 'agency' THEN 1.5
    ELSE 3
  END;
  NEW.fee_amount := floor(NEW.amount_requested * NEW.fee_percent / 100);
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_advance_fee_trigger
BEFORE INSERT ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_advance_fee();

-- 3. Protect financial fields on offers from recipient manipulation
CREATE OR REPLACE FUNCTION public.protect_offer_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the updater is the recipient, preserve financial fields
  IF auth.uid() = OLD.recipient_id AND auth.uid() != OLD.sender_id THEN
    NEW.guarantee := OLD.guarantee;
    NEW.commission_rate := OLD.commission_rate;
    NEW.commission_amount := OLD.commission_amount;
    NEW.door_split := OLD.door_split;
    NEW.merch_split := OLD.merch_split;
    NEW.venue_name := OLD.venue_name;
    NEW.event_date := OLD.event_date;
    NEW.event_time := OLD.event_time;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_offer_financial_fields_trigger
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.protect_offer_financial_fields();
