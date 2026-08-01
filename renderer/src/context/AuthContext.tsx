import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { clerk } from '../lib/clerk';
import { clearCachedMe, readCachedMe, warmApi, writeCachedMe } from '../lib/auth-cache';
import { configureApi } from '../api';
import { AuthService, MeResponse } from '../services/auth.service';
import AuthBootScreen, { AuthBootPhase } from '../components/auth/AuthBootScreen';

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  /** True while syncing Clerk session → backend /me (prevents login bounce). */
  syncing: boolean;
  /** Fine-grained phase for the first-time boot UI. Null when idle. */
  bootPhase: AuthBootPhase | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://core-apis-m03n.onrender.com';

const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
const DEV_USER: MeResponse = {
  id: 'dev-user',
  clerkUserId: 'dev-user',
  email: 'dev@local',
  firstName: 'Dev',
  lastName: 'User',
  roles: ['admin'],
  isOnboarded: true,
  organization: { id: 'dev-org', name: 'Dev Org', slug: 'dev-org' },
};

type ClerkResources = Parameters<Parameters<typeof clerk.addListener>[0]>[0];

configureApi(API_BASE, () => (clerk.session ? clerk.session.getToken() : Promise.resolve(null)));

function clerkUserIdFromSession(session: { user?: { id?: string } } | null | undefined): string | null {
  return session?.user?.id ?? clerk.user?.id ?? null;
}

function hydrateFromCache(clerkUserId: string | null): MeResponse | null {
  if (!clerkUserId) return null;
  const cached = readCachedMe();
  if (!cached || cached.clerkUserId !== clerkUserId) return null;
  return cached;
}

/**
 * Returning users (cached): one /me round-trip, sync in background.
 * First sign-in (no cache): sync then /me — same two calls as before.
 */
async function loadMe(
  hasCache: boolean,
  onPhase: (phase: AuthBootPhase) => void,
): Promise<MeResponse> {
  if (hasCache) {
    onPhase('profile');
    try {
      const me = await AuthService.getMe();
      if (me.id && me.isOnboarded) {
        void AuthService.sync().catch(() => undefined);
        return me;
      }
    } catch {
      // Stale cache or API blip — fall through to sync + /me.
    }
  }
  onPhase('sync');
  await AuthService.sync();
  onPhase('profile');
  return AuthService.getMe();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(DEV_BYPASS ? DEV_USER : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [syncing, setSyncing] = useState(false);
  const [bootPhase, setBootPhase] = useState<AuthBootPhase | null>(DEV_BYPASS ? null : 'starting');
  const refreshInFlight = useRef<Promise<void> | null>(null);
  /** Bumped on logout so in-flight /me results cannot update UI afterward. */
  const authEpoch = useRef(0);
  const signingOut = useRef(false);
  /** Clerk's addListener fires on every resource change (e.g. background token
   *  refresh every ~60s), not just sign-in/sign-out. Track the last session id
   *  so we only re-sync with the backend when the session actually changes. */
  const lastSessionId = useRef<string | null>(null);

  const refresh = async () => {
    if (DEV_BYPASS) return;
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

      const clerkUserId = clerkUserIdFromSession(clerk.session);
      const cached = hydrateFromCache(clerkUserId);
      // Unblock Login / ProtectedRoute immediately for returning users.
      if (cached) setUser(cached);

      setBootPhase('session');
      setSyncing(true);
      try {
        const me = await loadMe(Boolean(cached), (phase) => {
          if (signingOut.current || epoch !== authEpoch.current) return;
          setBootPhase(phase);
        });
        if (signingOut.current || epoch !== authEpoch.current || !clerk.session) return;
        setUser(me);
        writeCachedMe(me);
      } catch (error) {
        if (signingOut.current || epoch !== authEpoch.current) return;
        // Keep a valid cached session through transient API cold-starts / blips.
        if (cached) {
          toast.error(error instanceof Error ? error.message : 'Could not refresh your account');
          return;
        }
        clearCachedMe();
        toast.error(error instanceof Error ? error.message : 'Failed to load your account');
        // Callback form skips Clerk's default hard navigate to "/".
        await clerk.signOut(() => undefined);
        setUser(null);
      } finally {
        if (epoch === authEpoch.current) {
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
    if (DEV_BYPASS) return;

    // Start waking the API while Clerk loads / user types credentials.
    warmApi(API_BASE);

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
              const cached = hydrateFromCache(clerkUserIdFromSession(session));
              if (cached) setUser(cached);
              await refresh();
            } else {
              lastSessionId.current = null;
              setUser(null);
              setBootPhase(null);
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
        toast.error(error instanceof Error ? error.message : 'Auth failed to start');
        setLoading(false);
        setBootPhase(null);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const logout = async () => {
    // Invalidate any in-flight refresh before signOut so Login won't flash "Signing you in…".
    signingOut.current = true;
    authEpoch.current += 1;
    setSyncing(false);
    setBootPhase(null);
    setUser(null);
    clearCachedMe();

    try {
      if (!DEV_BYPASS) {
        // Clerk defaults to window.navigate("/") after sign-out (full page reload).
        // Pass a callback so we keep SPA routing — Topbar navigates to /login.
        await clerk.signOut(() => undefined);
      }
    } finally {
      signingOut.current = false;
      setUser(null);
      setSyncing(false);
      setBootPhase(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, syncing, bootPhase, logout, refresh }}>
      {!loading ? children : <AuthBootScreen phase="starting" />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
