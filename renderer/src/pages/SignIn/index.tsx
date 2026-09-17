import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { clerkErrorMessage, resolveSignInStatus, startGoogleOAuth } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthBootScreen from '../../components/auth/AuthBootScreen';
import LoginVisualPanel from '../../components/auth/LoginVisualPanel';
import { getAppName } from '../../lib/branding';
import { toast } from 'sonner';

export default function SignIn() {
  const { user, refresh, syncing, bootPhase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('erp.session-expired')) {
      sessionStorage.removeItem('erp.session-expired');
      toast.warning('Your session has expired. Please sign in again.');
    }
  }, []);

  // Backend /me still catching up after setActive — avoid flashing the login form.
  // Require an active Clerk session so a stale syncing flag after logout cannot flash this UI.
  if (syncing && clerk.session) {
    return <AuthBootScreen phase={bootPhase ?? 'session'} />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // After OAuth, Clerk may leave an incomplete sign-up on this client.
  if (clerk.client?.signUp?.status === 'missing_requirements') {
    return <Navigate to="/sso-continue" replace />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      const msg = 'Clerk is still starting up — try again in a moment';
      setErrorMsg(msg);
      toast.error(msg);
      return false;
    }
    return true;
  };

  const IS_DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_DEV_BYPASS) {
      sessionStorage.removeItem('erp.dev-logged-out');
      setLoading(true);
      await refresh();
      setLoading(false);
      navigate('/', { replace: true });
      return;
    }
    if (!requireClerkClient()) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const signIn = await clerk.client!.signIn.create({
        strategy: 'password',
        identifier: email.trim(),
        password,
      });
      await resolveSignInStatus(signIn, { navigate, refresh });
    } catch (error: any) {
      const msg = clerkErrorMessage(error, 'Sign in failed');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireClerkClient()) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await startGoogleOAuth(clerk.client!.signIn);
    } catch (error: any) {
      const msg = clerkErrorMessage(error, 'Google sign-in failed');
      setErrorMsg(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <LoginVisualPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1 lg:hidden">{getAppName()}</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            {errorMsg && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                required
                autoFocus
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={checkCapsLock}
                  onKeyUp={checkCapsLock}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded p-1 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {capsLockActive && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Caps Lock is ON
                </p>
              )}
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
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-primary underline underline-offset-2">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
