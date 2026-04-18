
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS apple_music text,
  ADD COLUMN IF NOT EXISTS soundcloud text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS bandcamp text,
  ADD COLUMN IF NOT EXISTS beatport text,
  ADD COLUMN IF NOT EXISTS bandsintown text,
  ADD COLUMN IF NOT EXISTS songkick text;
