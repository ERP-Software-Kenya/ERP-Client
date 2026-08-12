# Auth OAuth 2FA Frontend Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap where a Google-OAuth sign-in for a user with email-code 2FA enabled gets stuck on a "did not create a session" error, by giving the frontend one shared status-resolution function that both the password and Google OAuth sign-in paths call.

**Architecture:** All Clerk `signIn`/`signUp` orchestration and status-branching moves into a new `renderer/src/lib/auth-flow.ts` module of plain exported async functions (not a hook — this is one-shot async orchestration, not reactive state). `SSOCallback` and the new `SignIn` page both call the same `resolveSignInStatus()` export, so the `needs_second_factor` branch that today only exists on the password path now fires for Google OAuth too. The old single `Login` component (which toggled between sign-in/sign-up/verify modes with local state) is split into four routed pages — `SignIn`, `SignUp`, `VerifyEmail`, `VerifySecondFactor` — each reading its pending Clerk resource fresh from `clerk.client` on mount, the same pattern `SSOContinue` (unchanged, out of scope) already uses.

**Tech Stack:** React 19 + react-router-dom 7 (`HashRouter`) + `@clerk/clerk-js` (headless SDK, Electron-compatible) + vitest (new devDependency — no test runner exists in this package today; the design doc calls for one small logic test).

**Scope:** Frontend only (`ERP-Client/renderer`). The backend `core-apis` auth module is explicitly out of scope for this plan — see `docs/brainstorm/2026-08-13-auth-rebuild-design.md`. A 1:1 backend rewrite with zero behavior change carries real regression risk against a module security-hardened two days ago (S95/S100) for no functional benefit, since Clerk's 2FA/email-verification challenge is entirely client-side; the backend only ever sees a final valid JWT. If a backend rewrite is still wanted, it should be its own plan, reviewed on its own.

## Global Constraints

- Backend (`core-apis`) is untouched by this plan — no endpoint, DTO, or guard changes.
- `phone_code` and `totp` second-factor strategies are dropped — email-code only, per the design doc's requirements gathering.
- `VITE_DEV_BYPASS_AUTH` dev-bypass mode is dropped — removed from `AuthContext.tsx`, `clerk.ts`, `.env.example`, `vite-env.d.ts`.
- `HashRouter` and the Electron user-agent stripping for Google OAuth are unchanged — not touched by any task.
- The `/me` localStorage cache-first pattern in `AuthContext.tsx` / `lib/auth-cache.ts` is unchanged — not touched by any task.
- `SSOContinue` (`renderer/src/pages/SSOContinue/index.tsx`) is kept as-is — no task modifies it.
- All new/modified TypeScript must pass `npx tsc --noEmit -p renderer/tsconfig.json` (strict mode, `noUnusedLocals`/`noUnusedParameters` on) before a task is considered done.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `renderer/src/lib/auth-flow.ts` | Create | Shared Clerk orchestration: `resolveSignInStatus`, `activateSession`, `prepareEmailSecondFactor`, `verifySecondFactor`, `signUpWithPassword`, `prepareEmailVerification`, `verifyEmailCode`, `startGoogleOAuth`, `clerkErrorMessage` |
| `renderer/src/lib/auth-flow.test.ts` | Create | Unit test for `resolveSignInStatus`'s 3-way branch (the one piece of real branching logic) |
| `renderer/src/pages/SSOCallback/index.tsx` | Modify | Google OAuth redirect handler — now calls `resolveSignInStatus`, closing the 2FA gap |
| `renderer/src/pages/SignIn/index.tsx` | Create | `/login` — password sign-in form + Google button |
| `renderer/src/pages/SignUp/index.tsx` | Create | `/signup` — password sign-up form + Google button |
| `renderer/src/pages/VerifyEmail/index.tsx` | Create | `/verify-email` — email-code verification after password sign-up |
| `renderer/src/pages/VerifySecondFactor/index.tsx` | Create | `/verify-second-factor` — email-code 2FA, reached from either sign-in path |
| `renderer/src/pages/Login/index.tsx` | Delete | Replaced by the four pages above |
| `renderer/src/App.tsx` | Modify | Route table: swap `Login` for `SignIn`/`SignUp`/`VerifyEmail`/`VerifySecondFactor` |
| `renderer/src/context/AuthContext.tsx` | Modify | Remove dropped `VITE_DEV_BYPASS_AUTH` dead code |
| `renderer/src/lib/clerk.ts` | Modify | Remove dropped dev-bypass fallback key |
| `renderer/.env.example` | Modify | Remove `VITE_DEV_BYPASS_AUTH` line |
| `renderer/src/vite-env.d.ts` | Modify | Remove `VITE_DEV_BYPASS_AUTH` env type |
| `package.json` (ERP-Client root) | Modify | Add `vitest` devDependency + `test` script |

