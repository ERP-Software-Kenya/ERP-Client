import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { clerk } from '../lib/clerk';
import { clearCachedMe, writeCachedMe } from '../lib/auth-cache';
import { getErrorMessage } from '../lib/api-error';
import { configureApi } from '../api';
import { HttpError } from '../lib/http';
import { AuthService, MeResponse } from '../services/auth.service';
import AuthBootScreen, { AuthBootPhase } from '../components/auth/AuthBootScreen';
import { configureCurrencyCode } from '../lib/format-money';
import { SessionService } from '../services/session.service';
import { isSessionPendingError, resolvePendingSession } from '../lib/pending-session';

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  /** True while syncing Clerk session → backend /me (prevents login bounce). */
  syncing: boolean;
  /** Fine-grained phase for the first-time boot UI. Null when idle. */
  bootPhase: AuthBootPhase | null;
  /** Set when sign-in succeeded but the account still has an unfinished Clerk step we could not resolve. */
  sessionIssue: string | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://51.20.217.230:10000';

type ClerkResources = Parameters<Parameters<typeof clerk.addListener>[0]>[0];

configureApi(API_BASE, ({ forceRefresh } = {}) =>
  clerk.session
    ? clerk.session.getToken({ skipCache: forceRefresh === true })
    : Promise.resolve(null),
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clerk can report a session before getToken() returns a JWT (common on cold dev load). */
async function waitForClerkToken(maxAttempts = 8, delayMs = 75): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await clerk.session?.getToken();
    if (token) return;
    await sleep(delayMs);
  }
}

/**
 * Validate the Clerk session against the backend before rendering protected UI.
 */
async function loadMe(onPhase: (phase: AuthBootPhase) => void): Promise<MeResponse> {
  onPhase('sync');
  await AuthService.sync();
  onPhase('profile');
  const me = await AuthService.getMe();
  // sts:"pending" is recoverable (e.g. org not active in Clerk yet) — fix it instead of failing the sign-in.
  return resolvePendingSession(me);
}

