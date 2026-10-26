import { useState } from 'react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';

/** Shown instead of a sign-in loop when Clerk keeps the session "pending" after every automatic fix. */
export default function AccountSetupIncomplete({ message }: { message: string }) {
  const { refresh, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Your account setup isn&apos;t finished</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">
          Signing in again won&apos;t fix this. Ask your administrator to check your account, and quote
          code <span className="font-mono">AUTH-PENDING</span>.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={retry} disabled={busy}>Try again</Button>
          <Button variant="outline" onClick={() => void logout()}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
