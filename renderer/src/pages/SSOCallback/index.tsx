import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
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
          signUpUrl: '/#/login',
          signInForceRedirectUrl: '/#/',
          signUpForceRedirectUrl: '/#/',
          // First-time Google users often lack username (required by this Clerk instance)
          continueSignUpUrl: '/#/sso-continue',
        });

        // If Clerk didn't navigate (e.g. incomplete state left in place), finish locally.
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
        toast.error(error?.errors?.[0]?.longMessage || error?.message || 'Google sign-in failed');
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