function isRetryableBootstrapError(error: unknown): boolean {
  return !(error instanceof HttpError && error.status === 401);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bootPhase, setBootPhase] = useState<AuthBootPhase | null>('starting');
  const [sessionIssue, setSessionIssue] = useState<string | null>(null);
  const sessionIssueRef = useRef<string | null>(null);
  const setIssue = (value: string | null) => {
    sessionIssueRef.current = value;
    setSessionIssue(value);
  };
  const refreshInFlight = useRef<Promise<void> | null>(null);
  /** Bumped on logout so in-flight /me results cannot update UI afterward. */
  const authEpoch = useRef(0);
  const signingOut = useRef(false);
  /** Clerk's addListener fires on every resource change (e.g. background token
   *  refresh every ~60s), not just sign-in/sign-out. Track the last session id
   *  so we only re-sync with the backend when the session actually changes. */
  const lastSessionId = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const refresh = async () => {
    if (signingOut.current) return;
    if (refreshInFlight.current) return refreshInFlight.current;

    const epoch = authEpoch.current;

    const run = (async () => {
      if (signingOut.current || epoch !== authEpoch.current) return;
      if (!clerk.session) {
        setUser(null);
        setBootPhase(null);
        return;
      }

      setIssue(null);
      setBootPhase('session');
      syncingRef.current = true;
      setSyncing(true);
      try {
        await waitForClerkToken();
        let me: MeResponse | null = null;
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            me = await loadMe((phase) => {
              if (signingOut.current || epoch !== authEpoch.current) return;
              setBootPhase(phase);
            });
            break;
          } catch (error) {
            lastError = error;
            if (!isRetryableBootstrapError(error) || attempt === 2) {
              throw error;
            }
            if (epoch !== authEpoch.current || signingOut.current) return;
            toast.error(
              attempt === 0
                ? 'Server is still waking up — retrying your sign-in…'
                : 'Still starting things up — trying once more…',
            );
            await sleep(400 * (attempt + 1));
          }
        }
        if (signingOut.current || epoch !== authEpoch.current || !clerk.session) return;
        if (!me) throw lastError instanceof Error ? lastError : new Error('Failed to load your account');
        configureCurrencyCode(me.currencyCode);
        setUser(me);
        writeCachedMe(me);
      } catch (error) {
        if (signingOut.current || epoch !== authEpoch.current) return;
        clearCachedMe();
        if (isSessionPendingError(error)) {
          // Not an expired session: signing out and back in cannot clear it, so keep the session and explain.
          setUser(null);
          setIssue(getErrorMessage(error, 'Your account setup is not finished.'));
          return;
        }
        toast.error(getErrorMessage(error, 'Failed to load your account'));
        // Callback form skips Clerk's default hard navigate to "/".
        await clerk.signOut(() => undefined);
        setUser(null);
      } finally {
        if (epoch === authEpoch.current) {
          syncingRef.current = false;
          setSyncing(false);
          setBootPhase(null);
        }
      }
    })();

    const tracked = run.finally(() => {
      if (refreshInFlight.current === tracked) {
        refreshInFlight.current = null;
      }
    });
    refreshInFlight.current = tracked;
    return tracked;
  };

  useEffect(() => {
    let mounted = true;
    let hasLoadedOnce = false;
    let unsubscribe: (() => void) | undefined;

    clerk
      .load()
      .then(() => {
        if (!mounted) return;
        unsubscribe = clerk.addListener(async ({ session }: ClerkResources) => {
          if (!mounted) return;
          try {
            if (signingOut.current) {
              lastSessionId.current = null;
              setUser(null);
              return;
            }
            if (session) {
              if (session.id === lastSessionId.current) return;
              lastSessionId.current = session.id;
              await refresh();
            } else {
              const hadSession = lastSessionId.current !== null;
              lastSessionId.current = null;
              setUser(null);
              setBootPhase(null);
              if (hadSession) {
                try { sessionStorage.setItem('erp.session-expired', '1'); } catch { /* ignore */ }
              }
            }
          } finally {
            if (!hasLoadedOnce) {
              hasLoadedOnce = true;
              setLoading(false);
              if (!session) setBootPhase(null);
            }
          }
        });
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('Clerk failed to load', error);
        toast.error(getErrorMessage(error, 'Auth failed to start'));
        setLoading(false);
        setBootPhase(null);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!user || !clerk.session) return;
    const heartbeat = () => {
      if (document.visibilityState === 'visible' && clerk.session) {
        void SessionService.registerCurrent().catch(() => undefined);
      }
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 5 * 60_000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [user?.id]);

  // Keep a stable ref so the event listener always calls the latest logout closure.
  const logoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const logout = async () => {
    // Invalidate any in-flight refresh before signOut so Login won't flash "Signing you in…".
    signingOut.current = true;
    setIssue(null);
    authEpoch.current += 1;
    syncingRef.current = false;
    setSyncing(false);
    setBootPhase(null);
    configureCurrencyCode('USD');
    setUser(null);
    clearCachedMe();

    try {
      await SessionService.endCurrent().catch(() => undefined);
      // Clerk defaults to window.navigate("/") after sign-out (full page reload).
      // Pass a callback so we keep SPA routing — Topbar navigates to /login.
      await clerk.signOut(() => undefined);
    } finally {
      signingOut.current = false;
      setUser(null);
      syncingRef.current = false;
      setSyncing(false);
      setBootPhase(null);
    }
  };

  // Update ref every render so the event listener always has the latest closure.
  logoutRef.current = logout;

  // A request has already forced a fresh Clerk token and retried before this event fires.
  // Keep an active Clerk session intact: a persistent API 401 can be a backend/configuration
  // problem, while Clerk's session listener remains the authority for expiry and revocation.
  useEffect(() => {
    const handler = () => {
      if (!signingOut.current && !syncingRef.current && !clerk.session) {
        void logoutRef.current?.();
      }
    };
    // A route rejected a pending session: re-run bootstrap once (it heals or surfaces sessionIssue).
    const pendingHandler = () => {
      if (!signingOut.current && !syncingRef.current && !sessionIssueRef.current && clerk.session) {
        void refresh();
      }
    };
    document.addEventListener('auth:unauthorized', handler);
    document.addEventListener('auth:session-pending', pendingHandler);
    return () => {
      document.removeEventListener('auth:unauthorized', handler);
      document.removeEventListener('auth:session-pending', pendingHandler);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, syncing, bootPhase, sessionIssue, logout, refresh }}>
      {!loading ? children : <AuthBootScreen phase="starting" />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
