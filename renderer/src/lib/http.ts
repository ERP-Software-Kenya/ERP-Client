let _baseUrl = 'https://core-apis-m03n.onrender.com';
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

async function readErrorBody(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  if (!text) return `HTTP ${resp.status} — ${resp.statusText}`;
  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message ?? json.error ?? text;
  } catch {
    return text;
  }
}

export async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const resp = await fetch(buildUrl(path, params), { headers: await jsonHeaders() });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return readJsonBody<T>(resp);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: 'POST',
    headers: await jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return readJsonBody<T>(resp);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: 'PUT',
    headers: await jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return readJsonBody<T>(resp);
}

async function readJsonBody<T>(resp: Response): Promise<T> {
  const text = await resp.text().catch(() => '');
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function del(path: string): Promise<void> {
  const resp = await fetch(buildUrl(path), { method: 'DELETE', headers: await jsonHeaders() });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
}

export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(buildUrl(path), { method: 'POST', headers: await authHeader(), body: form });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return resp.json() as Promise<T>;
}
