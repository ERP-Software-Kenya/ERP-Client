import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { clerkErrorMessage, resolveSignInStatus, sendSignInEmailOtp, startGoogleOAuth, verifySignInEmailOtp } from '../../lib/auth-flow';
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
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [otpStage, setOtpStage] = useState<'send' | 'verify'>('send');
  const [otpCode, setOtpCode] = useState('');

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleSendOtp = async () => {
    if (!requireClerkClient()) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await sendSignInEmailOtp(clerk.client!.signIn, email);
      setOtpStage('verify');
    } catch (error: any) {
      const msg = clerkErrorMessage(error, 'Failed to send code');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await verifySignInEmailOtp(clerk.client!.signIn, otpCode);
      await resolveSignInStatus(result, { navigate, refresh });
    } catch (error: any) {
      const msg = clerkErrorMessage(error, 'Verification failed');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpTabSwitch = (method: 'password' | 'otp') => {
    setAuthMethod(method);
    setErrorMsg(null);
    setOtpStage('send');
    setOtpCode('');
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

          <div className="flex rounded-lg border border-border mb-6 p-1 gap-1 bg-muted/30">
            <button
              type="button"
              onClick={() => handleOtpTabSwitch('password')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMethod === 'password' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => handleOtpTabSwitch('otp')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMethod === 'otp' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              Email OTP
            </button>
          </div>

          {authMethod === 'password' ? (
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
                New organization?{' '}
                <a
                  href={import.meta.env.VITE_WEB_ERP_URL ?? 'https://erp-web-kenya.netlify.app'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Create Organization
                </a>
              </p>
            </form>
          ) : (
            <div className="space-y-6">
              {otpStage === 'send' ? (
                <div className="space-y-6">
                  {errorMsg && (
                    <div className="p-3 text-sm rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                      {errorMsg}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
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
                  <Button type="button" className="w-full" disabled={loading} onClick={handleSendOtp}>
                    {loading && <Loader2 className="animate-spin" />}
                    {loading ? 'Sending...' : 'Send code'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {errorMsg && (
                    <div className="p-3 text-sm rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                      {errorMsg}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Code sent to <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Verification code</Label>
                    <Input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setOtpCode(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="animate-spin" />}
                    {loading ? 'Verifying...' : 'Verify'}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => { setOtpStage('send'); setOtpCode(''); setErrorMsg(null); }}
                      className="text-primary underline underline-offset-2"
                      disabled={loading}
                    >
                      Back
                    </button>
                  </p>
                </form>
              )}
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
                New organization?{' '}
                <a
                  href={import.meta.env.VITE_WEB_ERP_URL ?? 'https://erp-web-kenya.netlify.app'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Create Organization
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
