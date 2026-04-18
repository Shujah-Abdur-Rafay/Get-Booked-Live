/**
 * _shared/payouts.ts — Centralized payout execution & failure handling
 * ─────────────────────────────────────────────────────────────────────────────
 * This module owns ALL payout transfer logic for GetBooked.Live.
 *
 * It is imported by:
 *   - stripe-webhook/index.ts          (initial payout after final payment)
 *   - retry-payout/index.ts            (scheduled/manual retry function)
 *
 * Design goals:
 *   1. ZERO silent failures — every failure is persisted in payout_failures
 *   2. Full audit trail — every attempt is recorded with Stripe error details
 *   3. Exponential backoff — next_retry_at grows: 1h → 6h → 24h → give up
 *   4. Admin notification — email dispatched to all admin_users on failure
 *   5. Artist notification — in-app notification inserted on failure & success
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { DEFAULT_COMMISSION_RATE } from "./constants.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayoutContext {
  bookingId: string;
  artistId: string;
  venueName: string;
  guarantee: number;
  commissionRate?: number;
  stripeEventId?: string;
}

export interface PayoutResult {
  success: boolean;
  transferId?: string;      // Stripe transfer ID on success
  failureId?: string;       // payout_failures row ID on failure
  errorMessage?: string;
  skipped?: boolean;        // true if artist has no Stripe account
  skipReason?: string;
}

// Exponential back-off schedule (hours after failure)
const RETRY_BACKOFF_HOURS = [1, 6, 24] as const;
const MAX_RETRIES = RETRY_BACKOFF_HOURS.length;

// ─── Logger ───────────────────────────────────────────────────────────────────

export type SimpleLogger = {
  info:  (msg: string, data?: unknown) => void;
  warn:  (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
};

function defaultLog(level: string, msg: string, data?: unknown): void {
  const line = `[payouts] ${level} ${msg}`;
  const payload = data !== undefined ? JSON.stringify(data) : undefined;
  if (level === "error") {
    payload !== undefined ? console.error(line, payload) : console.error(line);
  } else if (level === "warn") {
    payload !== undefined ? console.warn(line, payload) : console.warn(line);
  } else {
    payload !== undefined ? console.log(line, payload) : console.log(line);
  }
}

export const defaultLogger: SimpleLogger = {
  info:  (m, d) => defaultLog("info",  m, d),
  warn:  (m, d) => defaultLog("warn",  m, d),
  error: (m, d) => defaultLog("error", m, d),
};

// ─── Core payout execution ────────────────────────────────────────────────────

/**
 * executeTransfer — Attempt a single Stripe Connect payout.
 *
 * On success: records the transfer ID and notifies the artist.
 * On failure: persists a payout_failures row, schedules retry,
 *             notifies artist + all platform admins.
 *
 * NEVER throws. Returns a PayoutResult always.
 */
