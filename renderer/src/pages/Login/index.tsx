import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthBootScreen from '../../components/auth/AuthBootScreen';
import LoginVisualPanel from '../../components/auth/LoginVisualPanel';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up' | 'verify-signup' | 'verify-second-factor';
type SecondFactorStrategy = 'email_code' | 'phone_code' | 'totp';

function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export default function Login() {
  const { user, refresh, syncing, bootPhase } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<SecondFactorStrategy | null>(null);

  const activateSession = async (sessionId: string | null | undefined) => {
    if (!sessionId) {
      toast.error('Sign-in completed but no session was created');
      return;
    }
    await clerk.setActive({ session: sessionId });
    // Force AuthContext /me sync — don't wait for a page refresh.
    await refresh();
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  // After OAuth, Clerk may leave an incomplete sign-up on this client.
  if (clerk.client?.signUp?.status === 'missing_requirements') {
    return <Navigate to="/sso-continue" replace />;
  }

  // Backend /me still catching up after setActive — avoid flashing the login form.
  // Require an active Clerk session so a stale syncing flag after logout cannot flash this UI.
  if (syncing && clerk.session) {
    return <AuthBootScreen phase={bootPhase ?? 'session'} />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      toast.error('Clerk is still starting up — try again in a moment');
      return false;
    }
    return true;
  };

  const beginSecondFactor = async (signIn: NonNullable<typeof clerk.client>['signIn']) => {
    const factors = signIn.supportedSecondFactors ?? [];
    const emailFactor = factors.find((f) => f.strategy === 'email_code') as
      | { strategy: 'email_code'; emailAddressId: string }
      | undefined;
    const phoneFactor = factors.find((f) => f.strategy === 'phone_code') as
      | { strategy: 'phone_code'; phoneNumberId: string }
      | undefined;
    const totpFactor = factors.find((f) => f.strategy === 'totp');

    if (emailFactor?.emailAddressId) {
      await signIn.prepareSecondFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      } as any);
      setSecondFactorStrategy('email_code');
      setCode('');
      setMode('verify-second-factor');
      toast.success('Enter the verification code we emailed you');
      return;
    }

    if (phoneFactor?.phoneNumberId) {
      await signIn.prepareSecondFactor({
        strategy: 'phone_code',
        phoneNumberId: phoneFactor.phoneNumberId,
      });
      setSecondFactorStrategy('phone_code');
      setCode('');
      setMode('verify-second-factor');
      toast.success('Enter the verification code we texted you');
      return;
    }

    if (totpFactor) {
      setSecondFactorStrategy('totp');
      setCode('');
      setMode('verify-second-factor');
      toast.success('Enter the code from your authenticator app');
      return;
    }

    toast.error('No supported verification method for this sign-in');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const signIn = await clerk.client!.signIn.create({
        strategy: 'password',
        identifier: email.trim(),
        password,
      });
      if (signIn.status === 'complete') {
        await activateSession(signIn.createdSessionId);
      } else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        await beginSecondFactor(signIn);
      } else {
        toast.error(`Sign in requires an additional step (${signIn.status}) that isn't supported yet`);
      }
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const origin = window.location.origin;
      await clerk.client!.signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${origin}/#/sso-callback`,
        redirectUrlComplete: `${origin}/#/`,
      });
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Google sign-in failed'));
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await clerk.client!.signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode('');
      setMode('verify-signup');
      toast.success('Enter the verification code we emailed you');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const signUp = await clerk.client!.signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (signUp.status === 'complete') {
        await activateSession(signUp.createdSessionId);
      } else {
        toast.error(`Verification requires an additional step (${signUp.status}) that isn't supported yet`);
      }
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient() || !secondFactorStrategy) return;
    setLoading(true);
    try {
      const signIn = await clerk.client!.signIn.attemptSecondFactor({
        strategy: secondFactorStrategy,
        code: code.trim(),
      });
      if (signIn.status === 'complete') {
        await activateSession(signIn.createdSessionId);
      } else {
        toast.error(`Verification requires an additional step (${signIn.status}) that isn't supported yet`);
      }
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!requireClerkClient()) return;
    try {
      if (mode === 'verify-signup') {
        await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        toast.success('Verification code resent');
        return;
      }

      if (mode === 'verify-second-factor' && secondFactorStrategy === 'email_code') {
        const signIn = clerk.client!.signIn;
        const emailFactor = (signIn.supportedSecondFactors ?? []).find((f) => f.strategy === 'email_code') as
          | { strategy: 'email_code'; emailAddressId: string }
          | undefined;
        if (!emailFactor?.emailAddressId) {
          toast.error('Unable to resend email code');
          return;
        }
        await signIn.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        } as any);
        toast.success('Verification code resent');
        return;
      }

      if (mode === 'verify-second-factor' && secondFactorStrategy === 'phone_code') {
        const signIn = clerk.client!.signIn;
        const phoneFactor = (signIn.supportedSecondFactors ?? []).find((f) => f.strategy === 'phone_code') as
          | { strategy: 'phone_code'; phoneNumberId: string }
          | undefined;
        if (!phoneFactor?.phoneNumberId) {
          toast.error('Unable to resend SMS code');
          return;
        }
        await signIn.prepareSecondFactor({
          strategy: 'phone_code',
          phoneNumberId: phoneFactor.phoneNumberId,
        });
        toast.success('Verification code resent');
        return;
      }

      toast.error('This verification method cannot be resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  const title =
    mode === 'sign-in'
      ? 'Sign in to your account'
      : mode === 'sign-up'
        ? 'Create your account'
        : mode === 'verify-second-factor' && secondFactorStrategy === 'totp'
          ? 'Authenticator verification'
          : 'Check your email';

  const verifyHint =
    mode === 'verify-second-factor' && secondFactorStrategy === 'totp'
      ? 'Enter the 6-digit code from your authenticator app'
      : mode === 'verify-second-factor' && secondFactorStrategy === 'phone_code'
        ? 'We sent a verification code to your phone'
        : (
            <>
              We sent a verification code to <span className="font-medium">{email}</span>
            </>
          );

  const canResend =
    mode === 'verify-signup' ||
    (mode === 'verify-second-factor' && (secondFactorStrategy === 'email_code' || secondFactorStrategy === 'phone_code'));

  const GoogleButton = (
    <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
      Continue with Google
    </Button>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <LoginVisualPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1 lg:hidden">Core ERP Client</h1>
            <p className="text-muted-foreground">{title}</p>
          </div>

          {mode === 'sign-in' && (
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            {GoogleButton}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setMode('sign-up')}
              >
                Sign up
              </button>
            </p>
          </form>
          )}

          {mode === 'sign-up' && (
          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signUpEmail">Email</Label>
              <Input
                id="signUpEmail"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signUpPassword">Password</Label>
              <Input
                id="signUpPassword"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div id="clerk-captcha" />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            {GoogleButton}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setMode('sign-in')}
              >
                Sign in
              </button>
            </p>
          </form>
          )}

          {(mode === 'verify-signup' || mode === 'verify-second-factor') && (
          <form
            onSubmit={mode === 'verify-signup' ? handleVerifySignup : handleVerifySecondFactor}
            className="space-y-6"
          >
            <p className="text-sm text-muted-foreground text-center">{verifyHint}</p>
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {canResend && (
                <>
                  <button type="button" className="text-primary underline underline-offset-2" onClick={handleResendCode}>
                    Resend code
                  </button>
                  {' · '}
                </>
              )}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => {
                  setSecondFactorStrategy(null);
                  setCode('');
                  setMode(mode === 'verify-signup' ? 'sign-up' : 'sign-in');
                }}
              >
                Back
              </button>
            </p>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
