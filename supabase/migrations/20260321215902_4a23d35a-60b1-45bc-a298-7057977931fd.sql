
-- Advance requests table
CREATE TABLE public.advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  amount_requested numeric NOT NULL DEFAULT 0,
  guarantee_net numeric NOT NULL DEFAULT 0,
  fee_percent numeric NOT NULL DEFAULT 3,
  fee_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  evaluated_at timestamp with time zone,
  paid_at timestamp with time zone,
  collected_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own advance requests" ON public.advance_requests
  FOR SELECT TO authenticated
  USING (artist_id = auth.uid());

CREATE POLICY "Artists can create advance requests" ON public.advance_requests
  FOR INSERT TO authenticated
  WITH CHECK (artist_id = auth.uid());

CREATE POLICY "System can update advance requests" ON public.advance_requests
  FOR UPDATE TO authenticated
  USING (artist_id = auth.uid());

-- Insurance policies table
CREATE TABLE public.booking_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  policy_type text NOT NULL DEFAULT 'cancellation',
  coverage_type text NOT NULL,
  premium numeric NOT NULL DEFAULT 89,
  coverage_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'offered',
  policy_id text,
  purchased_by uuid,
  purchased_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties can view insurance" ON public.booking_insurance
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_insurance.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  ));

CREATE POLICY "Booking parties can manage insurance" ON public.booking_insurance
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_insurance.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_insurance.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  ));

-- Income smoothing enrollments
CREATE TABLE public.income_smoothing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  total_managed_income numeric NOT NULL DEFAULT 0,
  monthly_payout numeric NOT NULL DEFAULT 0,
  fee_percent numeric NOT NULL DEFAULT 1,
  start_date date,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(artist_id)
);

ALTER TABLE public.income_smoothing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can manage own smoothing" ON public.income_smoothing
  FOR ALL TO authenticated
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

-- Booking financing table
CREATE TABLE public.booking_financing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  promoter_id uuid NOT NULL,
  plan_type text NOT NULL DEFAULT 'full',
  total_amount numeric NOT NULL DEFAULT 0,
  monthly_payment numeric,
  installments integer DEFAULT 1,
  interest_rate numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_financing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties can view financing" ON public.booking_financing
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_financing.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  ));

CREATE POLICY "Promoters can create financing" ON public.booking_financing
  FOR INSERT TO authenticated
  WITH CHECK (promoter_id = auth.uid());

CREATE POLICY "Promoters can update own financing" ON public.booking_financing
  FOR UPDATE TO authenticated
  USING (promoter_id = auth.uid());
