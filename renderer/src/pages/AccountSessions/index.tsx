import { useCallback, useEffect, useState } from 'react';
import { Laptop, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { AccountSession, SessionService } from '../../services/session.service';
import { useAuth } from '../../context/AuthContext';

function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} hours ago`;
  return new Date(value).toLocaleString();
}

export default function AccountSessionsPage() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await SessionService.list());
    } catch {
      toast.error('Unable to load your devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  const revoke = async (session: AccountSession) => {
    if (!window.confirm(`Sign out ${session.deviceName}?`)) return;
    setRevoking(session.id);
    try {
      await SessionService.revoke(session.id);
      toast.success(session.current ? 'Current session revoked' : 'Device signed out');
      if (session.current) {
        await logout();
      }
      else await load();
    } catch {
      toast.error('Unable to sign out this device');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Devices & sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review where your account is signed in and remove devices you do not recognize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="animate-spin" /> Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No recorded sessions yet.</p>
        ) : sessions.map((session) => (
          <div key={session.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><Laptop size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{session.deviceName}</p>
                {session.current && <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400"><ShieldCheck size={12} /> This device</span>}
                {session.status !== 'active' && <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{session.status.replace('_', ' ')}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {session.platform}{session.appVersion ? ` · App ${session.appVersion}` : ''}{session.ipAddress ? ` · ${session.ipAddress}` : ''} · Active {relativeTime(session.lastActiveAt)}
              </p>
            </div>
            {session.status === 'active' && (
              <Button variant="outline" size="sm" disabled={revoking === session.id} onClick={() => void revoke(session)}>
                {revoking === session.id ? 'Signing out…' : 'Sign out'}
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Session identifiers and device metadata are stored for account security. Passwords and authentication tokens are never stored here.</p>
    </div>
  );
}
