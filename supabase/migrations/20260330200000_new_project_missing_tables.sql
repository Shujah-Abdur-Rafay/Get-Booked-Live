-- ============================================================
-- GetBooked.Live — Missing Tables Migration for ycqtqbecadarulohxvan
-- Creates: deal_room_messages, crew_members, messages, message_threads,
--          conversations, payment_tracking, admin_users,
--          pipeline_stages, pipeline_deals, booking_analytics
-- Schema verified against live DB: deal_rooms(id,booking_id,created_at)
--   bookings(artist_id, promoter_id, booking_status)
--   tours(artist_id, ...)
-- ============================================================

-- ─── deal_room_messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'offer_update')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deal_room_messages ENABLE ROW LEVEL SECURITY;

-- Join through bookings since deal_rooms only has booking_id (no artist_id/promoter_id)
CREATE POLICY "deal_room_messages_select" ON public.deal_room_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deal_rooms dr
      JOIN public.bookings b ON b.id = dr.booking_id
      WHERE dr.id = deal_room_id
        AND (b.artist_id = auth.uid() OR b.promoter_id = auth.uid())
    )
  );

CREATE POLICY "deal_room_messages_insert" ON public.deal_room_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_deal_room_messages_room ON public.deal_room_messages(deal_room_id);
CREATE INDEX IF NOT EXISTS idx_deal_room_messages_sender ON public.deal_room_messages(sender_id);

-- ─── crew_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  day_rate NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- tours uses artist_id (not user_id) — join through profiles to check ownership
CREATE POLICY "crew_members_owner" ON public.crew_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.profiles p ON p.id = t.artist_id
      WHERE t.id = tour_id AND p.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_crew_members_tour ON public.crew_members(tour_id);

-- ─── conversations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids UUID[] NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_participant" ON public.conversations
  FOR ALL USING (auth.uid() = ANY(participant_ids));

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participant_ids);

-- ─── message_threads ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_threads_via_conversation" ON public.message_threads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)
    )
  );

-- ─── messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  read_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_participant" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- ─── payment_tracking ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  payment_type TEXT CHECK (payment_type IN ('deposit', 'final', 'subscription', 'refund')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_tracking_owner" ON public.payment_tracking
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "payment_tracking_service" ON public.payment_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_payment_tracking_booking ON public.payment_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_user ON public.payment_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_stripe_pi ON public.payment_tracking(stripe_payment_intent_id);

-- ─── admin_users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'support')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_self" ON public.admin_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admin_users_service" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_admin_users_user ON public.admin_users(user_id);

-- ─── pipeline_stages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_owner" ON public.pipeline_stages
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user ON public.pipeline_stages(user_id);

-- ─── pipeline_deals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  artist_name TEXT,
  venue_name TEXT,
  guarantee NUMERIC,
  date DATE,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'on_hold')),
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_deals_owner" ON public.pipeline_deals
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_pipeline_deals_user ON public.pipeline_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deals_stage ON public.pipeline_deals(stage_id);

-- ─── booking_analytics ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'offer_sent', 'offer_accepted', 'offer_declined', 'offer_countered',
    'booking_confirmed', 'booking_cancelled', 'payment_received',
    'profile_view', 'directory_view'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_analytics_owner" ON public.booking_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "booking_analytics_insert" ON public.booking_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "booking_analytics_service" ON public.booking_analytics
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_booking_analytics_user ON public.booking_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_type ON public.booking_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_created ON public.booking_analytics(created_at DESC);

-- ─── get_waitlist_count function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM public.waitlist;
$$;

-- ─── BookScore auto-recalculation trigger ─────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_bookscore()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing_id UUID;
  v_avg_rating NUMERIC;
  v_review_count INTEGER;
  v_booking_count INTEGER;
  v_new_score NUMERIC;
BEGIN
  v_listing_id := NEW.artist_id;

  IF v_listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.reviews
  WHERE artist_id = v_listing_id;

  SELECT COUNT(*) INTO v_booking_count
  FROM public.bookings
  WHERE artist_id = v_listing_id AND booking_status IN ('confirmed', 'completed');

  v_new_score := LEAST(100,
    (v_avg_rating * 15) +
    (LEAST(v_review_count, 20) * 2) +
    (LEAST(v_booking_count, 25) * 2)
  );

  UPDATE public.directory_listings
  SET bookscore = v_new_score
  WHERE id = v_listing_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_bookscore_review ON public.reviews;
CREATE TRIGGER trg_recalculate_bookscore_review
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_bookscore();

DROP TRIGGER IF EXISTS trg_recalculate_bookscore_booking ON public.bookings;
CREATE TRIGGER trg_recalculate_bookscore_booking
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_bookscore();

-- ─── Enable realtime for messaging ────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
