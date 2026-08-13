import { describe, it, expect, vi } from 'vitest';

vi.mock('./clerk', () => ({
  clerk: { setActive: vi.fn().mockResolvedValue(undefined) },
}));

import { resolveSignInStatus } from './auth-flow';
import { clerk } from './clerk';

function fakeSignIn(overrides: Record<string, unknown> = {}) {
  return {
    status: 'complete',
    createdSessionId: 'sess_123',
    supportedSecondFactors: [],
    prepareSecondFactor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('resolveSignInStatus', () => {
  it('activates the session and navigates home on complete', async () => {
    const navigate = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const signIn = fakeSignIn({ status: 'complete', createdSessionId: 'sess_123' });

    await resolveSignInStatus(signIn, { navigate, refresh });

    expect(clerk.setActive).toHaveBeenCalledWith({ session: 'sess_123' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('prepares the email second factor and navigates to /verify-second-factor on needs_second_factor', async () => {
    const navigate = vi.fn();
    const refresh = vi.fn();
    const prepareSecondFactor = vi.fn().mockResolvedValue(undefined);
    const signIn = fakeSignIn({
      status: 'needs_second_factor',
      supportedSecondFactors: [{ strategy: 'email_code', emailAddressId: 'idn_1' }],
      prepareSecondFactor,
    });

    await resolveSignInStatus(signIn, { navigate, refresh });

    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: 'email_code', emailAddressId: 'idn_1' });
    expect(navigate).toHaveBeenCalledWith('/verify-second-factor', { replace: true });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('throws for an unhandled status so the caller can show a toast', async () => {
    const navigate = vi.fn();
    const refresh = vi.fn();
    const signIn = fakeSignIn({ status: 'needs_identifier' });

    await expect(resolveSignInStatus(signIn, { navigate, refresh })).rejects.toThrow(/needs_identifier/);
    expect(navigate).not.toHaveBeenCalled();
  });
});
