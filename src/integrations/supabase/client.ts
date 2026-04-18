import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ─── Environment variable validation ─────────────────────────────────────────
// VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY MUST be set in .env.
// These are the only two Supabase values safe to expose to the browser:
//   - VITE_SUPABASE_URL         → project URL (not a secret)
//   - VITE_SUPABASE_PUBLISHABLE_KEY → anon/publishable key (RLS-protected)
//
// NEVER add SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY here.
// Those belong exclusively in Supabase Edge Function secrets.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    '[GetBooked] Missing required environment variables.\n' +
    'Create a .env file at the project root with:\n' +
    '  VITE_SUPABASE_URL=https://<project-ref>.supabase.co\n' +
    '  VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>\n' +
    'See .env.example for the full template.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
