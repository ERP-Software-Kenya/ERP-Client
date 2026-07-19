import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type User = {
  id: number | string;
  username: string;
  name?: string;
  role?: string;
  [key: string]: any; // Allow other properties for now
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const sessionId = localStorage.getItem('erp_session');
      if (sessionId) {
        try {
          const res = await (window as any).electronAPI.validateSession(sessionId);
          if (res.success && res.user) {
            setUser(res.user);
            if (res.session && res.session.id !== sessionId) {
              localStorage.setItem('erp_session', res.session.id);
            }
          } else {
            localStorage.removeItem('erp_session');
          }
        } catch (error) {
          console.warn('Session validation failed:', error);
          localStorage.removeItem('erp_session');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await (window as any).electronAPI.login(username, password);
    if (!res.success) {
      throw new Error(res.error || 'Login failed');
    }
    localStorage.setItem('erp_session', res.session.id);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    const sessionId = localStorage.getItem('erp_session');
    if (sessionId) {
      try {
        await (window as any).electronAPI.logout(sessionId);
      } catch (e) {
        console.warn('Failed to invalidate session on backend', e);
      }
    }
    localStorage.removeItem('erp_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading ? children : <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading workspace...</div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
