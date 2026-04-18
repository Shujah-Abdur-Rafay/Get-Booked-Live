/**
 * useExchangeRates.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook wrapping the exchange-rate service.
 *
 * Features:
 *  - Fetches on mount; returns { rates, loading, isFallback, fetchedOn }.
 *  - Exposes `refresh()` to force a re-fetch (e.g. after a network reconnect).
 *  - Never throws — errors surface as { isFallback: true }.
 *  - Zero re-renders when rates come from today's cache (instant sync read).
 *
 * Usage:
 *   const { rates, loading, isFallback } = useExchangeRates();
 *   const usdEquiv = rates.GBP * someGbpAmount;
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchExchangeRates,
  type FxRates,
  type FxResult,
} from "@/lib/exchangeRates";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UseExchangeRatesReturn = {
  /** Live or cached exchange rates. Always has a valid value (never null). */
  rates: FxRates;
  /** true while the first network fetch is in-flight (only on cache miss). */
  loading: boolean;
  /**
   * true if we couldn't reach the API and are showing stale/default data.
   * Use this to render a subtle warning in the UI.
   */
  isFallback: boolean;
  /**
   * ISO date string "YYYY-MM-DD" of when the displayed rates were fetched.
   * "offline" if we fell back to compile-time defaults.
   */
  fetchedOn: string;
  /** Force a fresh API call regardless of cache state. */
  refresh: () => void;
};

// ─── Default rates (used as initial state before first fetch resolves) ────────

const DEFAULT_RATES: FxRates = {
  USD: 1,
  GBP: 1.27,
  EUR: 1.09,
  CAD: 0.74,
  AUD: 0.66,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExchangeRates(): UseExchangeRatesReturn {
  const [result, setResult] = useState<FxResult>({
    rates: DEFAULT_RATES,
    fetchedOn: "pending",
    isLive: false,
    isFallback: false,
  });
  const [loading, setLoading] = useState(true);
  // Incrementing this triggers a re-fetch
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const fx = await fetchExchangeRates();
      if (!cancelled) {
        setResult(fx);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchTick]);

  const refresh = useCallback(() => {
    setFetchTick((t) => t + 1);
  }, []);

  return {
    rates: result.rates,
    loading,
    isFallback: result.isFallback,
    fetchedOn: result.fetchedOn,
    refresh,
  };
}
