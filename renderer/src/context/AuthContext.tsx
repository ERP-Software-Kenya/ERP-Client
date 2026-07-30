import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { clerk } from '../lib/clerk';
import { configureApi } from '../api';
import { AuthService, MeResponse } from '../services/auth.service';

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  /** True while syncing Clerk session → backend /me (prevents login bounce). */
  syncing: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

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

configureApi(
  import.meta.env.VITE_API_BASE_URL || 'https://core-apis-m03n.onrender.com',
  () => (clerk.session ? clerk.session.getToken() : Promise.resolve(null)),
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(DEV_BYPASS ? DEV_USER : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [syncing, setSyncing] = useState(false);
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
        return;
      }
      setSyncing(true);
      try {
        await AuthService.sync();
        if (signingOut.current || epoch !== authEpoch.current || !clerk.session) return;
        const me = await AuthService.getMe();
        if (signingOut.current || epoch !== authEpoch.current || !clerk.session) return;
        setUser(me);
      } catch (error) {
        if (signingOut.current || epoch !== authEpoch.current) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load your account');
        // Callback form skips Clerk's default hard navigate to "/".
        await clerk.signOut(() => undefined);
        setUser(null);
      } finally {
        if (epoch === authEpoch.current) setSyncing(false);
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

    let mounted = true;
    let hasLoadedOnce = false;
    let unsubscribe: (() => void) | undefined;

    clerk.load().then(() => {
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
            lastSessionId.current = null;
            setUser(null);
          }
        } finally {
          if (!hasLoadedOnce) {
            hasLoadedOnce = true;
            setLoading(false);
          }
        }
      });
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
    setUser(null);

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
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, syncing, logout, refresh }}>
      {!loading ? children : <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading workspace...</div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
