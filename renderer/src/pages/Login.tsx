import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clerk } from '../lib/clerk';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up' | 'verify';

function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export default function Login() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      toast.error('Clerk is still starting up — try again in a moment');
      return false;
    }
    return true;
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
      if (signIn.status === 'complete' && signIn.createdSessionId) {
        await clerk.setActive({ session: signIn.createdSessionId });
      } else {
        toast.error(`Sign in requires an additional step (${signIn.status}) that isn't supported yet`);
      }
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign in failed'));
    } finally {
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
      });
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode('');
      setMode('verify');
      toast.success('Enter the verification code we emailed you');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const signUp = await clerk.client!.signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (signUp.status === 'complete' && signUp.createdSessionId) {
        await clerk.setActive({ session: signUp.createdSessionId });
      } else {
        toast.error(`Verification requires an additional step (${signUp.status}) that isn't supported yet`);
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
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  const title =
    mode === 'sign-in' ? 'Sign in to your account' : mode === 'sign-up' ? 'Create your account' : 'Check your email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Core ERP Client</h1>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
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

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              We sent a verification code to <span className="font-medium">{email}</span>
            </p>
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
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <button type="button" className="text-primary underline underline-offset-2" onClick={handleResendCode}>
                Resend code
              </button>
              {' · '}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setMode('sign-up')}
              >
                Back
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
