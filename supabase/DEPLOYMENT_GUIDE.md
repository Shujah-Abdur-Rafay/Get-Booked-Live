# GetBooked.Live — Supabase Sync & Deployment Guide
**Project:** `ycqtqbecadarulohxvan`  
**Date:** 2026-04-08  

---

## STEP 1: Apply Database Migrations (SQL Editor)

1. Open [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard/project/ycqtqbecadarulohxvan/sql)
2. Click **New Query**
3. Open `supabase/SYNC_SQL_EDITOR.sql` and paste the entire contents
4. Click **Run** (or press `Ctrl+Enter`)
5. Scroll through output — look for `SUCCESS` on all statements
6. Uncomment the **VERIFICATION QUERIES** at the bottom and run them to confirm

> The script is fully idempotent — safe to run multiple times.

---

## STEP 2: Enable Required Extensions

In Dashboard → **Database → Extensions**, enable:
- `pg_cron` — for scheduled retry-payout job
- `pg_net` — for HTTP calls from pg_cron

---

## STEP 3: Configure Vault Secrets

In Dashboard → **Settings → Vault → New Secret**, add:

| Secret Name | Value |
|---|---|
| `SUPABASE_URL` | `https://ycqtqbecadarulohxvan.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key (Settings → API) |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook signing secret (`whsec_...`) |

After adding Vault secrets, re-run **Part 10** of the SQL script to create the pg_cron job.

---

## STEP 4: Deploy Edge Functions

Log in to Supabase CLI then deploy all functions:

```bash
cd "C:\Users\Dell\Desktop\GETBOOKEDLIVE"

# Login (opens browser)
npx supabase login

# Link to the project
npx supabase link --project-ref ycqtqbecadarulohxvan

# Deploy ALL 39 functions at once
npx supabase functions deploy --no-verify-jwt

# Or deploy individually (for selective updates):
npx supabase functions deploy stripe-webhook
npx supabase functions deploy retry-payout
npx supabase functions deploy check-subscription
npx supabase functions deploy create-checkout
npx supabase functions deploy create-payment-intent
npx supabase functions deploy stripe-connect-onboard
npx supabase functions deploy stripe-connect-status
npx supabase functions deploy stripe-connect-dashboard
npx supabase functions deploy customer-portal
npx supabase functions deploy generate-offer
npx supabase functions deploy generate-contract
npx supabase functions deploy send-email
npx supabase functions deploy send-welcome-email
```

**IMPORTANT:** The `auth-email-hook` function must be deployed with `--no-verify-jwt` (already set in config.toml).

---

## STEP 5: Register Stripe Webhook

In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

1. Add endpoint: `https://ycqtqbecadarulohxvan.supabase.co/functions/v1/stripe-webhook`
2. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `account.updated` (for Stripe Connect)
3. Copy the **Signing Secret** and add it to Vault as `STRIPE_WEBHOOK_SECRET`

---

## STEP 6: Verify Storage Buckets

In Dashboard → **Storage**, ensure these buckets exist:

| Bucket | Public | Notes |
|---|---|---|
| `avatars` | ✅ Public | Profile pictures |
| `contracts` | ❌ Private | Booking contracts (booking-party RLS) |
| `reel-clips` | ❌ Private | Artist video reels |
| `tour-documents` | ❌ Private | Tour files |
| `venue-photos` | ✅ Public | Venue images |

If any are missing, create them in the Dashboard with the settings above.

---

## STEP 7: Regenerate TypeScript Types

After the SQL is applied, regenerate types from the live schema:

```bash
npx supabase gen types typescript \
  --project-id ycqtqbecadarulohxvan \
  --schema public \
  > src/integrations/supabase/types.ts
```

> A hand-crafted types file was already written to `src/integrations/supabase/types.ts`
> covering all known tables. The CLI-generated version will be more complete.

---

## STEP 8: Test Critical Flows

### Auth
- [ ] Sign up as new artist — profile created, 14-day pro trial set
- [ ] `getbookedlive@gmail.com` login → admin role auto-granted
- [ ] `has_role(uid, 'admin')` returns true for admin account

### Stripe Payments
- [ ] Promoter initiates deposit → Stripe checkout created
- [ ] Webhook fires → `stripe_webhook_events` row inserted, booking `payment_status` updated
- [ ] Duplicate webhook retry → returns 200, no double-processing
- [ ] Final payment → payout attempted via Stripe Connect

### Payout Failure Recovery
- [ ] Force a payout failure → `payout_failures` row created
- [ ] Admin email sent
- [ ] `retry-payout` function processes the failure (hourly cron)

### Messaging
- [ ] Deal room messages appear in realtime
- [ ] Notifications table triggers realtime updates

---

## What Was Fixed in This Sync

### config.toml
- **Fixed:** Project ID was `xsvamqzhdrhmznocgbxe` → corrected to `ycqtqbecadarulohxvan`

