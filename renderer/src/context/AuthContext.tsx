import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { clerk } from '../lib/clerk';
import { configureApi } from '../api';
import { AuthService, MeResponse } from '../services/auth.service';

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
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

  const refresh = async () => {
    if (DEV_BYPASS) return;
    if (!clerk.session) {
      setUser(null);
      return;
    }
    let me = await AuthService.getMe();
    if (!me.isOnboarded) {
      await AuthService.sync();
      me = await AuthService.getMe();
    }
    setUser(me);
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
          if (session) {
            await refresh();
          } else {
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
    if (DEV_BYPASS) {
      setUser(null);
      return;
    }
    await clerk.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {!loading ? children : <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading workspace...</div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
