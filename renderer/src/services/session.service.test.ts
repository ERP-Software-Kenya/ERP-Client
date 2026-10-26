import { beforeEach, describe, expect, it, vi } from 'vitest';
import { post } from '../lib/http';
import { SessionService } from './session.service';

vi.mock('../lib/http', () => ({
  post: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.stubGlobal('crypto', { randomUUID: () => 'device-uuid-123' });
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'test' });
    vi.stubGlobal('window', { electronAPI: { getAppVersion: async () => '1.2.3' } });
  });

  it('registers stable non-secret device metadata', async () => {
    vi.mocked(post).mockResolvedValue({ id: 'record-1' } as never);
    await SessionService.registerCurrent();
    await SessionService.registerCurrent();

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/auth/sessions', {
      deviceId: 'device-uuid-123',
      deviceName: 'Desktop app on Win32',
      platform: 'windows',
      appVersion: '1.2.3',
    });
    expect(vi.mocked(post).mock.calls[1]?.[1]).toMatchObject({ deviceId: 'device-uuid-123' });
  });
});
