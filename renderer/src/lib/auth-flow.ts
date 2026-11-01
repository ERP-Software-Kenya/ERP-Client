import { clerk } from './clerk';

export type SignInResource = NonNullable<typeof clerk.client>['signIn'];
export type SignUpResource = NonNullable<typeof clerk.client>['signUp'];
export type NavigateFn = (path: string, opts?: { replace?: boolean }) => void;

export function clerkErrorMessage(error: any, fallback: string): string {
  const firstError = error?.errors?.[0];
  if (firstError?.longMessage) return firstError.longMessage;
  if (firstError?.message) {
    if (firstError.code === 'form_password_incorrect') {
      return 'Password is incorrect. Please try again.';
    }
    if (firstError.code === 'form_identifier_not_found') {
      return "Couldn't find an account with that email address.";
    }
    return firstError.message;
  }
  return error?.message || fallback;
}

export async function activateSession(
  sessionId: string | null | undefined,
  refresh: () => Promise<void>,
): Promise<void> {
  if (!sessionId) {
    throw new Error('Sign-in completed but no session was created');
  }
  await clerk.setActive({ session: sessionId });
  await refresh();
}

export async function prepareEmailSecondFactor(signIn: SignInResource): Promise<void> {
  const factors = signIn.supportedSecondFactors ?? [];
  const emailFactor = factors.find((f) => f.strategy === 'email_code') as
    | { strategy: 'email_code'; emailAddressId: string }
    | undefined;
  if (!emailFactor?.emailAddressId) {
    throw new Error('No email verification method available for this sign-in');
  }
  await signIn.prepareSecondFactor({
    strategy: 'email_code',
    emailAddressId: emailFactor.emailAddressId,
  });
}

export async function verifySecondFactor(
  signIn: SignInResource,
  code: string,
): Promise<{ status: string | null; createdSessionId: string | null }> {
  return signIn.attemptSecondFactor({ strategy: 'email_code', code: code.trim() });
}

/**
 * This is the fix: both the password sign-in path and the Google OAuth callback
 * call this same function, so `needs_second_factor` is handled identically either way.
 */
export async function resolveSignInStatus(
  signIn: SignInResource,
  { navigate, refresh }: { navigate: NavigateFn; refresh: () => Promise<void> },
): Promise<void> {
  if (signIn.status === 'complete') {
    await activateSession(signIn.createdSessionId, refresh);
    navigate('/', { replace: true });
    return;
  }
  if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
    await prepareEmailSecondFactor(signIn);
    // Avoid re-preparing the email second factor when the verify page mounts
    // immediately after this navigation (which would spam users with a new code).
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('erp.verify-second-factor.prepared', '1');
    }
    navigate('/verify-second-factor', { replace: true });
    return;
  }
  throw new Error(`Sign in requires an additional step (${signIn.status}) that isn't supported`);
}

export async function signUpWithPassword(
  signUp: SignUpResource,
  payload: { emailAddress: string; password: string; firstName: string; lastName: string; username: string },
): Promise<void> {
  await signUp.create(payload);
  await prepareEmailVerification(signUp);
}

export async function prepareEmailVerification(signUp: SignUpResource): Promise<void> {
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
}

export async function verifyEmailCode(
  signUp: SignUpResource,
  code: string,
): Promise<{ status: string | null; createdSessionId: string | null }> {
  return signUp.attemptEmailAddressVerification({ code: code.trim() });
}

// Sends an email OTP for sign-in. Call this before showing the OTP input.
export async function sendSignInEmailOtp(
  signIn: SignInResource,
  identifier: string,
): Promise<void> {
  await signIn.create({ strategy: 'email_code', identifier: identifier.trim() });
}

// Verifies the OTP code submitted by the user during OTP sign-in.
// Returns the signIn resource — caller should pass it to resolveSignInStatus.
export async function verifySignInEmailOtp(
  signIn: SignInResource,
  code: string,
): Promise<SignInResource> {
  return signIn.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
}

// Starts OTP sign-up (no password). Call this, then verify with verifyEmailCode.
export async function signUpWithEmailOtp(
  signUp: SignUpResource,
  payload: { emailAddress: string; firstName: string; lastName: string; username: string },
): Promise<void> {
  await signUp.create(payload);
  await prepareEmailVerification(signUp);
}

export async function startGoogleOAuth(signIn: SignInResource): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${origin}/#/sso-callback`;
  const redirectUrl = typeof clerk.buildUrlWithAuth === 'function'
    ? clerk.buildUrlWithAuth(callbackUrl)
    : callbackUrl;

  const res = await signIn.create({
    strategy: 'oauth_google',
    redirectUrl,
    actionCompleteRedirectUrl: `${origin}/#/`,
  });

  const verificationUrl = res.firstFactorVerification?.externalVerificationRedirectURL;
  if (!verificationUrl) {
    throw new Error('Google sign-in did not return an authorization URL');
  }

  const targetUrl = verificationUrl instanceof URL ? verificationUrl : new URL(String(verificationUrl));
  targetUrl.searchParams.set('prompt', 'select_account');

  if (typeof window !== 'undefined') {
    window.location.href = targetUrl.toString();
  }
}