export async function executeTransfer(
  stripe: Stripe,
  supabase: SupabaseClient,
  ctx: PayoutContext,
  log: SimpleLogger = defaultLogger
): Promise<PayoutResult> {

  // ── 1. Load artist Stripe Connect account ────────────────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_onboarding_complete, display_name")
    .eq("user_id", ctx.artistId)
    .single();

  if (profileErr || !profile) {
    log.warn("could not load artist profile — skipping payout", {
      artistId: ctx.artistId,
      dbError: profileErr?.message,
    });
    return { success: false, skipped: true, skipReason: "profile_not_found" };
  }

  if (!profile.stripe_account_id || !profile.stripe_onboarding_complete) {
    log.info("artist has no completed Stripe Connect account — payout skipped", {
      artistId: ctx.artistId,
      hasAccount: !!profile.stripe_account_id,
      onboardingComplete: profile.stripe_onboarding_complete,
    });
    return {
      success: false,
      skipped: true,
      skipReason: profile.stripe_account_id
        ? "onboarding_incomplete"
        : "no_stripe_account",
    };
  }

  // ── 2. Calculate payout amount ─────────────────────────────────────────────
  const commissionRate = ctx.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const payoutCents    = Math.round(ctx.guarantee * (1 - commissionRate) * 100);
  const payoutDollars  = payoutCents / 100;

  log.info("attempting Stripe Connect transfer", {
    bookingId:        ctx.bookingId,
    artistId:         ctx.artistId,
    destination:      profile.stripe_account_id,
    payoutCents,
    commissionRate,
    guarantee:        ctx.guarantee,
  });

  // ── 3. Attempt the transfer ────────────────────────────────────────────────
  try {
    const transfer = await stripe.transfers.create({
      amount:      payoutCents,
      currency:    "usd",
      destination: profile.stripe_account_id,
      description: `Payout for booking ${ctx.bookingId} — ${ctx.venueName}`,
      metadata: {
        booking_id:       ctx.bookingId,
        artist_id:        ctx.artistId,
        stripe_event_id:  ctx.stripeEventId ?? "",
      },
    });

    log.info("Stripe Connect transfer created successfully", {
      bookingId:    ctx.bookingId,
      transferId:   transfer.id,
      payoutDollars,
      destination:  profile.stripe_account_id,
    });

    // ── 4a. Notify artist of successful payout ────────────────────────────────
    await notifyArtist(supabase, {
      artistId:   ctx.artistId,
      bookingId:  ctx.bookingId,
      type:       "payout_sent",
      title:      "Payout initiated 💸",
      message:    `Your payout of $${payoutDollars.toLocaleString()} for the booking at ${ctx.venueName} has been sent to your bank account. Allow 2–5 business days for funds to arrive.`,
    }, log);

    return { success: true, transferId: transfer.id };

  } catch (err: unknown) {
    // ── 5. Handle failure ──────────────────────────────────────────────────────
    const stripeErr = err as Stripe.errors.StripeError | undefined;
    const errMessage = err instanceof Error ? err.message : String(err);
    const errCode    = stripeErr?.code    ?? null;
    const errType    = stripeErr?.type    ?? (err instanceof Error ? err.constructor.name : "unknown");

    log.error("Stripe Connect transfer FAILED", {
      bookingId:    ctx.bookingId,
      artistId:     ctx.artistId,
      payoutCents,
      destination:  profile.stripe_account_id,
      errorCode:    errCode,
      errorType:    errType,
      errorMessage: errMessage,
    });

    // ── 5a. Persist failure record ─────────────────────────────────────────────
    const failureId = await recordPayoutFailure(supabase, {
      bookingId:           ctx.bookingId,
      artistId:            ctx.artistId,
      stripeAccountId:     profile.stripe_account_id,
      payoutAmountCents:   payoutCents,
      stripeErrorCode:     errCode,
      stripeErrorMessage:  errMessage,
      stripeErrorType:     errType,
      stripeEventId:       ctx.stripeEventId ?? null,
    }, log);

    // ── 5b. Notify artist of payout failure ────────────────────────────────────
    await notifyArtist(supabase, {
      artistId:  ctx.artistId,
      bookingId: ctx.bookingId,
      type:      "payout_failed",
      title:     "Payout failed — we're on it",
      message:   `Your payout of $${payoutDollars.toLocaleString()} for the booking at ${ctx.venueName} could not be sent automatically. Our team has been alerted and will follow up within 1 business day. Reference: ${failureId ?? "N/A"}`,
    }, log);

    // ── 5c. Email all platform admins ──────────────────────────────────────────
    await notifyAdmins(supabase, {
      bookingId:         ctx.bookingId,
      artistId:          ctx.artistId,
      artistDisplayName: profile.display_name,
      venueName:         ctx.venueName,
      payoutDollars,
      stripeAccountId:   profile.stripe_account_id,
      errorCode:         errCode,
      errorMessage:      errMessage,
      errorType:         errType,
      failureId:         failureId ?? null,
    }, log);

    // ── 5d. Update admin_notified_at on the failure row ───────────────────────
    if (failureId) {
      await supabase
        .from("payout_failures")
        .update({
          admin_notified_at:          new Date().toISOString(),
          admin_notification_count:   1,
        })
        .eq("id", failureId);
    }

    return {
      success:      false,
      failureId:    failureId ?? undefined,
      errorMessage: errMessage,
    };
  }
}

