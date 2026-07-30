import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../lib/clerk';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export default function SSOContinue() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      if (!clerk.loaded) await clerk.load();
      const signUp = clerk.client?.signUp;
      if (!signUp?.id || signUp.status !== 'missing_requirements') {
        toast.error('Google sign-up session expired — try again');
        navigate('/login', { replace: true });
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

      toast.error(
        `Still need more info (${updated.status}). Missing: ${(updated.missingFields ?? []).join(', ') || 'unknown'}`,
      );
      setMissingFields(updated.missingFields ?? []);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Could not finish Google sign-up'));
    } finally {
      setLoading(false);
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
          <p className="text-muted-foreground text-sm">Google signed you in — a few details are still required.</p>
        </div>
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
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => navigate('/login')}>
              Back to sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
