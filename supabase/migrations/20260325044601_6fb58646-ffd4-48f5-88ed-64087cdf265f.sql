
-- AI Tasks table: logs all AI operations
CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_entity_type text NOT NULL,
  related_entity_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'manus',
  task_type text NOT NULL,
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- AI Recommendations table
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid,
  recommended_artist_id uuid NOT NULL,
  recommendation_reason text,
  suggested_price numeric,
  confidence_score numeric,
  rank_order integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  requesting_user_id uuid
);

-- Activity Logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL DEFAULT 'system',
  actor_id uuid,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- AI Tasks: service role and admins only
CREATE POLICY "Service role can manage ai_tasks" ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view ai_tasks" ON public.ai_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- AI Recommendations: users can see their own, admins see all
CREATE POLICY "Service role can manage ai_recommendations" ON public.ai_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view all recommendations" ON public.ai_recommendations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own recommendations" ON public.ai_recommendations FOR SELECT TO authenticated USING (requesting_user_id = auth.uid());

-- Activity Logs: admins and service role
CREATE POLICY "Service role can manage activity_logs" ON public.activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger for ai_tasks
CREATE TRIGGER update_ai_tasks_updated_at BEFORE UPDATE ON public.ai_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
