import type { MeResponse } from '../services/auth.service';

const KEY = 'erp.auth.me';

export function readCachedMe(): MeResponse | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeResponse;
    if (!parsed?.clerkUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedMe(me: MeResponse): void {
  try {
    if (!me.clerkUserId) return;
    localStorage.setItem(KEY, JSON.stringify(me));
  } catch {
    // ignore quota / private mode
  }
}

export function clearCachedMe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Wake a sleeping host (e.g. Render free tier) before the user finishes typing. */
export function warmApi(baseUrl: string): void {
  const root = baseUrl.replace(/\/$/, '');
  if (!root) return;
  void fetch(`${root}/api/v1/auth/me`, { method: 'GET', mode: 'cors' }).catch(() => undefined);
}
