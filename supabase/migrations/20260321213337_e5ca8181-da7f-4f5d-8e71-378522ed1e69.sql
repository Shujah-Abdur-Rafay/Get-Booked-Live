-- Create reel_clips table
CREATE TABLE public.reel_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  title text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reel_clips ENABLE ROW LEVEL SECURITY;

-- Owner can manage their clips
CREATE POLICY "Users can manage own clips" ON public.reel_clips
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can view clips
CREATE POLICY "Anyone can view reel clips" ON public.reel_clips
  FOR SELECT TO public
  USING (true);

-- Create storage bucket for reel clips
INSERT INTO storage.buckets (id, name, public) VALUES ('reel-clips', 'reel-clips', true);

-- Storage policies
CREATE POLICY "Users can upload reel clips" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own reel clips" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own reel clips" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reel-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view reel clips" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'reel-clips');