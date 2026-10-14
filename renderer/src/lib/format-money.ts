const COUNTRY_CURRENCY: Record<string, string> = {
  ke: 'KES',
  kenya: 'KES',
  in: 'INR',
  india: 'INR',
  us: 'USD',
  usa: 'USD',
};

let activeCurrencyCode = 'USD';

export function configureCurrencyCode(currencyCode?: string | null): void {
  const normalized = currencyCode?.trim().toUpperCase();
  activeCurrencyCode = normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : 'USD';
}

export function getCurrencyCode(): string {
  return activeCurrencyCode;
}

export function getCurrencySymbol(currencyCode = activeCurrencyCode): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

export function resolveCurrencyCode(country?: string | null, fallback = 'USD'): string {
  if (!country) return fallback;
  const key = country.trim().toLowerCase();
  return COUNTRY_CURRENCY[key] ?? fallback;
}

export function formatMoney(amount: number, currencyCode = activeCurrencyCode): string {
  if (currencyCode === 'KES') {
    const decimals = amount >= 1000 ? 0 : 2;
    return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(0)}`;
  }
}

export function formatMoneyCompact(amount: number, currencyCode = activeCurrencyCode): string {
  if (amount >= 1_000_000) return formatMoney(amount / 1_000_000, currencyCode).replace(/[\d,.]+/, (m) => `${m}M`);
  if (amount >= 1_000) return formatMoney(amount / 1_000, currencyCode).replace(/[\d,.]+/, (m) => `${m}K`);
  return formatMoney(amount, currencyCode);
}