### New Tables Added
| Table | Purpose |
|---|---|
| `stripe_webhook_events` | Idempotency log — prevents duplicate Stripe processing |
| `payout_failures` | Audit log for every failed Stripe Connect payout |
| `payment_tracking` | Tracks all Stripe payment intents and sessions |
| `admin_users` | Platform admin role assignments |
| `deal_room_messages` | Realtime messaging within booking deal rooms |
| `conversations` | Multi-party conversation threads |
| `message_threads` | Thread organization within conversations |
| `messages` | Individual messages |
| `crew_members` | Crew assigned to tours |
| `pipeline_stages` | CRM pipeline columns for promoters |
| `pipeline_deals` | CRM deal records |
| `booking_analytics` | Analytics events per booking/user |
| `venue_booking_requests` | Artist venue booking inquiries |

### Columns Added to Existing Tables
**`profiles`:** `trial_ends_at`, `accepting_bookings`, `nudge_sent_at`, `stripe_customer_id`, `country`, `stripe_account_id`, `stripe_onboarding_complete`

**`bookings`:** `payment_status`, `deposit_paid_at`, `deposit_stripe_session_id`, `deposit_amount`, `final_paid_at`, `final_payment_paid_at`, `final_payment_stripe_session_id`, `final_payment_amount`, `stripe_customer_id`, `stripe_payment_intent_id`, `venue_name`, `commission_rate`

**`artist_listings`:** `slug`, `instagram`, `spotify`, `tiktok`, `website`, `avatar_url`, `bookscore`, `tier`, `fee_min`, `fee_max`, `bio`

**`waitlist`:** `name`

### Views Updated
- `directory_listings` — Now includes `slug`, `instagram`, `spotify`, `tiktok`, `website`, `bookscore`, `tier`, `fee_min`, `fee_max`, `avatar_url`, `bio`

### Functions Added/Updated
| Function | Purpose |
|---|---|
| `get_waitlist_count()` | Public count (no PII exposure) |
| `check_trial_status(uuid)` | Trial status + auto-expire |
| `has_role(uuid, text)` | Admin-guarded role check |
| `handle_new_user()` | Signup trigger with 14-day pro trial |
| `auto_grant_admin_role()` | Auto-grant admin to designated email |
| `recalculate_bookscore()` | BookScore trigger on reviews/bookings |
| `protect_smoothing_fee()` | Income smoothing write protection |
| `get_artist_social(text)` | Artist social data by slug |
| `get_all_artists_social()` | All artists with social data |
| `notify_pgrst_reload()` | Force PostgREST schema cache reload |

### Triggers Added/Updated
- `on_auth_user_created` → `handle_new_user()`
- `trg_auto_grant_admin` → `auto_grant_admin_role()`
- `trg_recalculate_bookscore_review` → `recalculate_bookscore()`
- `trg_recalculate_bookscore_booking` → `recalculate_bookscore()`
- `update_payout_failures_updated_at` → `update_updated_at_column()`
- `protect_smoothing_fee_trigger` → `protect_smoothing_fee()`

### RLS Policies
All 13 new tables have RLS enabled and appropriate policies for:
- Owner access (`user_id = auth.uid()`)
- Service role full access
- Admin read/update access (via `admin_users` table)
- Transitive access (deal_room_messages → bookings → artist/promoter)

### Security Fix: Contracts Storage
- Removed: `"Anyone can read contracts"` (was public)
- Added: `"Booking parties can read contracts"` (artist OR promoter only)
- Added: `"Booking parties can upload contracts"` (authenticated only)

### pg_cron Scheduler
- Job: `retry-payout-failures` — runs every hour at :05
- Calls `retry-payout` Edge Function with service role auth
- Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vault

### TypeScript Types
- Regenerated `src/integrations/supabase/types.ts` with all new tables, columns, views, and functions

### Edge Function Notes
| Function | SDK Version | Notes |
|---|---|---|
| `stripe-webhook` | stripe@18.5.0, sb@2.57.2 | Latest — idempotent, structured logging |
| `retry-payout` | stripe@18.5.0, sb@2.57.2 | Latest — exponential backoff |
| `check-subscription` | stripe@18.5.0, sb@2.57.2 | Latest — calls `check_trial_status` RPC |
| `create-checkout` | stripe@14.21.0, sb@2.45.0 | **OUTDATED** — consider upgrading Stripe SDK |
| All others | Mixed | Review and upgrade to stripe@18.5.0 when convenient |

### Financial Constants (verified in sync)
Both `src/lib/constants.ts` and `supabase/functions/_shared/constants.ts` now show:
- `DEPOSIT_RATE = 0.5` (50%)
- `DEFAULT_COMMISSION_RATE = 0.20` (20%)
- `DEPOSIT_DUE_DAYS = 14`