// ─── Retry a specific payout_failure row ──────────────────────────────────────

/**
 * retryPayoutFailure — Idempotently retry a failed payout.
 *
 * Looks up the payout_failures row, validates it's eligible for retry,
 * then calls executeTransfer. Updates the row regardless of outcome.
 * Returns the new PayoutResult.
 */
export async function retryPayoutFailure(
  stripe: Stripe,
  supabase: SupabaseClient,
  failureId: string,
  log: SimpleLogger = defaultLogger
): Promise<PayoutResult> {

  // ── Load failure row ────────────────────────────────────────────────────────
  const { data: failure, error: fetchErr } = await supabase
    .from("payout_failures")
    .select("*")
    .eq("id", failureId)
    .single();

  if (fetchErr || !failure) {
    log.error("payout_failure not found for retry", { failureId, dbError: fetchErr?.message });
    return { success: false, errorMessage: "Failure record not found" };
  }

  if (failure.status === "retried" || failure.status === "resolved") {
    log.info("payout already resolved — skipping retry", { failureId, status: failure.status });
    return { success: true, transferId: failure.resolved_transfer_id ?? undefined };
  }

  if (failure.retry_count >= failure.max_retries) {
    log.warn("max retries exhausted — marking as failed", {
      failureId,
      retryCount: failure.retry_count,
      maxRetries: failure.max_retries,
    });

    await supabase
      .from("payout_failures")
      .update({ status: "failed" })
      .eq("id", failureId);

    // Escalate to admins again
    await notifyAdminsEscalation(supabase, failure, log);
    return { success: false, failureId, errorMessage: "Max retries exhausted" };
  }

  // ── Mark as retrying ────────────────────────────────────────────────────────
  await supabase
    .from("payout_failures")
    .update({
      status:           "retrying",
      last_retried_at:  new Date().toISOString(),
      retry_count:      failure.retry_count + 1,
    })
    .eq("id", failureId);

  // ── Load booking for context ────────────────────────────────────────────────
  const { data: booking } = await supabase
    .from("bookings")
    .select("venue_name, guarantee, commission_rate")
    .eq("id", failure.booking_id)
    .single();

  // ── Attempt the transfer ────────────────────────────────────────────────────
  const result = await executeTransfer(stripe, supabase, {
    bookingId:     failure.booking_id,
    artistId:      failure.artist_id,
    venueName:     booking?.venue_name ?? "your venue",
    guarantee:     booking?.guarantee ?? (failure.payout_amount_cents / 100),
    commissionRate: booking?.commission_rate ?? DEFAULT_COMMISSION_RATE,
    stripeEventId: failure.stripe_event_id ?? undefined,
  }, log);

  // ── Update failure row based on result ──────────────────────────────────────
  if (result.success && result.transferId) {
    await supabase
      .from("payout_failures")
      .update({
        status:                "retried",
        resolved_transfer_id:  result.transferId,
        resolved_at:           new Date().toISOString(),
        next_retry_at:         null,
      })
      .eq("id", failureId);

    log.info("payout retry succeeded", { failureId, transferId: result.transferId });
  } else if (!result.success && !result.skipped) {
    // Schedule next retry with exponential backoff
    const nextRetryHours = RETRY_BACKOFF_HOURS[failure.retry_count] ?? 24;
    const nextRetryAt    = new Date(Date.now() + nextRetryHours * 3600 * 1000).toISOString();

    await supabase
      .from("payout_failures")
      .update({
        status:        failure.retry_count + 1 >= MAX_RETRIES ? "failed" : "pending",
        next_retry_at: failure.retry_count + 1 >= MAX_RETRIES ? null : nextRetryAt,
      })
      .eq("id", failureId);

    log.warn("payout retry failed — rescheduled or exhausted", {
      failureId,
      newRetryCount: failure.retry_count + 1,
      nextRetryAt:  failure.retry_count + 1 >= MAX_RETRIES ? null : nextRetryAt,
    });
  }

  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function recordPayoutFailure(
  supabase: SupabaseClient,
  data: {
    bookingId:           string;
    artistId:            string;
    stripeAccountId:     string;
    payoutAmountCents:   number;
    stripeErrorCode:     string | null;
    stripeErrorMessage:  string;
    stripeErrorType:     string;
    stripeEventId:       string | null;
  },
  log: SimpleLogger
): Promise<string | null> {
  // Calculate first retry window: 1 hour from now
  const nextRetryAt = new Date(Date.now() + RETRY_BACKOFF_HOURS[0] * 3600 * 1000).toISOString();

  const { data: row, error } = await supabase
    .from("payout_failures")
    .insert({
      booking_id:           data.bookingId,
      artist_id:            data.artistId,
      stripe_account_id:    data.stripeAccountId,
      payout_amount_cents:  data.payoutAmountCents,
      currency:             "usd",
      stripe_error_code:    data.stripeErrorCode,
      stripe_error_message: data.stripeErrorMessage,
      stripe_error_type:    data.stripeErrorType,
      stripe_event_id:      data.stripeEventId,
      status:               "pending",
      retry_count:          0,
      max_retries:          MAX_RETRIES,
      next_retry_at:        nextRetryAt,
    })
    .select("id")
    .single();

  if (error) {
    log.error("CRITICAL: failed to write payout_failure record — data may be lost!", {
      bookingId:    data.bookingId,
      artistId:     data.artistId,
      payoutCents:  data.payoutAmountCents,
      dbError:      error.message,
    });
    return null;
  }

  log.info("payout failure recorded", { failureId: row.id, bookingId: data.bookingId });
  return row.id;
}

async function notifyArtist(
  supabase: SupabaseClient,
  opts: {
    artistId:  string;
    bookingId: string;
    type:      string;
    title:     string;
    message:   string;
  },
  log: SimpleLogger
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id:    opts.artistId,
    type:       opts.type,
    title:      opts.title,
    message:    opts.message,
    booking_id: opts.bookingId,
    is_read:    false,
  });

  if (error) {
    log.warn("failed to insert artist notification", {
      type:      opts.type,
      artistId:  opts.artistId,
      bookingId: opts.bookingId,
      dbError:   error.message,
    });
  }
}

