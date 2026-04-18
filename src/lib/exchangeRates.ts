/**
 * exchangeRates.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised exchange-rate service for GetBooked.Live.
 *
 * Strategy:
 *  1. On first call each calendar day, fetch live rates from ExchangeRate-API.
 *  2. Persist the result + a date-stamp in localStorage so every subsequent
 *     call within the same day is instant (zero network requests).
 *  3. If the API is unavailable, fall back to the last successfully cached
 *     rates. If there are no cached rates either, return safe compile-time
 *     defaults so the UI never hard-crashes.
 *
 * Supported currencies (all relative to 1 USD as base):
 *   USD · GBP · EUR · CAD · AUD
 *
 * Usage:
 *   import { fetchExchangeRates, type FxRates } from "@/lib/exchangeRates";
 *   const rates = await fetchExchangeRates();
 *   // rates.GBP → number of USD per 1 GBP (e.g. 1.27)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Map from currency code → how many USD 1 unit of that currency buys. */
export type FxRates = {
  USD: number;
  GBP: number;
  EUR: number;
  CAD: number;
  AUD: number;
};

export type FxResult = {
  rates: FxRates;
  /** ISO date string (YYYY-MM-DD) of when the rates were last refreshed. */
  fetchedOn: string;
  /** true = live data from API; false = came from cache or fallback. */
  isLive: boolean;
  /** true = we could not reach the API and fell back to stale/default data. */
  isFallback: boolean;
};

// The API key is read from VITE_EXCHANGE_RATE_API_KEY in .env.
// It is intentionally prefixed with VITE_ because ExchangeRate-API operates
// on a per-IP / per-referrer basis rather than being a true secret — but
// storing it in an env var prevents it from being accidentally committed
// or inadvertently rotated without a deploy.
const EXCHANGE_RATE_API_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY as string | undefined;

const API_URL = EXCHANGE_RATE_API_KEY
  ? `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`
  : null;

const CACHE_KEY = "gbl_fx_rates_v1";

/**
 * Currencies supported by the application.
 * These are the codes we pull out of the API response.
 */
const SUPPORTED: (keyof FxRates)[] = ["USD", "GBP", "EUR", "CAD", "AUD"];

/**
 * Compile-time fallback rates (1 unit of currency → USD).
 * Updated ~quarterly. Only used when both the API *and* localStorage are
 * unavailable (e.g. user is offline on first ever visit).
 */
const FALLBACK_RATES: FxRates = {
  USD: 1,
  GBP: 1.27,
  EUR: 1.09,
  CAD: 0.74,
  AUD: 0.66,
};

// ─── Cache helpers ─────────────────────────────────────────────────────────────

type CachedPayload = {
  rates: FxRates;
  fetchedOn: string; // "YYYY-MM-DD"
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPayload;
  } catch {
    return null;
  }
}

function writeCache(payload: CachedPayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage might be full or unavailable (private browsing) — ignore
  }
}

// ─── API fetch ────────────────────────────────────────────────────────────────

/**
 * Parse the raw ExchangeRate-API JSON response into our FxRates shape.
 * The API returns rates as { "GBP": 0.787, "EUR": 0.918, ... }
 * (i.e. how many of that currency you get for 1 USD).
 *
 * We store the *inverse* so our code can multiply:
 *   guaranteeInLocalCurrency * rates[currency]  →  USD amount
 */
function parseApiResponse(json: Record<string, unknown>): FxRates | null {
  try {
    const conversionRates = json["conversion_rates"] as Record<string, number>;
    if (!conversionRates) return null;

    const rates = {} as FxRates;
    for (const code of SUPPORTED) {
      const apiRate = conversionRates[code]; // how many units of `code` per 1 USD
      if (typeof apiRate !== "number" || apiRate <= 0) return null;
      // Invert: how many USD you get for 1 unit of `code`
      rates[code] = code === "USD" ? 1 : 1 / apiRate;
    }
    return rates;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches today's exchange rates.
 *
 * - Returns cached data immediately if it was fetched *today*.
 * - Otherwise calls the ExchangeRate-API, updates the cache, and returns
 *   fresh data.
 * - On network/parse failure, falls back to yesterday's cache (if any) or
 *   the compile-time FALLBACK_RATES constant.
 *
 * This function is safe to call on every render — the cache check is
 * synchronous and the network request is only issued once per calendar day.
 */
export async function fetchExchangeRates(): Promise<FxResult> {
  const today = todayDate();
  const cached = readCache();

  // ── Cache hit: rates are from today — return instantly ──────────────────────
  if (cached && cached.fetchedOn === today) {
    return {
      rates: cached.rates,
      fetchedOn: cached.fetchedOn,
      isLive: false, // came from cache, no network call made
      isFallback: false,
    };
  }

  // ── Cache miss or stale: fetch from API ──────────────────────────────────────
  if (!API_URL) {
    console.warn(
      "[ExchangeRates] VITE_EXCHANGE_RATE_API_KEY is not set — " +
      "using cached or fallback rates. Add it to your .env file."
    );
    // Skip straight to fallback logic below
  } else {
    try {
      const res = await fetch(API_URL, {
        // Don't let a slow network block the UI for more than 8 seconds
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) throw new Error(`ExchangeRate-API responded with ${res.status}`);

      const json = await res.json();

      // Validate the API returned a successful result
      if (json["result"] !== "success") {
        throw new Error(`ExchangeRate-API error: ${json["error-type"] ?? "unknown"}`);
      }

      const rates = parseApiResponse(json);
      if (!rates) throw new Error("ExchangeRate-API: could not parse conversion_rates");

      const payload: CachedPayload = { rates, fetchedOn: today };
      writeCache(payload);

      return { rates, fetchedOn: today, isLive: true, isFallback: false };
    } catch (err) {
      console.warn("[ExchangeRates] API call failed — using fallback rates:", err);
    }
  }

  // ── Fallback priority 1: stale but non-null cached rates from a previous day
  if (cached) {
    return {
      rates: cached.rates,
      fetchedOn: cached.fetchedOn,
      isLive: false,
      isFallback: true,
    };
  }

  // ── Fallback priority 2: compile-time constants (first offline visit) ───────
  return {
    rates: FALLBACK_RATES,
    fetchedOn: "offline",
    isLive: false,
    isFallback: true,
  };
}


/**
 * Convert an amount from a given currency to USD.
 *
 * @param amount     - numeric amount in the source currency
 * @param currency   - ISO code of the source currency (e.g. "GBP")
 * @param rates      - FxRates object from fetchExchangeRates()
 * @returns amount converted to USD
 */
export function toUSD(amount: number, currency: keyof FxRates, rates: FxRates): number {
  return amount * (rates[currency] ?? 1);
}

/** The static CURRENCIES metadata array — used by the currency selector. */
export const CURRENCIES = [
  { code: "USD" as const, symbol: "$",  label: "US Dollar",        flag: "🇺🇸" },
  { code: "GBP" as const, symbol: "£",  label: "British Pound",    flag: "🇬🇧" },
  { code: "EUR" as const, symbol: "€",  label: "Euro",             flag: "🇪🇺" },
  { code: "CAD" as const, symbol: "C$", label: "Canadian Dollar",  flag: "🇨🇦" },
  { code: "AUD" as const, symbol: "A$", label: "Australian Dollar", flag: "🇦🇺" },
] as const;

export type SupportedCurrency = (typeof CURRENCIES)[number]["code"];
