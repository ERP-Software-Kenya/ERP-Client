import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

type SignUpResource = NonNullable<NonNullable<typeof clerk.client>['signUp']>;
type Mode = 'form' | 'verify-email';

function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export default function SSOContinue() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>('form');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const emailCodeSent = useRef(false);

  const beginEmailVerification = async (signUp: SignUpResource) => {
    if (!emailCodeSent.current) {
      emailCodeSent.current = true;
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success('Enter the verification code we emailed you');
    }
    setCode('');
    setMode('verify-email');
  };

  useEffect(() => {
    (async () => {
      if (!clerk.loaded) await clerk.load();
      const signUp = clerk.client?.signUp;
      if (!signUp?.id || signUp.status !== 'missing_requirements') {
        toast.error('Google sign-up session expired — try again');
        navigate('/login', { replace: true });
        return;
      }
      if (signUp.unverifiedFields?.includes('email_address')) {
        await beginEmailVerification(signUp);
        setReady(true);
        return;
      }
      setMissingFields(signUp.missingFields ?? []);
      setFirstName(signUp.firstName ?? '');
      setLastName(signUp.lastName ?? '');
      setUsername(signUp.username ?? '');
      setReady(true);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    setLoading(true);
    try {
      const payload: Record<string, string | boolean> = {};
      if (missingFields.includes('username')) payload.username = username.trim();
      if (missingFields.includes('first_name')) payload.firstName = firstName.trim();
      if (missingFields.includes('last_name')) payload.lastName = lastName.trim();
      if (missingFields.includes('legal_accepted')) payload.legalAccepted = true;

      const updated = await signUp.update(payload);
      if (updated.status === 'complete' && updated.createdSessionId) {
        await clerk.setActive({ session: updated.createdSessionId });
        await refresh();
        navigate('/', { replace: true });
        return;
      }

      if (updated.unverifiedFields?.includes('email_address')) {
        await beginEmailVerification(updated);
        return;
      }

      const outstanding = [...(updated.missingFields ?? []), ...(updated.unverifiedFields ?? [])];
      toast.error(
        `Still need more info (${updated.status}). Outstanding: ${outstanding.join(', ') || 'none reported by Clerk'}`,
      );
      setMissingFields(updated.missingFields ?? []);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Could not finish Google sign-up'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    setLoading(true);
    try {
      const updated = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (updated.status === 'complete' && updated.createdSessionId) {
        await clerk.setActive({ session: updated.createdSessionId });
        await refresh();
        navigate('/', { replace: true });
        return;
      }
      toast.error(`Verification did not complete the sign-up (${updated.status})`);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    // Login redirects back here while clerk.client.signUp.status is 'missing_requirements' —
    // clear the pending attempt first or the navigation just bounces straight back.
    clerk.client?.resetSignUp();
    navigate('/login');
  };

  const handleResendEmailCode = async () => {
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Preparing account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Finish your account</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'verify-email'
              ? 'One more step — verify your email address.'
              : 'Google signed you in — a few details are still required.'}
          </p>
        </div>
        {mode === 'verify-email' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">We sent a verification code to your email</p>
            <div className="space-y-2">
              <Label htmlFor="emailCode">Verification code</Label>
              <Input
                id="emailCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <button type="button" className="text-primary underline underline-offset-2" onClick={handleResendEmailCode}>
                Resend code
              </button>
              {' · '}
              <button type="button" className="text-primary underline underline-offset-2" onClick={handleBackToSignIn}>
                Back to sign in
              </button>
            </p>
          </form>
        )}
        {mode === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {missingFields.includes('first_name') && (
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
          )}
          {missingFields.includes('last_name') && (
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          )}
          {missingFields.includes('username') && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>
          )}
          {missingFields.includes('legal_accepted') && (
            <p className="text-sm text-muted-foreground">By continuing you accept the terms of service.</p>
          )}
          <div id="clerk-captcha" />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving…' : 'Continue'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <button type="button" className="text-primary underline underline-offset-2" onClick={handleBackToSignIn}>
              Back to sign in
            </button>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