async function notifyAdmins(
  supabase: SupabaseClient,
  opts: {
    bookingId:         string;
    artistId:          string;
    artistDisplayName: string | null;
    venueName:         string;
    payoutDollars:     number;
    stripeAccountId:   string;
    errorCode:         string | null;
    errorMessage:      string;
    errorType:         string;
    failureId:         string | null;
  },
  log: SimpleLogger
): Promise<void> {
  // Load all admin email addresses
  const { data: admins, error: adminErr } = await supabase
    .from("admin_users")
    .select("user_id");

  if (adminErr || !admins?.length) {
    log.warn("no admins found to notify — using fallback email", {
      dbError: adminErr?.message,
    });
    await sendAdminEmail(supabase, {
      to: Deno.env.get("ADMIN_ALERT_EMAIL") ?? "ops@getbooked.live",
      ...opts,
    }, log);
    return;
  }

  // Look up email addresses for all admin user_ids
  const adminIds = (admins as Array<{ user_id: string }>).map((a) => a.user_id);
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();

  if (authErr || !authUsers) {
    log.warn("could not list auth users for admin email", { dbError: authErr?.message });
    return;
  }

  const adminEmails = (authUsers.users as Array<{ id: string; email?: string }>)
    .filter((u) => adminIds.includes(u.id) && !!u.email)
    .map((u) => u.email as string);

  if (!adminEmails.length) {
    log.warn("admin users have no email addresses configured");
    return;
  }

  await Promise.allSettled(
    adminEmails.map((email) =>
      sendAdminEmail(supabase, { to: email, ...opts }, log)
    )
  );
}

