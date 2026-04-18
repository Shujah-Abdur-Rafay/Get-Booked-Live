/**
 * constants.ts — GetBooked.Live financial constants (Edge Function mirror)
 * ─────────────────────────────────────────────────────────────────────────────
 * This file is the Deno-compatible mirror of src/lib/constants.ts.
 * Both files MUST be kept in sync. The frontend imports from src/lib/constants.ts;
 * all Supabase Edge Functions import from this file.
 *
 * ⚠️  To change any value, update BOTH files simultaneously.
 *
 * History:
 *   2026-04-08  Unified deposit rate to 50% (was diverged: UI=25%, contract=50%).
 */

// ─── Deposit ──────────────────────────────────────────────────────────────────

/**
 * Fraction of the booking guarantee collected as the initial deposit.
 * All Stripe sessions, webhook classification, and the contract PDF
 * use this single constant.
 *
 * 0.5 = 50%
 */
export const DEPOSIT_RATE = 0.5;

/** Human-readable label for UI and legal documentation. */
export const DEPOSIT_RATE_LABEL = "50%";

/**
 * Number of calendar days after signing that the deposit is due.
 * Shown in the generated contract PDF.
 */
export const DEPOSIT_DUE_DAYS = 14;

// ─── Commission (platform fee) ────────────────────────────────────────────────

/** Default commission rate for Free-tier accounts. */
export const DEFAULT_COMMISSION_RATE = 0.20; // 20%

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate the deposit amount (in whole dollars) for a given guarantee.
 * Always rounds to the nearest dollar.
 */
export function calcDeposit(guarantee: number): number {
  return Math.round(guarantee * DEPOSIT_RATE);
}

/**
 * Calculate the remaining balance (guarantee minus deposit).
 */
export function calcBalance(guarantee: number): number {
  return guarantee - calcDeposit(guarantee);
}

/**
 * Determine whether a Stripe payment represents the deposit or the final payment.
 * Uses a $1 tolerance to account for rounding.
 */
export function classifyPayment(
  amountPaidDollars: number,
  guarantee: number
): "deposit" | "final" {
  const depositAmount = calcDeposit(guarantee);
  return Math.abs(amountPaidDollars - depositAmount) < 1 ? "deposit" : "final";
}
