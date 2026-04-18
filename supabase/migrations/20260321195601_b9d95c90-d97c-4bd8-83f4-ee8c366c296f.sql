
-- 1. Add subscription_plan column to profiles
ALTER TABLE public.profiles
ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free';

-- 2. Create artist_availability table
CREATE TABLE public.artist_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  date date NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, date)
);

ALTER TABLE public.artist_availability ENABLE ROW LEVEL SECURITY;

-- Anyone can view artist availability
CREATE POLICY "Anyone can view artist availability"
ON public.artist_availability FOR SELECT TO public
USING (true);

-- Artists can manage their own availability
CREATE POLICY "Artists can manage own availability"
ON public.artist_availability FOR ALL TO authenticated
USING (artist_id = auth.uid())
WITH CHECK (artist_id = auth.uid());

-- 3. Create deal_rooms table
CREATE TABLE public.deal_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties can access deal rooms"
ON public.deal_rooms FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = deal_rooms.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = deal_rooms.booking_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  )
);

-- 4. Create deal_milestones table
CREATE TABLE public.deal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal milestone access"
ON public.deal_milestones FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deal_rooms dr
    JOIN public.bookings b ON b.id = dr.booking_id
    WHERE dr.id = deal_milestones.deal_room_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deal_rooms dr
    JOIN public.bookings b ON b.id = dr.booking_id
    WHERE dr.id = deal_milestones.deal_room_id
    AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
  )
);
