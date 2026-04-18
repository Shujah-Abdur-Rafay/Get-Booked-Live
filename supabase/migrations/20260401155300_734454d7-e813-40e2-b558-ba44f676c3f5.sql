
CREATE OR REPLACE FUNCTION public.protect_smoothing_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    NEW.fee_percent := OLD.fee_percent;
    NEW.total_managed_income := OLD.total_managed_income;
    NEW.monthly_payout := OLD.monthly_payout;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_smoothing_fee_trigger
  BEFORE UPDATE ON public.income_smoothing
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_smoothing_fee();
