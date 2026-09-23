import { toast } from 'sonner';
import { formatApiErrorBody } from './api-error';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Parsed JSON error body when the API returns one (e.g. credit approval payload). */
    public readonly body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

let _baseUrl = 'http://51.20.217.230:10000';
let _getToken: () => Promise<string | null> = async () => null;

/** Call once at startup. getToken is invoked fresh on every request (Clerk auto-refreshes). */
export function configureApi(baseUrl: string, getToken: () => Promise<string | null>): void {
  _baseUrl = baseUrl.replace(/\/$/, '');
  _getToken = getToken;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${_baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await _getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonHeaders(): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json', ...(await authHeader()) };
}

// 401 = session dead → logout. 403 = permission miss → stay signed in.
let last403At = 0;

function checkAuth(status: number, message?: string): void {
  if (status === 401) {
    document.dispatchEvent(new CustomEvent('auth:unauthorized'));
    return;
  }
  if (status === 403) {
    const now = Date.now();
    if (now - last403At > 2000) {
      last403At = now;
      toast.error(message?.trim() || "You don't have permission to do that");
    }
  }
}

function parseErrorJson(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const json = text ? parseErrorJson(text) : undefined;
    const message = text
      ? formatApiErrorBody(json ?? text, `HTTP ${resp.status} — ${resp.statusText}`)
      : `HTTP ${resp.status} — ${resp.statusText}`;
    checkAuth(resp.status, message);
    throw new HttpError(resp.status, message, json);
  }
  return readJsonBody<T>(resp);
}

async function retryingFetch(
  url: string,
  makeHeaders: () => Promise<Record<string, string>>,
  init: Omit<RequestInit, 'headers'> = {},
): Promise<Response> {
  try {
    const resp = await fetch(url, { ...init, headers: await makeHeaders() });
    if (resp.status !== 401) return resp;
    return fetch(url, { ...init, headers: await makeHeaders() });
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      document.dispatchEvent(new CustomEvent('network:offline'));
    }
    throw error;
  }
}

export async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const resp = await retryingFetch(buildUrl(path, params), jsonHeaders);
  return request<T>(resp);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const resp = await retryingFetch(buildUrl(path), jsonHeaders, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return request<T>(resp);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const resp = await retryingFetch(buildUrl(path), jsonHeaders, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return request<T>(resp);
}

export async function patch<T>(path: string, body?: unknown): Promise<T> {
  const resp = await retryingFetch(buildUrl(path), jsonHeaders, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return request<T>(resp);
}

async function readJsonBody<T>(resp: Response): Promise<T> {
  const text = await resp.text().catch(() => '');
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function del(path: string): Promise<void> {
  const resp = await retryingFetch(buildUrl(path), jsonHeaders, { method: 'DELETE' });
  await request<void>(resp);
}

export async function getBlob(path: string, params?: QueryParams): Promise<{ blob: Blob; filename: string }> {
  const url = buildUrl(path, params);
  let resp = await fetch(url, { headers: await authHeader() });
  if (resp.status === 401) resp = await fetch(url, { headers: await authHeader() });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    checkAuth(resp.status);
    throw new HttpError(resp.status, text || `HTTP ${resp.status}`, undefined);
  }
  const disposition = resp.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";\n]+)"?/.exec(disposition);
  const filename = match?.[1] ?? 'download.pdf';
  return { blob: await resp.blob(), filename };
}

export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await retryingFetch(buildUrl(path), authHeader, { method: 'POST', body: form });
  return request<T>(resp);
}
