
-- Add category_ratings JSONB to reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS category_ratings jsonb DEFAULT NULL;

-- Add bookscore numeric to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bookscore numeric DEFAULT NULL;
