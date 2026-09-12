import type { Bill } from '../../types';

export function money(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `KSh ${Number(n).toFixed(2)}`;
}

export function moneyOrZero(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return 'KSh 0.00';
  return `KSh ${Number(n).toFixed(2)}`;
}

export function extractRef(notes: string | null | undefined): string {
  if (!notes) return '—';
  const m = notes.match(/(?:Ref|Pay ref|Payment ref|Reference):\s*([^·|\n]+)/i);
  if (m) return m[1].trim();
  // If notes is short and doesn't contain POS delimiters and known prefixes, treat as reference
  if (!notes.includes('·') && !/(?:Store|Driver|POS extras|Fulfillment):/i.test(notes) && notes.trim().length <= 40) {
    return notes.trim();
  }
  return '—';
}

export function formatMethodName(method: string): string {
  const upper = method.toUpperCase();
  if (upper === 'UPI') return 'UPI';
  if (upper === 'NET_BANKING') return 'Net Banking';
  if (upper === 'COD') return 'COD';
  return method
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatTimingName(timing: string): string {
  if (timing.toLowerCase() === 'cod') return 'COD';
  return timing
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPayment(r: Partial<Bill> | null | undefined): string {
  if (!r) return '—';
  const method = r.paymentMethod ? formatMethodName(r.paymentMethod) : null;
  const timing = r.paymentTiming ? formatTimingName(r.paymentTiming) : null;

  if (timing === 'COD') {
    if (method && method.toLowerCase() !== 'cash') {
      return `COD (${method})`;
    }
    return 'COD';
  }

  if (method && timing) {
    return `${method} (${timing})`;
  }

  if (method) return method;
  if (timing) return timing;
  return '—';
}
