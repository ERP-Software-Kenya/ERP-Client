import { clerk } from './clerk';
import { HttpError } from './http';
import { AuthService, MeResponse } from '../services/auth.service';

export const SESSION_PENDING_CODE = 'SESSION_PENDING';

/** Raised when a Clerk session stays "pending" after every automatic fix has been tried. */
export class PendingSessionError extends Error {
  constructor(message = 'Your account setup is not finished.') {
    super(message);
    this.name = 'PendingSessionError';
  }
}

/** True for the API's 401 { code: 'SESSION_PENDING' } rejection (a pending session is not an expired one). */
export function isSessionPendingError(error: unknown): boolean {
  return (
    (error instanceof HttpError && error.status === 401 && error.body?.code === SESSION_PENDING_CODE) ||
    error instanceof PendingSessionError
  );
}

/**
 * A pending session whose user already belongs to an organization in our database only needs that
 * organization activated in Clerk (the API mirrors the membership during /auth/sync). Returns the
 * refreshed profile, or throws PendingSessionError if the session is still pending afterwards.
 * Users without an organization are left pending on purpose: they are routed to onboarding.
 */
export async function resolvePendingSession(me: MeResponse): Promise<MeResponse> {
  if (me.sessionStatus !== 'pending') return me;
  const clerkOrgId = me.organization?.clerkOrgId;
  if (!clerkOrgId) return me;

  await clerk.setActive({ organization: clerkOrgId });
  await clerk.session?.getToken({ skipCache: true });
  const refreshed = await AuthService.getMe();
  if (refreshed.sessionStatus === 'pending') {
    throw new PendingSessionError();
  }
  return refreshed;
}
