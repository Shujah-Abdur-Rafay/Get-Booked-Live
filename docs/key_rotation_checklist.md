# Key Rotation Checklist

## Overview
Due to past exposure of credentials, the Supabase Anonymous Key and Stripe Live Key must be rotated immediately. This document serves as an actionable checklist for DevOps/Admin to execute.

## Prerequisites
- [ ] Admin access to the Supabase Dashboard for project `xsvamqzhdrhmznocgbxe`.
- [ ] Admin access to the Stripe Dashboard (Production/Live Mode).
- [ ] Access to the environment variables configuration on the deployment platform (e.g., Vercel, Netlify, Render).
- [ ] Ability to trigger a clean deployment.

## Step 1: Stripe Live Key Rotation
- [ ] 1. Log into the Stripe Dashboard.
- [ ] 2. Navigate to **Developers -> API keys**.
- [ ] 3. Ensure you are in "Live mode".
- [ ] 4. Click **Roll key** next to your live secret key. Select the option to keep the old key active for 12 hours (or whichever is safest for your current traffic) while the new key goes into effect.
- [ ] 5. Copy the newly generated secret key.
- [ ] 6. Update the `STRIPE_SECRET_KEY` in the hosting environment.
- [ ] 7. Update any local `.env` files with this new key.

## Step 2: Stripe Webhook Secret Rotation
- [ ] 1. Go to **Developers -> Webhooks** in Stripe.
- [ ] 2. Select the existing active webhook endpoints.
- [ ] 3. Roll the webhook signing secret for each.
- [ ] 4. Update the `STRIPE_WEBHOOK_SECRET` variable in the hosting environment and the Edge Functions.

## Step 3: Supabase Anon Key Rotation
- [ ] 1. Log into Supabase Dashboard.
- [ ] 2. Go to **Project Settings -> API**.
- [ ] 3. In the JWT Secret / API Keys section, generate a new JWT secret. *WARNING: This will immediately invalidate the existing Anon and Service Role keys, disrupting active users. Proceed with caution.*
- [ ] 4. Once new keys are generated, copy the new `anon` key.
- [ ] 5. Update the `VITE_SUPABASE_ANON_KEY` in your hosting environment configuration (e.g., Vercel).
- [ ] 6. Update `.env` files for local development.

## Step 4: Verification and Deployment
- [ ] 1. Trigger a full redeployment of the application on your hosting provider. Make sure to **clear the build cache**.
- [ ] 2. Redeploy the Supabase edge functions with the new environment variables using `supabase functions deploy`.
- [ ] 3. Run a test booking using a test account (or safe production value) to ensure that checkout sessions can still be generated.
- [ ] 4. Check the application error boundary output and network logs; confirm no older keys are being served dynamically.

## Step 5: Post-Rotation Cleanup
- [ ] 1. Delete or fully expire the old Stripe keys if you used the "Expire in X hours" option.
- [ ] 2. Audit logs in Supabase to monitor for any failed authentications or requests using the old API keys over the next 24 hours.

**Note**: All client code now retrieves keys correctly via environment variables due to our recent fixes. Ensure `.env` is strongly listed in `.gitignore` to prevent future leaks!
