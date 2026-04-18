
-- Tours table
CREATE TABLE public.tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tours" ON public.tours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tours" ON public.tours FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tours" ON public.tours FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tours" ON public.tours FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tour stops (itinerary)
CREATE TABLE public.tour_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  date DATE NOT NULL,
  load_in_time TIME,
  sound_check_time TIME,
  doors_time TIME,
  show_time TIME,
  guarantee NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tour stops" ON public.tour_stops FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tours WHERE tours.id = tour_stops.tour_id AND tours.user_id = auth.uid())
);

-- Crew manifest
CREATE TABLE public.crew_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  day_rate NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage crew" ON public.crew_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tours WHERE tours.id = crew_members.tour_id AND tours.user_id = auth.uid())
);

-- Budget items
CREATE TABLE public.tour_budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('travel', 'lodging', 'food', 'gear', 'crew', 'marketing', 'misc')),
  description TEXT NOT NULL,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  actual_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage budget" ON public.tour_budget_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tours WHERE tours.id = tour_budget_items.tour_id AND tours.user_id = auth.uid())
);

-- Tour documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-documents', 'tour-documents', false);

CREATE POLICY "Users can upload tour docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tour-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own tour docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tour-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own tour docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tour-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Tour documents metadata
CREATE TABLE public.tour_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tour docs" ON public.tour_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tours WHERE tours.id = tour_documents.tour_id AND tours.user_id = auth.uid())
);