async function sendAdminEmail(
  supabase: SupabaseClient,
  opts: {
    to:                string;
    bookingId:         string;
    artistId:          string;
    artistDisplayName: string | null;
    venueName:         string;
    payoutDollars:     number;
    stripeAccountId:   string;
    errorCode:         string | null;
    errorMessage:      string;
    errorType:         string;
    failureId:         string | null;
  },
  log: SimpleLogger
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#ef4444;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">🚨 Payout Failure — Action Required</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p style="margin:0 0 16px">A Stripe Connect payout has failed and requires manual review.</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:40%">Failure ID</td>
              <td style="padding:8px;font-family:monospace">${opts.failureId ?? "unknown"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Booking ID</td>
              <td style="padding:8px;font-family:monospace">${opts.bookingId}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Artist</td>
              <td style="padding:8px">${opts.artistDisplayName ?? "Unknown"} (${opts.artistId})</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Venue</td>
              <td style="padding:8px">${opts.venueName}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Payout Amount</td>
              <td style="padding:8px;font-weight:bold;color:#16a34a">$${opts.payoutDollars.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Stripe Account</td>
              <td style="padding:8px;font-family:monospace">${opts.stripeAccountId}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Error Type</td>
              <td style="padding:8px;color:#ef4444">${opts.errorType}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Error Code</td>
              <td style="padding:8px;font-family:monospace">${opts.errorCode ?? "none"}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">Error Message</td>
              <td style="padding:8px">${opts.errorMessage}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Time (UTC)</td>
              <td style="padding:8px">${new Date().toUTCString()}</td></tr>
        </table>

        <div style="margin-top:24px;padding:16px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca">
          <p style="margin:0;font-weight:bold;color:#dc2626">Next Steps:</p>
          <ol style="margin:8px 0 0 0;color:#374151">
            <li>Check the payout_failures table for status — an automatic retry is scheduled in 1 hour.</li>
            <li>Verify the artist's Stripe Connect account in the platform dashboard.</li>
            <li>If automatic retry fails after 3 attempts, initiate a manual bank transfer or contact artist.</li>
            <li>Mark resolved in the admin panel once complete.</li>
          </ol>
        </div>

        <p style="margin-top:20px;font-size:12px;color:#6b7280">
          This is an automated alert from GetBooked.Live. Do not reply to this email.
        </p>
      </div>
    </div>
  `.trim();

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to:      opts.to,
        subject: `🚨 Payout Failure: $${opts.payoutDollars.toLocaleString()} for booking ${opts.bookingId}`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      log.warn("admin alert email send failed", { to: opts.to, status: res.status, body: text });
    } else {
      log.info("admin alert email sent", { to: opts.to });
    }
  } catch (emailErr: unknown) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    log.warn("admin alert email threw — continuing", { to: opts.to, error: msg });
  }
}

async function notifyAdminsEscalation(
  supabase: SupabaseClient,
  failure: Record<string, unknown>,
  log: SimpleLogger
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const alertEmail  = Deno.env.get("ADMIN_ALERT_EMAIL") ?? "ops@getbooked.live";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#7f1d1d;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">🔴 ESCALATION: Payout Failure Unresolved After Max Retries</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>The following payout has failed ${failure.retry_count} times and requires <strong>immediate manual intervention</strong>:</p>
        <ul>
          <li><strong>Failure ID:</strong> ${failure.id}</li>
          <li><strong>Booking ID:</strong> ${failure.booking_id}</li>
          <li><strong>Artist ID:</strong> ${failure.artist_id}</li>
          <li><strong>Amount:</strong> $${((failure.payout_amount_cents as number) / 100).toLocaleString()}</li>
          <li><strong>Last Error:</strong> ${failure.stripe_error_message}</li>
        </ul>
        <p style="color:#dc2626;font-weight:bold">Automated retries have been exhausted. This requires manual action.</p>
      </div>
    </div>
  `.trim();

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to:      alertEmail,
        subject: `🔴 ESCALATION: Payout ${failure.id} failed after ${failure.retry_count} retries`,
        html,
      }),
    });
  } catch (err) {
    log.error("escalation email failed", { failureId: failure.id, error: String(err) });
  }
}
