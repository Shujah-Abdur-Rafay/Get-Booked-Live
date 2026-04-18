CREATE OR REPLACE FUNCTION public.protect_billing_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.is_verified := OLD.is_verified;
    NEW.suspended := OLD.suspended;
    NEW.bookscore := OLD.bookscore;
    NEW.completion_score := OLD.completion_score;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_billing_fields_trigger ON public.profiles;
CREATE TRIGGER protect_billing_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_fields();