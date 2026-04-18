
-- Show attendance tracking
CREATE TABLE public.show_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_name text NOT NULL,
  artist_id uuid NOT NULL,
  promoter_id uuid NOT NULL,
  venue_capacity integer,
  actual_attendance integer NOT NULL,
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

ALTER TABLE public.show_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report attendance for their bookings" ON public.show_attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by AND (auth.uid() = promoter_id OR auth.uid() = artist_id));

CREATE POLICY "Users can view attendance for their bookings" ON public.show_attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = promoter_id OR auth.uid() = artist_id);

CREATE POLICY "Anyone can view attendance stats" ON public.show_attendance
  FOR SELECT TO public
  USING (true);

-- Artist expenses for bookkeeping
CREATE TABLE public.artist_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  tour_stop_id uuid REFERENCES public.tour_stops(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'misc',
  description text NOT NULL DEFAULT '',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses" ON public.artist_expenses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Transport listings
CREATE TABLE public.transport_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'SUV',
  vehicle_capacity integer NOT NULL DEFAULT 4,
  rate_per_hour numeric,
  rate_per_trip numeric,
  cities_served text[] DEFAULT '{}',
  description text,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active transport listings" ON public.transport_listings
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Providers can manage own listings" ON public.transport_listings
  FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Transport bookings
CREATE TABLE public.transport_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.transport_listings(id) ON DELETE CASCADE,
  tour_stop_id uuid NOT NULL REFERENCES public.tour_stops(id) ON DELETE CASCADE,
  booked_by uuid NOT NULL,
  provider_id uuid NOT NULL,
  pickup_time timestamptz,
  pickup_location text,
  dropoff_location text,
  total_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transport bookings" ON public.transport_bookings
  FOR ALL TO authenticated
  USING (booked_by = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (booked_by = auth.uid());

-- Add timezone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';
