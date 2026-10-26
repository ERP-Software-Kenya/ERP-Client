import { del, get, post } from '../lib/http';

export type AccountSession = {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion?: string;
  ipAddress?: string;
  status: 'active' | 'revoked' | 'signed_out';
  current: boolean;
  lastActiveAt: string;
  endedAt?: string;
  createdAt: string;
};

const DEVICE_ID_KEY = 'erp.device-id';

function deviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

function platform(): string {
  const value = navigator.platform || navigator.userAgent;
  if (/win/i.test(value)) return 'windows';
  if (/mac/i.test(value)) return 'macos';
  if (/linux/i.test(value)) return 'linux';
  return 'web';
}

export const SessionService = {
  async registerCurrent(): Promise<AccountSession> {
    const appVersion = await window.electronAPI?.getAppVersion?.().catch(() => undefined);
    const currentPlatform = platform();
    return post<AccountSession>('/api/v1/auth/sessions', {
      deviceId: deviceId(),
      deviceName: `${currentPlatform === 'web' ? 'Web browser' : 'Desktop app'} on ${navigator.platform || 'unknown device'}`,
      platform: currentPlatform,
      appVersion,
    });
  },

  list: () => get<AccountSession[]>('/api/v1/auth/sessions'),
  revoke: (id: string) => del(`/api/v1/auth/sessions/${id}`),
  endCurrent: () => post<void>('/api/v1/auth/sessions/current/end'),
};
