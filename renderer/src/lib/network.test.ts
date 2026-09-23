import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkInternetConnection } from './network';

describe('checkInternetConnection', () => {
  const originalNavigator = globalThis.navigator;
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  });

  it('returns false immediately when navigator.onLine is false', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true,
    });

    const result = await checkInternetConnection();
    expect(result).toBe(false);
  });

  it('returns false when window.electronAPI.isOnline returns false', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    vi.stubGlobal('window', {
      electronAPI: {
        isOnline: vi.fn().mockResolvedValue(false),
      },
    });

    const result = await checkInternetConnection();
    expect(result).toBe(false);
  });

  it('returns true when HTTP ping succeeds', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    vi.stubGlobal('window', {
      electronAPI: {
        isOnline: vi.fn().mockResolvedValue(true),
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const result = await checkInternetConnection();
    expect(result).toBe(true);
  });

  it('returns false when all HTTP ping attempts throw errors', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    vi.stubGlobal('window', {
      electronAPI: {
        isOnline: vi.fn().mockResolvedValue(true),
      },
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await checkInternetConnection(100);
    expect(result).toBe(false);
  });
});
