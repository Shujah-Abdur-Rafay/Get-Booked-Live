ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seen_welcome boolean NOT NULL DEFAULT false;