---

### Task 1: `auth-flow.ts` orchestration module

**Files:**
- Create: `renderer/src/lib/auth-flow.ts`
- Create: `renderer/src/lib/auth-flow.test.ts`
- Modify: `package.json` (ERP-Client root)

**Interfaces:**
- Produces: `clerkErrorMessage(error: any, fallback: string): string`; `activateSession(sessionId: string | null | undefined, refresh: () => Promise<void>): Promise<void>`; `resolveSignInStatus(signIn: SignInResource, opts: { navigate: NavigateFn; refresh: () => Promise<void> }): Promise<void>`; `prepareEmailSecondFactor(signIn: SignInResource): Promise<void>`; `verifySecondFactor(signIn: SignInResource, code: string): Promise<{ status: string; createdSessionId: string | null }>`; `signUpWithPassword(signUp: SignUpResource, payload: { emailAddress: string; password: string; firstName: string; lastName: string; username: string }): Promise<void>`; `prepareEmailVerification(signUp: SignUpResource): Promise<void>`; `verifyEmailCode(signUp: SignUpResource, code: string): Promise<{ status: string; createdSessionId: string | null }>`; `startGoogleOAuth(signIn: SignInResource): Promise<void>`; types `SignInResource`, `SignUpResource`, `NavigateFn`. All later tasks import from `'../../lib/auth-flow'`.

- [ ] **Step 1: Add vitest to the project**

`package.json` (ERP-Client root) currently has no test runner. Add it:

```diff
   "scripts": {
     "dev": "concurrently -k \"npm run dev:main\" \"npm run dev:renderer\" \"npm run dev:electron\"",
+    "test": "vitest run",
     "dev:main": "npx tsx scripts/build-main.ts --watch",
```

```diff
   "devDependencies": {
     "@tailwindcss/vite": "^4.3.2",
     "@types/node": "^26.1.1",
     "@types/react": "^19.2.17",
     "@types/react-dom": "^19.2.3",
     "@vitejs/plugin-react": "^6.0.3",
     "concurrently": "^10.0.3",
     "cross-env": "^10.1.0",
     "electron": "^43.1.0",
     "electron-builder": "^26.8.1",
     "esbuild": "^0.28.1",
     "react": "^19.2.7",
     "react-dom": "^19.2.7",
     "tailwindcss": "^4.3.2",
     "tsx": "^4.23.1",
     "typescript": "^7.0.2",
     "vite": "^8.1.4",
+    "vitest": "^3.2.4",
     "wait-on": "^9.0.10"
   },
```

Run: `npm install` (from `ERP-Client`)
Expected: installs `vitest` with no errors. No `vitest.config.ts` is needed — `vite.config.ts` already sets `root: renderer`, which vitest reuses automatically, and the test file below needs no plugins.

- [ ] **Step 2: Write the failing test**

