import { getDb } from './database';
import { nowIST } from './utils';

const DEFAULT_API_URL = 'https://core-apis-m03n.onrender.com';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default cache

export interface AppSettings {
  apiBaseUrl: string;
  apiToken: string | null;
  lockTimeoutMinutes: number;
  theme: 'dark' | 'light';
}

function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string): void {
  const db = getDb();
  const now = nowIST();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value, now);
}

export function loadSettings(): AppSettings {
  return {
    apiBaseUrl: getSetting('apiBaseUrl') ?? DEFAULT_API_URL,
    apiToken: getSetting('apiToken'),
    lockTimeoutMinutes: parseInt(getSetting('lockTimeoutMinutes') ?? '5', 10),
    theme: (getSetting('theme') as 'dark' | 'light') ?? 'dark',
  };
}

export function saveSettings(settings: Partial<AppSettings>): void {
  if (settings.apiBaseUrl !== undefined) setSetting('apiBaseUrl', settings.apiBaseUrl);
  if (settings.apiToken !== undefined) setSetting('apiToken', settings.apiToken ?? '');
  if (settings.lockTimeoutMinutes !== undefined)
    setSetting('lockTimeoutMinutes', String(settings.lockTimeoutMinutes));
  if (settings.theme !== undefined) setSetting('theme', settings.theme);
}

// ── API Token store ──────────────────────────────────────────────────────────
export function getApiToken(): string | null {
  return getSetting('apiToken') || null;
}

export function setApiToken(token: string): void {
  setSetting('apiToken', token);
}

export function clearApiToken(): void {
  const db = getDb();
  db.prepare("DELETE FROM settings WHERE key = 'apiToken'").run();
}

// ── API Cache ────────────────────────────────────────────────────────────────
export function getCached(cacheKey: string): unknown | null {
  const db = getDb();
  const now = nowIST();
  const row = db
    .prepare(
      'SELECT response_json, expires_at FROM api_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > ?)',
    )
    .get(cacheKey, now) as { response_json: string; expires_at: string | null } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.response_json);
  } catch {
    return null;
  }
}

export function setCached(cacheKey: string, data: unknown, ttlMs = CACHE_TTL_MS): void {
  const db = getDb();
  const now = nowIST();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  db.prepare(
    `INSERT INTO api_cache (cache_key, response_json, cached_at, expires_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json, cached_at = excluded.cached_at, expires_at = excluded.expires_at`,
  ).run(cacheKey, JSON.stringify(data), now, expiresAt);
}

export function clearCache(cacheKey?: string): void {
  const db = getDb();
  if (cacheKey) {
    db.prepare('DELETE FROM api_cache WHERE cache_key = ?').run(cacheKey);
  } else {
    db.prepare('DELETE FROM api_cache').run();
  }
}
