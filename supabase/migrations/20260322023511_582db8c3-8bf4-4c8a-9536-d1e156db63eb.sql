
CREATE OR REPLACE FUNCTION public.handle_artist_claim_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  listing RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Fetch the artist listing data
    SELECT name, genre, bandsintown_url
    INTO listing
    FROM public.artist_listings
    WHERE id = NEW.artist_listing_id;

    -- Update the user's profile with listing data
    UPDATE public.profiles
    SET
      display_name = COALESCE(NULLIF(display_name, ''), listing.name),
      genre = COALESCE(genre, listing.genre),
      website = COALESCE(website, listing.bandsintown_url),
      role = 'artist',
      profile_complete = true,
      updated_at = now()
    WHERE user_id = NEW.user_id;

    -- Mark the listing as claimed
    UPDATE public.artist_listings
    SET claimed_by = NEW.user_id,
        claim_status = 'approved'
    WHERE id = NEW.artist_listing_id;

    -- Update the reviewed_at timestamp
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_artist_claim_approval
  BEFORE UPDATE ON public.artist_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_artist_claim_approval();
