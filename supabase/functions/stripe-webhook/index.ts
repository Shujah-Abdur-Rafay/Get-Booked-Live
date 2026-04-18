/**
 * stripe-webhook/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardened Stripe webhook handler for GetBooked.Live.
 *
 * Key design principles:
 *
 *  1. NEVER swallow exceptions with a 200 — Stripe must be able to retry.
 *     Handler errors return 500 so Stripe queues a retry.
 *     Intentional skips (duplicate, no-op) return 200 with a reason.
 *
 *  2. IDEMPOTENCY — every processed event is recorded in stripe_webhook_events.
 *     Duplicate deliveries (Stripe retries after a timeout) are detected and
 *     acknowledged with 200 immediately, without re-running logic.
 *
 *  3. STRUCTURED LOGGING — every log line carries the event ID and type so
 *     log aggregators (Datadog, Logflare, etc.) can filter and alert on it.
 *
 *  4. SINGLE SOURCE OF TRUTH — deposit math uses _shared/constants.ts.
 *     The `newStatus` ReferenceError that existed in the original code is
 *     fully resolved; all variables are declared and scoped correctly.
 *
 *  5. DEFENSIVE NULL CHECKS — every Stripe field that could be null/undefined
 *     is guarded before use.
 *
 * HTTP contract with Stripe:
 *  200 → event received and either processed or intentionally skipped
 *  400 → bad payload / signature mismatch (Stripe will NOT retry)
 *  500 → unexpected runtime error (Stripe WILL retry up to 3 days)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { calcDeposit, classifyPayment } from "../_shared/constants.ts";
import { executeTransfer, type PayoutResult } from "../_shared/payouts.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventOutcome =
  | "processed"          // logic ran and state was updated
  | "duplicate"          // event already processed (idempotency hit)
  | "skipped_no_booking" // no booking_id in metadata
  | "skipped_no_payment" // payment_status !== 'paid'
  | "skipped_no_user"    // no user_id in account metadata
  | "booking_not_found"  // booking missing from DB
  | "update_failed"      // booking DB update failed
  | "transfer_failed"    // Stripe Connect transfer failed
  | "unhandled_type";    // event type not in the switch

// ─── Logger ───────────────────────────────────────────────────────────────────

/**
 * Structured logger that always prefixes every line with the Stripe event ID
 * and type. This makes it trivial to grep/filter logs in any aggregator.
 */
function makeLogger(eventId: string, eventType: string) {
  const prefix = `[stripe-webhook][${eventType}][${eventId}]`;
  return {
    info:  (msg: string, data?: unknown) =>
      console.log(`${prefix} ${msg}`, data !== undefined ? JSON.stringify(data) : ""),
    warn:  (msg: string, data?: unknown) =>
      console.warn(`${prefix} WARN ${msg}`, data !== undefined ? JSON.stringify(data) : ""),
    error: (msg: string, data?: unknown) =>
      console.error(`${prefix} ERROR ${msg}`, data !== undefined ? JSON.stringify(data) : ""),
  };
}

// ─── Idempotency helpers ──────────────────────────────────────────────────────

async function isAlreadyProcessed(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (error) {
    // If we can't check idempotency, play it safe and re-process.
    // This is preferable to silently skipping a legitimate event.
    console.warn(`[stripe-webhook] idempotency check failed for ${eventId}:`, error.message);
    return false;
  }

  return !!data;
}

async function markProcessed(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  bookingId: string | null,
  outcome: EventOutcome
): Promise<void> {
  const { error } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    booking_id: bookingId ?? null,
    outcome,
  });

  if (error) {
    // Non-fatal — log but don't crash the handler.
    // Worst case: the event might be re-processed on Stripe retry,
    // but idempotent DB updates will make that safe.
    console.warn(`[stripe-webhook] failed to record processed event ${eventId}:`, error.message);
  }
}

// ─── Response helpers ─────────────────────────────────────────────────────────

const jsonHeaders = { "Content-Type": "application/json" };

function ok(msg: string) {
  return new Response(JSON.stringify({ received: true, message: msg }), {
    status: 200,
    headers: jsonHeaders,
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: jsonHeaders,
  });
}

