-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Schedule payout retry via pg_cron
-- ─────────────────────────────────────────────────────────────────────────────
-- This schedules the retry-payout edge function to run once per hour.
-- pg_cron is enabled by default on all Supabase projects (check: Database > Extensions).
--
-- The function will:
--   1. Query payout_failures WHERE status IN ('pending', 'retrying')
--      AND next_retry_at <= now()
--   2. Retry each failure using exponential backoff (1h → 6h → 24h)
--   3. If all retries exhausted, mark as 'failed' and escalate via email
--
-- IMPORTANT: Replace <project_ref> with your Supabase project ref.
-- IMPORTANT: Set SUPABASE_CRON_SERVICE_ROLE_KEY = service_role key in your
--            Supabase Vault secrets OR environment, then reference it below.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron and pg_net if not already enabled
-- (These are available by default on Supabase — enable via Dashboard > Database > Extensions)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if present (for idempotency)
SELECT cron.unschedule('retry-payout-failures')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retry-payout-failures'
);

-- Schedule: run every hour at :05 past the hour
-- We use vault.decrypted_secrets to securely access the service role key.
-- If you don't use Vault, replace the subquery with a hardcoded string (less secure).
DO $$
DECLARE
  project_url TEXT;
  service_key TEXT;
BEGIN
  -- Try to get values from Supabase Vault
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  -- Only create the cron job if we can resolve the credentials
  IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'retry-payout-failures',
      '5 * * * *',  -- every hour at :05
      format(
        $cron$
          SELECT net.http_post(
            url    := %L || '/functions/v1/retry-payout',
            headers := jsonb_build_object(
              'Content-Type',   'application/json',
              'Authorization',  'Bearer ' || %L
            ),
            body   := '{}'::jsonb
          );
        $cron$,
        project_url,
        service_key
      )
    );

    RAISE NOTICE 'retry-payout-failures cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in vault — cron job NOT scheduled. '
                 'Please create them in the Supabase Vault and run this migration again.';
  END IF;
END;
$$;

-- Verify the job was created
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'retry-payout-failures';