Create `renderer/src/lib/auth-flow.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('./clerk', () => ({
  clerk: { setActive: vi.fn().mockResolvedValue(undefined) },
}));

import { resolveSignInStatus } from './auth-flow';

function fakeSignIn(overrides: Record<string, unknown> = {}) {
  return {
    status: 'complete',
    createdSessionId: 'sess_123',
    supportedSecondFactors: [],
    prepareSecondFactor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('resolveSignInStatus', () => {
  it('activates the session and navigates home on complete', async () => {
    const navigate = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const signIn = fakeSignIn({ status: 'complete', createdSessionId: 'sess_123' });

    await resolveSignInStatus(signIn, { navigate, refresh });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('prepares the email second factor and navigates to /verify-second-factor on needs_second_factor', async () => {
    const navigate = vi.fn();
    const refresh = vi.fn();
    const prepareSecondFactor = vi.fn().mockResolvedValue(undefined);
    const signIn = fakeSignIn({
      status: 'needs_second_factor',
      supportedSecondFactors: [{ strategy: 'email_code', emailAddressId: 'idn_1' }],
      prepareSecondFactor,
    });

    await resolveSignInStatus(signIn, { navigate, refresh });

    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: 'email_code', emailAddressId: 'idn_1' });
    expect(navigate).toHaveBeenCalledWith('/verify-second-factor', { replace: true });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('throws for an unhandled status so the caller can show a toast', async () => {
    const navigate = vi.fn();
    const refresh = vi.fn();
    const signIn = fakeSignIn({ status: 'needs_identifier' });

    await expect(resolveSignInStatus(signIn, { navigate, refresh })).rejects.toThrow(/needs_identifier/);
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run` (from `ERP-Client`)
Expected: FAIL — `auth-flow.ts` does not exist yet (module resolution error).

- [ ] **Step 4: Write the implementation**

Create `renderer/src/lib/auth-flow.ts`:

```ts
import { clerk } from './clerk';

export type SignInResource = NonNullable<typeof clerk.client>['signIn'];
export type SignUpResource = NonNullable<typeof clerk.client>['signUp'];
export type NavigateFn = (path: string, opts?: { replace?: boolean }) => void;

export function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export async function activateSession(
  sessionId: string | null | undefined,
  refresh: () => Promise<void>,
): Promise<void> {
  if (!sessionId) {
    throw new Error('Sign-in completed but no session was created');
  }
  await clerk.setActive({ session: sessionId });
  await refresh();
}

export async function prepareEmailSecondFactor(signIn: SignInResource): Promise<void> {
  const factors = signIn.supportedSecondFactors ?? [];
  const emailFactor = factors.find((f) => f.strategy === 'email_code') as
    | { strategy: 'email_code'; emailAddressId: string }
    | undefined;
  if (!emailFactor?.emailAddressId) {
    throw new Error('No email verification method available for this sign-in');
  }
  await signIn.prepareSecondFactor({
    strategy: 'email_code',
    emailAddressId: emailFactor.emailAddressId,
  } as any);
}

export async function verifySecondFactor(
  signIn: SignInResource,
  code: string,
): Promise<{ status: string; createdSessionId: string | null }> {
  return signIn.attemptSecondFactor({ strategy: 'email_code', code: code.trim() } as any);
}

/**
 * This is the fix: both the password sign-in path and the Google OAuth callback
 * call this same function, so `needs_second_factor` is handled identically either way.
 */
export async function resolveSignInStatus(
  signIn: SignInResource,
  { navigate, refresh }: { navigate: NavigateFn; refresh: () => Promise<void> },
): Promise<void> {
  if (signIn.status === 'complete') {
    await activateSession(signIn.createdSessionId, refresh);
    navigate('/', { replace: true });
    return;
  }
  if (signIn.status === 'needs_second_factor') {
    await prepareEmailSecondFactor(signIn);
    navigate('/verify-second-factor', { replace: true });
    return;
  }
  throw new Error(`Sign in requires an additional step (${signIn.status}) that isn't supported`);
}

export async function signUpWithPassword(
  signUp: SignUpResource,
  payload: { emailAddress: string; password: string; firstName: string; lastName: string; username: string },
): Promise<void> {
  await signUp.create(payload);
  await prepareEmailVerification(signUp);
}

export async function prepareEmailVerification(signUp: SignUpResource): Promise<void> {
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
}