function serverError(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 500,
    headers: jsonHeaders,
  });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 * Handles both the deposit payment and the final payment.
 * Returns { outcome, bookingId } so the top-level can mark the event processed.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: SupabaseClient,
  log: ReturnType<typeof makeLogger>
): Promise<{ outcome: EventOutcome; bookingId: string | null }> {

  // ── 1. Input validation ─────────────────────────────────────────────────────

  const bookingId = session.metadata?.booking_id ?? null;

  if (!bookingId) {
    log.warn("no booking_id in session metadata — skipping", {
      sessionId: session.id,
    });
    return { outcome: "skipped_no_booking", bookingId: null };
  }

  if (session.payment_status !== "paid") {
    log.warn("payment_status is not 'paid' — skipping", {
      bookingId,
      paymentStatus: session.payment_status,
    });
    return { outcome: "skipped_no_payment", bookingId };
  }

  // ── 2. Load booking ─────────────────────────────────────────────────────────

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, status, payment_status, artist_id, promoter_id, guarantee, commission_rate, venue_name")
    .eq("id", bookingId)
    .single();

  if (bErr || !booking) {
    log.error("booking not found in DB", { bookingId, dbError: bErr?.message });
    // Return an outcome so idempotency is NOT recorded — we want Stripe to retry.
    // The caller will surface this as a 500.
    throw new Error(`Booking ${bookingId} not found: ${bErr?.message ?? "null result"}`);
  }

  // ── 3. Classify payment (deposit vs. final) using shared constant ───────────

  const amountPaidDollars = (session.amount_total ?? 0) / 100;

  if (amountPaidDollars <= 0) {
    log.warn("session.amount_total is 0 or missing — skipping", {
      bookingId,
      amountTotal: session.amount_total,
    });
    return { outcome: "skipped_no_payment", bookingId };
  }

  const paymentType = classifyPayment(amountPaidDollars, booking.guarantee);
  const isDeposit = paymentType === "deposit";
  const isFinalPayment = paymentType === "final";

  log.info("payment classified", {
    bookingId,
    paymentType,
    amountPaid: amountPaidDollars,
    expectedDeposit: calcDeposit(booking.guarantee),
    guarantee: booking.guarantee,
  });

  // ── 4. Determine new statuses ────────────────────────────────────────────────

  // These variables are fully declared and named consistently — this was the
  // original `newStatus` ReferenceError. Both variables are used below.
  const newBookingStatus = isFinalPayment ? "completed" : "deposit_paid";
  const newPaymentStatus = isFinalPayment ? "fully_paid"  : "deposit_paid";

  // Guard: don't re-process if DB already reflects this state
  if (booking.payment_status === newPaymentStatus) {
    log.info("booking payment_status already up to date — no-op", {
      bookingId,
      currentPaymentStatus: booking.payment_status,
    });
    // Return processed so the event is recorded and not retried
    return { outcome: "processed", bookingId };
  }

  // ── 5. Update booking ────────────────────────────────────────────────────────

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status:                    newBookingStatus,
    payment_status:            newPaymentStatus,
    stripe_payment_intent_id: (session.payment_intent as string) ?? null,
  };

  if (isDeposit)      updatePayload.deposit_paid_at = now;
  if (isFinalPayment) updatePayload.final_paid_at   = now;

  const { error: updateErr } = await supabase
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId);

  if (updateErr) {
    log.error("failed to update booking — will allow Stripe to retry", {
      bookingId,
      newBookingStatus,
      newPaymentStatus,
      dbError: updateErr.message,
    });
    throw new Error(`DB update failed for booking ${bookingId}: ${updateErr.message}`);
  }

  log.info("booking updated successfully", { bookingId, newBookingStatus, newPaymentStatus });

  // ── 6. Stripe Connect payout (final payment only) ────────────────────────────
  //
  // All payout logic (transfer, failure persistence, admin email, artist
  // notification, retry scheduling) is handled by the shared payouts module.
  // The webhook never touches this logic directly.

  let payoutResult: PayoutResult = { success: false, skipped: true, skipReason: "not_final_payment" };

  if (isFinalPayment && booking.artist_id) {
    payoutResult = await executeTransfer(stripe, supabase, {
      bookingId:     bookingId,
      artistId:      booking.artist_id,
      venueName:     booking.venue_name ?? "your venue",
      guarantee:     booking.guarantee,
      commissionRate: booking.commission_rate ?? undefined,
      stripeEventId: session.id,
    }, log);

    log.info("payout result", {
      bookingId,
      success:    payoutResult.success,
      transferId: payoutResult.transferId ?? null,
      failureId:  payoutResult.failureId ?? null,
      skipped:    payoutResult.skipped ?? false,
      skipReason: payoutResult.skipReason ?? null,
    });
  }

  // ── 7. Artist payment-received notification (deposit path only) ──────────────
  //
  // For final payments: executeTransfer() already sent payout_sent or
  // payout_failed notifications to the artist — don't double-notify.
  // For deposits: send a deposit-received notification below.

  if (isDeposit) {
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id:    booking.artist_id,
      type:       "payment_received",
      title:      "Deposit received",
      message:    `A deposit of $${amountPaidDollars.toLocaleString()} has been paid for your booking at ${booking.venue_name}.`,
      booking_id: bookingId,
      is_read:    false,
    });

    if (notifErr) {
      log.warn("failed to create deposit notification", { bookingId, error: notifErr.message });
    }
  }

  log.info("checkout.session.completed handler complete", {
    bookingId,
    newBookingStatus,
    newPaymentStatus,
    payoutSuccess:    payoutResult.success,
    payoutTransferId: payoutResult.transferId ?? null,
    payoutFailureId:  payoutResult.failureId ?? null,
    payoutSkipped:    payoutResult.skipped ?? false,
  });

  return { outcome: "processed", bookingId };
}

// ─── account.updated ──────────────────────────────────────────────────────────

