import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, syncing } = useAuth();

  // Clerk session can exist before /me finishes on first load — wait instead of bouncing to /login.
  // Once a user is already loaded, a background re-sync (e.g. Clerk's periodic
  // token refresh) must not blank out the already-authenticated app.
  if (syncing && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Signing you in…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.organization) {
    return <Navigate to="/onboarding/create-org" replace />;
  }

  return children;
}
