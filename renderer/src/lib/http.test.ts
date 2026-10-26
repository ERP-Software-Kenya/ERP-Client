import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApi, get } from './http';

describe('authenticated HTTP retry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forces a fresh token and retries once after a 401', async () => {
    const getToken = vi.fn(async (options?: { forceRefresh?: boolean }) =>
      options?.forceRefresh ? 'fresh-token' : 'cached-token',
    );
    configureApi('https://api.example.test', getToken);

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(get<{ ok: boolean }>('/resource')).resolves.toEqual({ ok: true });
    expect(getToken).toHaveBeenNthCalledWith(1);
    expect(getToken).toHaveBeenNthCalledWith(2, { forceRefresh: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.test/resource',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer cached-token' }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.test/resource',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fresh-token' }) }),
    );
  });

  it('shares one forced refresh across concurrent 401 responses', async () => {
    let releaseRefresh: ((token: string) => void) | undefined;
    const refresh = new Promise<string>((resolve) => { releaseRefresh = resolve; });
    const getToken = vi.fn((options?: { forceRefresh?: boolean }) =>
      options?.forceRefresh ? refresh : Promise.resolve('cached-token'),
    );
    configureApi('https://api.example.test', getToken);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (authorization === 'Bearer cached-token') return new Response('', { status: 401 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const requests = [get('/one'), get('/two')];
    await vi.waitFor(() => {
      expect(getToken.mock.calls.filter(([options]) => options?.forceRefresh).length).toBe(1);
    });
    releaseRefresh?.('fresh-token');

    await expect(Promise.all(requests)).resolves.toEqual([{ ok: true }, { ok: true }]);
  });
});