async function handleAccountUpdated(
  account: Stripe.Account,
  supabase: SupabaseClient,
  log: ReturnType<typeof makeLogger>
): Promise<EventOutcome> {

  const userId = account.metadata?.user_id ?? null;

  if (!userId) {
    log.warn("no user_id in account metadata — cannot map to profile", {
      stripeAccountId: account.id,
    });
    return "skipped_no_user";
  }

  const isComplete     = account.details_submitted ?? false;
  const payoutsEnabled = account.payouts_enabled   ?? false;

  const { error } = await supabase
    .from("profiles")
    .update({ stripe_onboarding_complete: isComplete })
    .eq("user_id", userId);

  if (error) {
    log.error("failed to update stripe_onboarding_complete in profiles", {
      userId,
      stripeAccountId: account.id,
      dbError: error.message,
    });
    throw new Error(`Profile update failed for user ${userId}: ${error.message}`);
  }

  log.info("Stripe account updated", {
    userId,
    stripeAccountId: account.id,
    detailsSubmitted: isComplete,
    payoutsEnabled,
  });

  return "processed";
}

// ─── Payment failed / expired ─────────────────────────────────────────────────

async function handlePaymentFailedOrExpired(
  obj: Record<string, unknown>,
  eventType: string,
  supabase: SupabaseClient,
  log: ReturnType<typeof makeLogger>
): Promise<EventOutcome> {

  const bookingId = (obj.metadata as Record<string, string> | undefined)?.booking_id ?? null;

  log.warn("payment failed or expired", { eventType, bookingId });

  if (bookingId) {
    // Optionally mark booking as payment_failed so the UI can surface it
    // For now: insert a notification for the promoter
    const { data: booking } = await supabase
      .from("bookings")
      .select("promoter_id, venue_name")
      .eq("id", bookingId)
      .maybeSingle();

    if (booking?.promoter_id) {
      await supabase.from("notifications").insert({
        user_id:    booking.promoter_id,
        type:       "payment_failed",
        title:      "Payment failed",
        message:    `Your payment for the booking at ${booking.venue_name} was not completed. Please retry.`,
        booking_id: bookingId,
        is_read:    false,
      }).then(({ error }) => {
        if (error) log.warn("failed to create payment_failed notification", { error: error.message });
      });
    }
  }

  return "processed";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // ── Step 1: Validate required env vars ────────────────────────────────────────
  const webhookSecret    = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecretKey  = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl      = Deno.env.get("SUPABASE_URL");
  const supabaseKey      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !stripeSecretKey || !supabaseUrl || !supabaseKey) {
    console.error("[stripe-webhook] FATAL: missing required environment variables");
    return serverError("Server misconfiguration");
  }

  // ── Step 2: Validate Stripe signature ─────────────────────────────────────────
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.warn("[stripe-webhook] Request missing stripe-signature header");
    return badRequest("Missing stripe-signature header");
  }

  const stripe   = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  let event: Stripe.Event;
  let rawBody: string;
  try {
    rawBody = await req.text();
    event   = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[stripe-webhook] Signature verification failed: ${msg}`);
    // 400 = Stripe will NOT retry (bad payload is a permanent failure)
    return badRequest(`Webhook signature error: ${msg}`);
  }

  const log = makeLogger(event.id, event.type);
  log.info("received");

  // ── Step 3: Idempotency check ─────────────────────────────────────────────────
  const alreadyDone = await isAlreadyProcessed(supabase, event.id);
  if (alreadyDone) {
    log.info("duplicate delivery — already processed, returning 200");
    return ok("already processed");
  }

  // ── Step 4: Dispatch to event handler ────────────────────────────────────────
  let outcome: EventOutcome = "unhandled_type";
  let bookingId: string | null = null;

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session  = event.data.object as Stripe.Checkout.Session;
        const result   = await handleCheckoutSessionCompleted(session, stripe, supabase, log);
        outcome        = result.outcome;
        bookingId      = result.bookingId;
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        outcome       = await handleAccountUpdated(account, supabase, log);
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const obj = event.data.object as Record<string, unknown>;
        outcome   = await handlePaymentFailedOrExpired(obj, event.type, supabase, log);
        break;
      }

      default:
        log.info("no handler registered for this event type");
        outcome = "unhandled_type";
    }

    // ── Step 5: Mark event as processed (idempotency write) ──────────────────────
    await markProcessed(supabase, event.id, event.type, bookingId, outcome);

    log.info("handler complete", { outcome, bookingId });
    return ok(outcome);

  } catch (handlerErr: unknown) {
    // ── Step 6: Handler threw — DO NOT return 200 ─────────────────────────────────
    // Returning 500 tells Stripe to retry. We intentionally do NOT write to
    // stripe_webhook_events here so the next retry will re-process the event.
    const msg = handlerErr instanceof Error ? handlerErr.message : String(handlerErr);

    log.error("UNHANDLED exception in event handler — returning 500 for Stripe retry", {
      outcome,
      bookingId,
      error: msg,
    });

    return serverError(`Handler error: ${msg}`);
  }
});
