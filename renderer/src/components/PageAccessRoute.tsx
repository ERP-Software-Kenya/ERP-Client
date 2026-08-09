import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePageAccess } from '../context/PageAccessContext';

interface PageAccessRouteProps {
  pageKey: string;
  children: React.ReactNode;
}

export default function PageAccessRoute({ pageKey, children }: PageAccessRouteProps) {
  const { canAccess, isLoading } = usePageAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (!canAccess(pageKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
