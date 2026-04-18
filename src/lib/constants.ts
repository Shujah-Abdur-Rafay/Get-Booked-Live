/**
 * constants.ts — GetBooked.Live financial constants
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all platform-wide financial values.
 *
 * ⚠️  IMPORTANT: To change any percentage platform-wide, update ONLY this file.
 *     The same values must also be kept in sync with:
 *       supabase/functions/_shared/constants.ts  (edge-function mirror)
 *
 * History:
 *   2026-04-08  Unified deposit rate to 50% (was diverged: UI=25%, contract=50%).
 */

// ─── Deposit ──────────────────────────────────────────────────────────────────

/**
 * Fraction of the booking guarantee collected as the initial deposit.
 * The artist's contract, Stripe session, and webhook classification all
 * use this single constant.
 *
 * 0.5 = 50%
 */
export const DEPOSIT_RATE = 0.5;

/** Human-readable label shown in the UI and legal documentation. */
export const DEPOSIT_RATE_LABEL = "50%";

/**
 * Number of calendar days after signing that the deposit is due.
 * Shown in the generated contract PDF.
 */
export const DEPOSIT_DUE_DAYS = 14;

// ─── Commission (platform fee) ────────────────────────────────────────────────

/**
 * Default commission rate applied to bookings for Free-tier accounts.
 * Pro and Agency tiers override this via the subscription_plan field.
 */
export const DEFAULT_COMMISSION_RATE = 0.20; // 20%

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate the deposit amount (in whole dollars) for a given guarantee.
 * Always rounds to the nearest dollar to prevent floating-point issues.
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
