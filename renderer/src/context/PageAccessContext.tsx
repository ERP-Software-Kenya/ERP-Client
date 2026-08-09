import { createContext, useContext, useMemo, ReactNode } from 'react';
import { PageAccess } from '../api';
import { useAuth } from './AuthContext';

interface PageAccessContextType {
  canAccess: (pageKey: string) => boolean;
  isLoading: boolean;
}

const PageAccessContext = createContext<PageAccessContextType | null>(null);

export function PageAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const { data: configs = [], isLoading } = PageAccess.useList({
    enabled: !!user,
  });

  const accessMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of configs) {
      map.set(c.pageKey, new Set(c.allowedRoles));
    }
    return map;
  }, [configs]);

  const canAccess = useMemo(
    () =>
      (pageKey: string): boolean => {
        if (isSuperAdmin) return true;
        const allowed = accessMap.get(pageKey);
        if (!allowed) return false;
        return (user?.roles ?? []).some((r) => allowed.has(r));
      },
    [isSuperAdmin, accessMap, user],
  );

  return (
    <PageAccessContext.Provider value={{ canAccess, isLoading }}>
      {children}
    </PageAccessContext.Provider>
  );
}

export function usePageAccess(): PageAccessContextType {
  const ctx = useContext(PageAccessContext);
  if (!ctx) throw new Error('usePageAccess must be used within PageAccessProvider');
  return ctx;
}