export async function verifyEmailCode(
  signUp: SignUpResource,
  code: string,
): Promise<{ status: string; createdSessionId: string | null }> {
  return signUp.attemptEmailAddressVerification({ code: code.trim() });
}

export async function startGoogleOAuth(signIn: SignInResource): Promise<void> {
  const origin = window.location.origin;
  await signIn.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: `${origin}/#/sso-callback`,
    redirectUrlComplete: `${origin}/#/`,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run` (from `ERP-Client`)
Expected: PASS — 3 tests green.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json renderer/src/lib/auth-flow.ts renderer/src/lib/auth-flow.test.ts
git commit -m "feat(auth): add shared auth-flow orchestration module with 2FA-aware status resolution"
```

---

### Task 2: Rewrite `SSOCallback` to close the OAuth 2FA gap

**Files:**
- Modify: `renderer/src/pages/SSOCallback/index.tsx`

**Interfaces:**
- Consumes: `clerkErrorMessage`, `resolveSignInStatus` from `../../lib/auth-flow` (Task 1).

- [ ] **Step 1: Replace the file contents**

Replace all of `renderer/src/pages/SSOCallback/index.tsx` with:

```tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { clerkErrorMessage, resolveSignInStatus } from '../../lib/auth-flow';
import { toast } from 'sonner';

export default function SSOCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        if (!clerk.loaded) {
          await clerk.load();
        }

        await clerk.handleRedirectCallback({
          signInUrl: '/#/login',
          signUpUrl: '/#/login',
          signInForceRedirectUrl: '/#/',
          signUpForceRedirectUrl: '/#/',
          // First-time Google users often lack username (required by this Clerk instance)
          continueSignUpUrl: '/#/sso-continue',
        });

        // The fix: route through the same status resolver the password path uses,
        // so an existing user with 2FA enabled reaches /verify-second-factor instead
        // of falling through to the "no session" error below.
        const signIn = clerk.client?.signIn;
        if (signIn && (signIn.status === 'complete' || signIn.status === 'needs_second_factor')) {
          await resolveSignInStatus(signIn, { navigate, refresh });
          return;
        }

        // New-user case: Clerk requires more profile fields (existing behavior, unchanged).
        const signUp = clerk.client?.signUp;
        if (signUp?.status === 'missing_requirements') {
          navigate('/sso-continue', { replace: true });
          return;
        }

        if (clerk.session) {
          await refresh();
          navigate('/', { replace: true });
          return;
        }

        toast.error('Google sign-in did not create a session — try again');
        navigate('/login', { replace: true });
      } catch (error: any) {
        const signUp = clerk.client?.signUp;
        if (signUp?.status === 'missing_requirements') {
          navigate('/sso-continue', { replace: true });
          return;
        }
        toast.error(clerkErrorMessage(error, 'Google sign-in failed'));
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">Completing Google sign-in…</p>
        <div id="clerk-captcha" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: errors about the not-yet-created `/verify-second-factor` route are fine at this point (routing is just a string) — expect no *type* errors. If `resolveSignInStatus` or `clerkErrorMessage` fail to resolve, re-check the import path.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/pages/SSOCallback/index.tsx
git commit -m "fix(auth): route Google OAuth sign-in through resolveSignInStatus to handle needs_second_factor"
```

---

### Task 3: `VerifySecondFactor` page

**Files:**
- Create: `renderer/src/pages/VerifySecondFactor/index.tsx`

**Interfaces:**
- Consumes: `activateSession`, `clerkErrorMessage`, `prepareEmailSecondFactor`, `verifySecondFactor` from `../../lib/auth-flow` (Task 1); `useAuth()` from `../../context/AuthContext` (unchanged).

- [ ] **Step 1: Write the file**

Create `renderer/src/pages/VerifySecondFactor/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { activateSession, clerkErrorMessage, prepareEmailSecondFactor, verifySecondFactor } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function VerifySecondFactor() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!clerk.loaded) await clerk.load();
      const signIn = clerk.client?.signIn;
      if (!signIn || signIn.status !== 'needs_second_factor') {
        toast.error('Verification session expired — sign in again');
        navigate('/login', { replace: true });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const signIn = clerk.client?.signIn;
    if (!signIn) return;
    setLoading(true);
    try {
      const result = await verifySecondFactor(signIn, code);
      if (result.status === 'complete') {
        await activateSession(result.createdSessionId, refresh);
        navigate('/', { replace: true });
        return;
      }
      toast.error(`Verification requires an additional step (${result.status}) that isn't supported yet`);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const signIn = clerk.client?.signIn;
    if (!signIn) return;
    try {
      await prepareEmailSecondFactor(signIn);
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Preparing verification…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Two-step verification</h1>
          <p className="text-muted-foreground text-sm">We sent a verification code to your email</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <button type="button" className="text-primary underline underline-offset-2" onClick={handleResend}>
              Resend code
            </button>
            {' · '}
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => navigate('/login')}>
              Back to sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/pages/VerifySecondFactor/index.tsx
git commit -m "feat(auth): add VerifySecondFactor page for email-code 2FA"
```

---

### Task 4: `SignIn` page (`/login`)

**Files:**
- Create: `renderer/src/pages/SignIn/index.tsx`

**Interfaces:**
- Consumes: `clerkErrorMessage`, `resolveSignInStatus`, `startGoogleOAuth` from `../../lib/auth-flow` (Task 1); `useAuth()`, `AuthBootScreen`, `LoginVisualPanel` (all unchanged, same imports as the old `Login` page).

- [ ] **Step 1: Write the file**

Create `renderer/src/pages/SignIn/index.tsx`:

```tsx
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { clerkErrorMessage, resolveSignInStatus, startGoogleOAuth } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import AuthBootScreen from '../../components/auth/AuthBootScreen';
import LoginVisualPanel from '../../components/auth/LoginVisualPanel';
import { toast } from 'sonner';

export default function SignIn() {
  const { user, refresh, syncing, bootPhase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  // After OAuth, Clerk may leave an incomplete sign-up on this client.
  if (clerk.client?.signUp?.status === 'missing_requirements') {
    return <Navigate to="/sso-continue" replace />;
  }

  // Backend /me still catching up after setActive — avoid flashing the login form.
  // Require an active Clerk session so a stale syncing flag after logout cannot flash this UI.
  if (syncing && clerk.session) {
    return <AuthBootScreen phase={bootPhase ?? 'session'} />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      toast.error('Clerk is still starting up — try again in a moment');
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const signIn = await clerk.client!.signIn.create({
        strategy: 'password',
        identifier: email.trim(),
        password,
      });
      await resolveSignInStatus(signIn, { navigate, refresh });
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await startGoogleOAuth(clerk.client!.signIn);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Google sign-in failed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <LoginVisualPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1 lg:hidden">Core ERP Client</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-primary underline underline-offset-2">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/pages/SignIn/index.tsx
git commit -m "feat(auth): add SignIn page using resolveSignInStatus"
```

---

### Task 5: `SignUp` page (`/signup`)

**Files:**
- Create: `renderer/src/pages/SignUp/index.tsx`

**Interfaces:**
- Consumes: `clerkErrorMessage`, `signUpWithPassword`, `startGoogleOAuth` from `../../lib/auth-flow` (Task 1); `useAuth()`, `LoginVisualPanel` (unchanged).

- [ ] **Step 1: Write the file**

Create `renderer/src/pages/SignUp/index.tsx`:

```tsx
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { clerkErrorMessage, signUpWithPassword, startGoogleOAuth } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import LoginVisualPanel from '../../components/auth/LoginVisualPanel';
import { toast } from 'sonner';

export default function SignUp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const requireClerkClient = () => {
    if (!clerk.client) {
      toast.error('Clerk is still starting up — try again in a moment');
      return false;
    }
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await signUpWithPassword(clerk.client!.signUp, {
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });
      toast.success('Enter the verification code we emailed you');
      navigate('/verify-email');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await startGoogleOAuth(clerk.client!.signIn);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Google sign-in failed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <LoginVisualPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1 lg:hidden">Core ERP Client</h1>
            <p className="text-muted-foreground">Create your account</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signUpEmail">Email</Label>
              <Input
                id="signUpEmail"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signUpPassword">Password</Label>
              <Input
                id="signUpPassword"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div id="clerk-captcha" />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/pages/SignUp/index.tsx
git commit -m "feat(auth): add SignUp page"
```

---

### Task 6: `VerifyEmail` page (`/verify-email`)

**Files:**
- Create: `renderer/src/pages/VerifyEmail/index.tsx`

**Interfaces:**
- Consumes: `activateSession`, `clerkErrorMessage`, `prepareEmailVerification`, `verifyEmailCode` from `../../lib/auth-flow` (Task 1); `useAuth()` (unchanged).

- [ ] **Step 1: Write the file**

Create `renderer/src/pages/VerifyEmail/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerk } from '../../lib/clerk';
import { useAuth } from '../../context/AuthContext';
import { activateSession, clerkErrorMessage, prepareEmailVerification, verifyEmailCode } from '../../lib/auth-flow';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      if (!clerk.loaded) await clerk.load();
      const signUp = clerk.client?.signUp;
      if (!signUp?.id) {
        toast.error('Sign-up session expired — start again');
        navigate('/signup', { replace: true });
        return;
      }
      setEmail(signUp.emailAddress ?? '');
      setReady(true);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    setLoading(true);
    try {
      const result = await verifyEmailCode(signUp, code);
      if (result.status === 'complete') {
        await activateSession(result.createdSessionId, refresh);
        navigate('/', { replace: true });
        return;
      }
      toast.error(`Verification requires an additional step (${result.status}) that isn't supported yet`);
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const signUp = clerk.client?.signUp;
    if (!signUp) return;
    try {
      await prepareEmailVerification(signUp);
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Preparing verification…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm">We sent a verification code to {email || 'your email'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <button type="button" className="text-primary underline underline-offset-2" onClick={handleResend}>
              Resend code
            </button>
            {' · '}
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => navigate('/signup')}>
              Back
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/pages/VerifyEmail/index.tsx
git commit -m "feat(auth): add VerifyEmail page"
```

---

### Task 7: Wire routes, drop dev-bypass, delete old `Login`, end-to-end QA

**Files:**
- Modify: `renderer/src/App.tsx`
- Modify: `renderer/src/context/AuthContext.tsx`
- Modify: `renderer/src/lib/clerk.ts`
- Modify: `renderer/.env.example`
- Modify: `renderer/src/vite-env.d.ts`
- Delete: `renderer/src/pages/Login/index.tsx`

**Interfaces:**
- Consumes: `SignIn`, `SignUp`, `VerifyEmail`, `VerifySecondFactor` default exports from Tasks 3–6; `SSOCallback` from Task 2.

- [ ] **Step 1: Update route imports and table in `App.tsx`**

```diff
-const Login = lazy(() => import('./pages/Login'));
+const SignIn = lazy(() => import('./pages/SignIn'));
+const SignUp = lazy(() => import('./pages/SignUp'));
+const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
+const VerifySecondFactor = lazy(() => import('./pages/VerifySecondFactor'));
 const SSOCallback = lazy(() => import('./pages/SSOCallback'));
 const SSOContinue = lazy(() => import('./pages/SSOContinue'));
```

```diff
         <Routes>
-          <Route path="/login" element={<Login />} />
+          <Route path="/login" element={<SignIn />} />
+          <Route path="/signup" element={<SignUp />} />
+          <Route path="/verify-email" element={<VerifyEmail />} />
+          <Route path="/verify-second-factor" element={<VerifySecondFactor />} />
           <Route path="/sso-callback" element={<SSOCallback />} />
           <Route path="/sso-continue" element={<SSOContinue />} />
```

- [ ] **Step 2: Delete the old `Login` page**

```bash
git rm renderer/src/pages/Login/index.tsx
```

- [ ] **Step 3: Remove `VITE_DEV_BYPASS_AUTH` from `AuthContext.tsx`**

```diff
 const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://core-apis-m03n.onrender.com';

-const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
-const DEV_USER: MeResponse = {
-  id: 'dev-user',
-  clerkUserId: 'dev-user',
-  email: 'dev@local',
-  firstName: 'Dev',
-  lastName: 'User',
-  roles: ['admin'],
-  isOnboarded: true,
-  organization: { id: 'dev-org', name: 'Dev Org', slug: 'dev-org' },
-};
-
 type ClerkResources = Parameters<Parameters<typeof clerk.addListener>[0]>[0];
```

```diff
 export function AuthProvider({ children }: { children: ReactNode }) {
-  const [user, setUser] = useState<MeResponse | null>(DEV_BYPASS ? DEV_USER : null);
-  const [loading, setLoading] = useState(!DEV_BYPASS);
+  const [user, setUser] = useState<MeResponse | null>(null);
+  const [loading, setLoading] = useState(true);
   const [syncing, setSyncing] = useState(false);
-  const [bootPhase, setBootPhase] = useState<AuthBootPhase | null>(DEV_BYPASS ? null : 'starting');
+  const [bootPhase, setBootPhase] = useState<AuthBootPhase | null>('starting');
```

```diff
   const refresh = async () => {
-    if (DEV_BYPASS) return;
     if (signingOut.current) return;
```

```diff
   useEffect(() => {
-    if (DEV_BYPASS) return;
-
     // Start waking the API while Clerk loads / user types credentials.
     warmApi(API_BASE);
```

```diff
     try {
-      if (!DEV_BYPASS) {
-        // Clerk defaults to window.navigate("/") after sign-out (full page reload).
-        // Pass a callback so we keep SPA routing — Topbar navigates to /login.
-        await clerk.signOut(() => undefined);
-      }
+      // Clerk defaults to window.navigate("/") after sign-out (full page reload).
+      // Pass a callback so we keep SPA routing — Topbar navigates to /login.
+      await clerk.signOut(() => undefined);
     } finally {
```

```diff
   useEffect(() => {
-    if (DEV_BYPASS) return;
     const handler = () => {
       if (!signingOut.current) void logoutRef.current?.();
     };
```

- [ ] **Step 4: Remove the dev-bypass fallback key in `clerk.ts`**

Replace `renderer/src/lib/clerk.ts` with:

```ts
import { Clerk } from '@clerk/clerk-js';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set — add it to renderer/.env');
}

export const clerk = new Clerk(publishableKey);
```

- [ ] **Step 5: Remove `VITE_DEV_BYPASS_AUTH` from `.env.example` and `vite-env.d.ts`**

`renderer/.env.example`:

```diff
 VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZXBpYy1nYXRvci0yLmNsZXJrLmFjY291bnRzLmRldiQ
 VITE_API_BASE_URL=https://core-apis-m03n.onrender.com
-# Dev only — skips Clerk login with a fake local user. Ignored in production builds.
-VITE_DEV_BYPASS_AUTH=false
 # Google sign-in: enable Google in Clerk Dashboard → Social Connections,
 # and add http://localhost:5173/sso-callback to Allowed redirect URLs.
```

`renderer/src/vite-env.d.ts`:

```diff
 interface ImportMetaEnv {
   readonly VITE_CLERK_PUBLISHABLE_KEY: string;
   readonly VITE_API_BASE_URL?: string;
-  readonly VITE_DEV_BYPASS_AUTH?: string;
 }
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p renderer/tsconfig.json` (from `ERP-Client`)
Expected: no errors, and no `noUnusedLocals`/`noUnusedParameters` complaints about `DEV_BYPASS`/`DEV_USER` (they're fully removed, not just unused).

- [ ] **Step 7: Build**

Run: `npm run build:renderer` (from `ERP-Client`)
Expected: build succeeds.

- [ ] **Step 8: Manual end-to-end QA**

Start the app (`npm run dev`) and, against the real Clerk test instance, walk through:

1. **Password sign-up:** `/signup` → fill form → submit → lands on `/verify-email` → enter the emailed code → lands on `/` (home).
2. **Password sign-in, no 2FA:** `/login` → submit → lands on `/` directly.
3. **Password sign-in, 2FA enabled:** enable email-code 2FA on a test user in the Clerk dashboard → sign in with that user's password → lands on `/verify-second-factor` → enter the emailed code → lands on `/`.
4. **Google OAuth, no 2FA:** `/login` → "Continue with Google" → completes → lands on `/`.
5. **Google OAuth, 2FA enabled (the bug this plan fixes):** same 2FA-enabled test user → "Continue with Google" → previously landed on `/login` with "Google sign-in did not create a session" → now must land on `/verify-second-factor` → enter the emailed code → lands on `/`.
6. **Google OAuth, new user (missing profile fields):** a Google account never used with this app before → lands on `/sso-continue` (unchanged) → completes profile → lands on `/`.
7. **Logout** from an authenticated session → lands back on `/login`, no flash of stale UI.

Expected: all seven flows complete without console errors or getting stuck.

- [ ] **Step 9: Commit**

```bash
git add renderer/src/App.tsx renderer/src/context/AuthContext.tsx renderer/src/lib/clerk.ts renderer/.env.example renderer/src/vite-env.d.ts
git commit -m "feat(auth): wire new auth routes, drop VITE_DEV_BYPASS_AUTH, remove old Login page"
```

---

## Self-Review

**Spec coverage:**
- Routes table (`/login`, `/signup`, `/verify-email`, `/verify-second-factor`, `/sso-callback`, `/sso-continue`) — Task 7 Step 1, `/sso-continue` untouched per constraints. ✅
- `auth-flow.ts` shared orchestration replacing duplicated `clerkErrorMessage`/`activateSession` — Task 1. ✅
- `resolveSignInStatus` 3-way branch (`complete` / `needs_second_factor` / else-throw) — Task 1. ✅
- The fix itself: both `SignIn`'s password handler and `SSOCallback` call `resolveSignInStatus` — Task 2 + Task 4. ✅
- Dropped `VITE_DEV_BYPASS_AUTH` — Task 7 Steps 3–5. ✅
- Dropped phone/TOTP second factor (email-code only) — `VerifySecondFactor` in Task 3 only implements `email_code`. ✅
- Kept unchanged: Electron UA stripping (not in this codebase's frontend — lives outside `ERP-Client`, untouched by any task), `HashRouter` (untouched), `/me` cache pattern in `AuthContext`/`auth-cache.ts` (untouched — Task 7 only removes dev-bypass lines, not the cache logic), `SSOContinue` (untouched). ✅
- Data flow section (steps 1–4) — matches Task 2's `SSOCallback` implementation exactly. ✅
- Error handling: `auth-flow.ts` functions throw, each page's handler catches once via `clerkErrorMessage` → `toast.error` — every page in Tasks 2–6 follows this. ✅
- Testing section: one `auth-flow.test.ts` for `resolveSignInStatus`'s branches, no broader scaffolding — Task 1; Tasks 2–7 use typecheck + manual QA instead of unit tests, per the design doc's own testing scope. ✅
- Out of scope: `CreateOrganization`/onboarding, user management/invites/RBAC admin, backend — none touched by any task. ✅

**Placeholder scan:** No TBD/TODO markers; every step has literal runnable commands or full file contents. ✅

**Type consistency:** `SignInResource`/`SignUpResource`/`NavigateFn` defined once in `auth-flow.ts` (Task 1) and imported identically by name in every consuming task (2–6) — no renamed variants. `resolveSignInStatus`, `activateSession`, `prepareEmailSecondFactor`, `verifySecondFactor`, `signUpWithPassword`, `prepareEmailVerification`, `verifyEmailCode`, `startGoogleOAuth`, `clerkErrorMessage` are each defined once and referenced under the same name everywhere they're used. ✅
