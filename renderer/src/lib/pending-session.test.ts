import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from './http';
import { isSessionPendingError, PendingSessionError, resolvePendingSession } from './pending-session';
import { AuthService, MeResponse } from '../services/auth.service';

const setActive = vi.fn();
const getToken = vi.fn();

vi.mock('./clerk', () => ({
  clerk: {
    setActive: (...args: unknown[]) => setActive(...args),
    get session() {
      return { getToken };
    },
  },
}));
vi.mock('../services/auth.service', () => ({ AuthService: { getMe: vi.fn() } }));

const me = (overrides: Partial<MeResponse>): MeResponse =>
  ({ id: 'u1', clerkUserId: 'c1', email: 'a@b.c', roles: [], isOnboarded: true, sessionStatus: 'pending', ...overrides }) as MeResponse;

describe('isSessionPendingError', () => {
  it('recognises the API SESSION_PENDING rejection, not other 401s', () => {
    expect(isSessionPendingError(new HttpError(401, 'x', { code: 'SESSION_PENDING' }))).toBe(true);
    expect(isSessionPendingError(new HttpError(401, 'x', { code: 'SESSION_INACTIVE' }))).toBe(false);
    expect(isSessionPendingError(new HttpError(401, 'x'))).toBe(false);
    expect(isSessionPendingError(new PendingSessionError())).toBe(true);
  });
});

describe('resolvePendingSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an active profile untouched', async () => {
    const active = me({ sessionStatus: 'active' });
    await expect(resolvePendingSession(active)).resolves.toBe(active);
    expect(setActive).not.toHaveBeenCalled();
  });

  it('leaves org-less pending users alone so onboarding can run', async () => {
    const orgless = me({ organization: undefined });
    await expect(resolvePendingSession(orgless)).resolves.toBe(orgless);
    expect(setActive).not.toHaveBeenCalled();
  });

  it('activates the user\'s organization and returns the refreshed profile', async () => {
    const active = me({ sessionStatus: 'active' });
    vi.mocked(AuthService.getMe).mockResolvedValue(active);
    const result = await resolvePendingSession(me({ organization: { id: 'o', name: 'n', slug: 's', clerkOrgId: 'org_1' } }));
    expect(setActive).toHaveBeenCalledWith({ organization: 'org_1' });
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
    expect(result).toBe(active);
  });

  it('fails with PendingSessionError (never an infinite loop) when still pending', async () => {
    vi.mocked(AuthService.getMe).mockResolvedValue(me({ organization: { id: 'o', name: 'n', slug: 's', clerkOrgId: 'org_1' } }));
    await expect(resolvePendingSession(me({ organization: { id: 'o', name: 'n', slug: 's', clerkOrgId: 'org_1' } }))).rejects.toBeInstanceOf(PendingSessionError);
  });
});
