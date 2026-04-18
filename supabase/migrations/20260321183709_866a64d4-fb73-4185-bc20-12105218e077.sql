
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter integer := 0;
BEGIN
  IF NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  base_slug := lower(regexp_replace(COALESCE(NEW.display_name, 'user'), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;
  
  new_slug := base_slug;
  
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = new_slug AND id != NEW.id);
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_slug
  BEFORE INSERT OR UPDATE OF display_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_slug();

UPDATE public.profiles SET slug = NULL WHERE slug IS NULL;
