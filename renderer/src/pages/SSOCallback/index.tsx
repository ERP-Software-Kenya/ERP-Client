import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { clerkErrorMessage, resolveSignInStatus } from '../../lib/auth-flow';
import { toast } from 'sonner';

export default function SSOCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        if (!clerk.loaded) {
          await clerk.load();
        }

        await clerk.handleRedirectCallback({
          signInUrl: '/#/login',
          signUpUrl: '/#/signup',
          signInForceRedirectUrl: '/#/',
          signUpForceRedirectUrl: '/#/',
          // First-time Google users often lack username (required by this Clerk instance)
          continueSignUpUrl: '/#/sso-continue',
          // Without this, Clerk falls back to its hosted Account Portal for
          // needs_second_factor / needs_client_trust and hard-navigates away
          // from this app before resolveSignInStatus below can run.
          secondFactorUrl: '/#/verify-second-factor',
        });

        // The fix: route through the same status resolver the password path uses,
        // so an existing user with 2FA enabled reaches /verify-second-factor instead
        // of falling through to the "no session" error below.
        const signIn = clerk.client?.signIn;
        if (signIn && (signIn.status === 'complete' || signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust')) {
          await resolveSignInStatus(signIn, { navigate, refresh });
          return;
        }

        // New-user case: Clerk requires more profile fields (existing behavior, unchanged).
        const signUp = clerk.client?.signUp;
        if (signUp?.status === 'missing_requirements') {
          navigate('/sso-continue', { replace: true });
          return;
        }

        if (clerk.session) {
          await refresh();
          navigate('/', { replace: true });
          return;
        }

        toast.error('Google sign-in did not create a session — try again');
        navigate('/login', { replace: true });
      } catch (error: any) {
        const signUp = clerk.client?.signUp;
        if (signUp?.status === 'missing_requirements') {
          navigate('/sso-continue', { replace: true });
          return;
        }
        toast.error(clerkErrorMessage(error, 'Google sign-in failed'));
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">Completing Google sign-in…</p>
        <div id="clerk-captcha" />
      </div>
    </div>
  );
}
