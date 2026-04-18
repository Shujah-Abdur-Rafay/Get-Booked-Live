-- ============================================================
-- GetBooked.Live — Target Project Migration (ycqtqbecadarulohxvan)
-- Updates RPC functions to work with the target's directory_listings table
-- Adds BookScore trigger and cron job
-- ============================================================

-- ─── 1. Update get_artist_by_slug to query directory_listings directly ────────
-- The target project has directory_listings as a real table (not a view)
-- and uses UUID-suffixed slugs (e.g., "ken-y-b540221e")
CREATE OR REPLACE FUNCTION public.get_artist_by_slug(p_slug TEXT)
RETURNS TABLE(
  id           UUID,
  name         TEXT,
  slug         TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  genres       TEXT[],
  city         TEXT,
  state        TEXT,
  tier         TEXT,
  bookscore    NUMERIC,
  fee_min      NUMERIC,
  fee_max      NUMERIC,
  instagram    TEXT,
  spotify      TEXT,
  tiktok       TEXT,
  website      TEXT,
  is_claimed   BOOLEAN,
  listing_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.id::UUID,
    dl.name::TEXT,
    dl.slug::TEXT,
    dl.avatar_url::TEXT,
    dl.bio::TEXT,
    dl.genres::TEXT[],
    dl.city::TEXT,
    dl.state::TEXT,
    dl.tier::TEXT,
    dl.bookscore::NUMERIC,
    dl.fee_min::NUMERIC,
    dl.fee_max::NUMERIC,
    dl.instagram::TEXT,
    dl.spotify::TEXT,
    dl.tiktok::TEXT,
    dl.website::TEXT,
    dl.is_claimed::BOOLEAN,
    dl.listing_type::TEXT
  FROM public.directory_listings dl
  WHERE dl.slug = p_slug
     OR dl.slug LIKE p_slug || '-%'  -- match both "ken-y" and "ken-y-b540221e"
  ORDER BY
    CASE WHEN dl.slug = p_slug THEN 0 ELSE 1 END  -- exact match first
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_artist_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_artist_by_slug(TEXT) TO authenticated;

-- ─── 2. Update get_directory_artists to query directory_listings directly ─────
CREATE OR REPLACE FUNCTION public.get_directory_artists(
  p_search    TEXT    DEFAULT NULL,
  p_genre     TEXT    DEFAULT NULL,
  p_limit     INT     DEFAULT 200,
  p_offset    INT     DEFAULT 0
)
RETURNS TABLE(
  id          UUID,
  name        TEXT,
  slug        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  genres      TEXT[],
  city        TEXT,
  state       TEXT,
  tier        TEXT,
  bookscore   NUMERIC,
  fee_min     NUMERIC,
  fee_max     NUMERIC,
  instagram   TEXT,
  spotify     TEXT,
  tiktok      TEXT,
  website     TEXT,
  is_claimed  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.id::UUID,
    dl.name::TEXT,
    dl.slug::TEXT,
    dl.avatar_url::TEXT,
    dl.bio::TEXT,
    dl.genres::TEXT[],
    dl.city::TEXT,
    dl.state::TEXT,
    dl.tier::TEXT,
    dl.bookscore::NUMERIC,
    dl.fee_min::NUMERIC,
    dl.fee_max::NUMERIC,
    dl.instagram::TEXT,
    dl.spotify::TEXT,
    dl.tiktok::TEXT,
    dl.website::TEXT,
    dl.is_claimed::BOOLEAN
  FROM public.directory_listings dl
  WHERE dl.listing_type = 'artist'
    AND (p_search IS NULL OR dl.name ILIKE '%' || p_search || '%')
    AND (p_genre  IS NULL OR dl.genres @> ARRAY[p_genre])
  ORDER BY
    CASE WHEN dl.bookscore IS NOT NULL THEN dl.bookscore ELSE 0 END DESC,
    dl.name ASC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_directory_artists(TEXT, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_directory_artists(TEXT, TEXT, INT, INT) TO authenticated;

-- ─── 3. BookScore auto-recalculation trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_bookscore()
RETURNS TRIGGER AS $$
DECLARE
  v_reviewed_id uuid;
  v_avg numeric;
BEGIN
  v_reviewed_id := COALESCE(NEW.reviewed_id, OLD.reviewed_id);
  IF v_reviewed_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ROUND(AVG(rating)::numeric, 1)
    INTO v_avg
    FROM public.reviews
   WHERE reviewed_id = v_reviewed_id;

  UPDATE public.profiles
     SET bookscore = COALESCE(v_avg, 0)
   WHERE id = v_reviewed_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_recalculate_bookscore ON public.reviews;
CREATE TRIGGER trg_recalculate_bookscore
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_bookscore();

-- ─── 4. Post-show review cron job ─────────────────────────────────────────────
SELECT cron.schedule(
  'trigger-post-show-reviews',
  '0 10 * * *',
  $$SELECT net.http_post(
    url := (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/trigger-post-show-reviews',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  )$$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 10 * * *';

-- ─── 5. Notify PostgREST to reload schema ─────────────────────────────────────
NOTIFY pgrst, 'reload schema';
