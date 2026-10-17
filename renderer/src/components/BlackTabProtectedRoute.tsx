import { Navigate } from 'react-router-dom';
import { useBlackTab } from '../context/BlackTabContext';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BlackTabProtectedRoute({ children }: { children: ReactNode }) {
  const { isUnlocked } = useBlackTab();
  const { user } = useAuth();
  
  const isOrgAdmin = user?.roles?.some((r) => ['org_admin', 'super_admin', 'org:admin', 'branch_manager'].includes(r));

  if (!isUnlocked || !isOrgAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
