import { getStoredCurrency, saveCurrency } from './storage';

// The active business currency (ISO 4217). Held in memory for synchronous
// formatting, hydrated from AsyncStorage at app start and refreshed whenever
// business details are fetched. Defaults to USD until a business currency is known.
let activeCurrencyCode = 'USD';

// Locale that pairs nicely with common currencies for grouping/symbol placement.
const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  INR: 'en-IN',
  EUR: 'en-IE',
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

export const getActiveCurrency = () => activeCurrencyCode;

export const setActiveCurrency = (code?: string | null) => {
  if (code && code.trim()) {
    activeCurrencyCode = code.trim().toUpperCase();
    // Persist for next launch (fire-and-forget).
    void saveCurrency(activeCurrencyCode);
  }
};

// Call once at app start to restore the last-known business currency.
export const initCurrencyFromStorage = async () => {
  try {
    const stored = await getStoredCurrency();
    if (stored && stored.trim()) {
      activeCurrencyCode = stored.trim().toUpperCase();
    }
  } catch {
    // Ignore — fall back to default.
  }
};

export const formatCurrency = (amount?: number | null, currencyCode?: string | null): string => {
  const code = (currencyCode && currencyCode.trim() ? currencyCode : activeCurrencyCode).toUpperCase();
  const locale = CURRENCY_LOCALE[code] ?? undefined;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    // Some engines reject unknown currency codes — fall back to a plain amount.
    return `${code} ${(amount || 0).toFixed(2)}`;
  }
};
