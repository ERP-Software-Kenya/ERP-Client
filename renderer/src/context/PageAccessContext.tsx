import { createContext, useContext, useMemo, ReactNode } from 'react';
import { PageAccess } from '../api';
import { useAuth } from './AuthContext';
import { canAccessPage } from '../lib/page-access';

interface PageAccessContextType {
  canAccess: (pageKey: string) => boolean;
  isLoading: boolean;
  hasConfigs: boolean;
}

const PageAccessContext = createContext<PageAccessContextType | null>(null);

export function PageAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

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
      (pageKey: string): boolean => canAccessPage(user?.roles, pageKey, accessMap),
    [accessMap, user],
  );

  return (
    <PageAccessContext.Provider value={{ canAccess, isLoading, hasConfigs: configs.length > 0 }}>
      {children}
    </PageAccessContext.Provider>
  );
}

export function usePageAccess(): PageAccessContextType {
  const ctx = useContext(PageAccessContext);
  if (!ctx) throw new Error('usePageAccess must be used within PageAccessProvider');
  return ctx;
}
