# Phase 0: Self-Signup + Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Scope note (2026-07-24):** This plan started as self-signup only. It now also carries three zero-risk cleanup items (Tasks 2-4) that a since-corrected doc had wrongly claimed were already done — see `docs/superpowers/specs/2026-07-24-erp-implementation-00-overview.md` item 2/5 and `.claude/rules/lessons-learned.md`. They're bundled here because Task 1 already gates on a clean `tsc --noEmit`, so it's cheap to fix while touching that gate. Each task is independent; run in any order, but Task 1 first is recommended since it's the actual feature work.

**Goal:** Let a new user create their own account from the app's login screen (Clerk email/password sign-up with email-code verification), landing them in the existing "create your organization" onboarding as its admin. Plus: delete confirmed-dead code and fix two confirmed-real preexisting typecheck gaps (see Tasks 2-4).

**Architecture:** `Login.tsx` becomes a single component with three modes (`sign-in`, `sign-up`, `verify`) toggled by local state — no new routes, no new files. Sign-up calls Clerk's `signUp.create` then `prepareEmailAddressVerification`; the verify step calls `attemptEmailAddressVerification` and, on success, `clerk.setActive`, which is the same activation call the existing sign-in flow already uses. Everything after that (session listener → `sync` → `/onboarding/create-org` redirect) is existing code and needs no changes.

**Tech Stack:** React + TypeScript (strict), `@clerk/clerk-js` (already installed, v6.25.6), existing `Input`/`Label`/`Button` UI primitives, `sonner` for toasts.

## Global Constraints

- Single file changed: `renderer/src/pages/Login.tsx`. No new files, no new npm dependencies.
- Must pass strict TypeScript: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true` (`renderer/tsconfig.json`).
- Backend (`core-apis-m03n.onrender.com`) is out of scope — do not add calls to endpoints that don't already exist in `renderer/src/services/auth.service.ts`.
- Joining an existing organization (by invite code or email domain) is explicitly out of scope — no backend support exists. Do not build it.
- No automated test runner exists in this project (no jest/vitest configured). Verification is `tsc --noEmit` plus manual click-through, matching how the rest of the renderer is verified.

---

## Task 1: Add sign-up + email-verification modes to Login.tsx

**Files:**
- Modify: `renderer/src/pages/Login.tsx` (full rewrite — currently 85 lines, sign-in only)

**Interfaces:**
- Consumes:
  - `clerk` from `renderer/src/lib/clerk.ts` — the shared `Clerk` instance, already used by the existing sign-in flow (`clerk.client`, `clerk.setActive`).
  - `useAuth()` from `renderer/src/context/AuthContext.tsx` — returns `{ user, loading, logout, refresh }`; this task only reads `user` (unchanged usage).
  - `clerk.client.signUp.create(params)` → `Promise<SignUpResource>`, where `params` accepts `{ emailAddress?: string; password?: string; firstName?: string; lastName?: string }` (from `@clerk/shared` `SignUpCreateParams`).
  - `clerk.client.signUp.prepareEmailAddressVerification(params?)` → `Promise<SignUpResource>`, where `params` is `{ strategy: 'email_code' }`.
  - `clerk.client.signUp.attemptEmailAddressVerification(params)` → `Promise<SignUpResource>`, where `params` is `{ code: string }`.
  - `SignUpResource.status` → `'missing_requirements' | 'complete' | 'abandoned' | null`.
  - `SignUpResource.createdSessionId` → `string | null`.
  - `clerk.setActive({ session })` → already used by the existing sign-in handler; same signature, `session: string`.
- Produces: nothing new consumed by other files — `Login.tsx` is a leaf page component rendered only by `renderer/src/App.tsx:25` (`<Route path="/login" element={<Login />} />`), which does not change.

- [ ] **Step 1: Write the full replacement for `Login.tsx`**

Replace the entire contents of `renderer/src/pages/Login.tsx` with:

```tsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clerk } from '../lib/clerk';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up' | 'verify';

function clerkErrorMessage(error: any, fallback: string): string {
  return error?.errors?.[0]?.longMessage || error?.message || fallback;
}

export default function Login() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
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
      if (signIn.status === 'complete' && signIn.createdSessionId) {
        await clerk.setActive({ session: signIn.createdSessionId });
      } else {
        toast.error(`Sign in requires an additional step (${signIn.status}) that isn't supported yet`);
      }
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      await clerk.client!.signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode('');
      setMode('verify');
      toast.success('Enter the verification code we emailed you');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireClerkClient()) return;
    setLoading(true);
    try {
      const signUp = await clerk.client!.signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (signUp.status === 'complete' && signUp.createdSessionId) {
        await clerk.setActive({ session: signUp.createdSessionId });
      } else {
        toast.error(`Verification requires an additional step (${signUp.status}) that isn't supported yet`);
      }
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!requireClerkClient()) return;
    try {
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success('Verification code resent');
    } catch (error: any) {
      toast.error(clerkErrorMessage(error, 'Failed to resend code'));
    }
  };

  const title =
    mode === 'sign-in' ? 'Sign in to your account' : mode === 'sign-up' ? 'Create your account' : 'Check your email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Core ERP Client</h1>
          <p className="text-muted-foreground">{title}</p>
        </div>

        {mode === 'sign-in' && (
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setMode('sign-up')}
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {mode === 'sign-up' && (
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setMode('sign-in')}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              We sent a verification code to <span className="font-medium">{email}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
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
              <button type="button" className="text-primary underline underline-offset-2" onClick={handleResendCode}>
                Resend code
              </button>
              {' · '}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setMode('sign-up')}
              >
                Back
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
```

Notes on why this is shaped this way:
- `requireClerkClient()` dedupes the "Clerk still starting up" guard that the original file inlined once; now three handlers need it, so it's pulled out (still a one-liner, not a new abstraction layer).
- `clerk.client!` (non-null assertion) is used after `requireClerkClient()` has already returned early on `null` — matches the guard the original code performed inline, just proven once per handler instead of relying on TypeScript narrowing across a separate function call boundary that TS can't track.
- `clerkErrorMessage()` is the exact same fallback chain the original `handleSubmit` used inline (`error?.errors?.[0]?.longMessage || error?.message || fallback`), extracted only because it's now needed in three places — three repeats would be the actual duplication smell here, not two.

- [ ] **Step 2: Type-check**

Run:
```bash
cd renderer && npx tsc --noEmit
```
Expected: no errors (exit code 0). If `firstName`/`lastName`/`emailAddress` are rejected as invalid keys on `SignUpCreateParams`, double check against `node_modules/@clerk/shared/dist/types/signUpCommon.d.ts` — the installed Clerk version's param shape is the source of truth, not this plan.

- [ ] **Step 3: Manual verification (real Clerk instance, real inbox required)**

Start the app:
```bash
npm run dev
```
Then in the Electron window:
1. On the login screen, click "Sign up". Fill first name, last name, a real email you can receive mail at, and a password. Submit.
2. Confirm the screen switches to "Check your email" and a 6-digit code arrives in that inbox within ~1 minute.
3. Enter the code and submit. Confirm you land on `/onboarding/create-org` (the existing "Create Your Organization" screen) — this confirms `AuthContext`'s session listener, `sync()`, and `ProtectedRoute` redirect all still work unchanged.
4. Create the organization and confirm you land on the dashboard (`/`).
5. Sign out, then sign back in with the same email/password on the "Sign in" tab — confirm the original sign-in flow still works unchanged.
6. Try signing up a second time with the same email — confirm Clerk's duplicate-email error surfaces as a toast (via `clerkErrorMessage`), not a silent failure or unhandled exception in the console.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/pages/Login.tsx
git commit -m "$(cat <<'EOF'
Add self-signup with email verification to Login page

Toggles Login.tsx between sign-in, sign-up, and verify-code modes
using Clerk's signUp.create / prepareEmailAddressVerification /
attemptEmailAddressVerification. Reuses the existing create-org
onboarding and session-sync flow unchanged.
EOF
)"
```

---

## Task 2: Delete dead `*View.tsx` components

**Files:**
- Delete: `renderer/src/components/BillsView.tsx`, `CategoriesView.tsx`, `ChangePasswordView.tsx`, `DashboardView.tsx`, `InventoryView.tsx`, `NotificationsView.tsx`, `OrganizationsView.tsx`, `PaymentsView.tsx`, `ProductsView.tsx`, `PurchaseOrdersView.tsx`, `SetPinView.tsx`, `SettingsView.tsx`, `StoresView.tsx`, `SuppliersView.tsx` (14 files)
- Do NOT touch: `VehiclesView.tsx`, `VehicleDetailView.tsx` — these two are still imported by `pages/VehiclesPage.tsx` and `pages/VehicleDetailPage.tsx` respectively and are live code (Vehicles-stays-mock decision).

**Verification:** Before deleting each file, confirm zero importers with `grep -rl "<ComponentName>" renderer/src --include="*.tsx" --include="*.ts"` (excluding the file itself). All 14 were confirmed dead on 2026-07-24; re-check if time has passed since, in case something started importing one.

- [ ] Delete the 14 files listed above.
- [ ] `cd renderer && npx tsc --noEmit` — expect no new errors (deleting unused files shouldn't break anything referencing them, since nothing does).

## Task 3: Remove unused runtime/dev dependencies

**Files:**
- Modify: `package.json` (root)

**Verification:** None of `axios`, `express`, `cors`, `express-rate-limit`, `serialport`, `@electron/rebuild` are imported anywhere in `src/` or `renderer/src/` (confirmed 2026-07-24 via repo-wide grep). The `rebuild` script (`electron-rebuild -f -w serialport`) only exists to rebuild `serialport`'s native bindings — pointless once `serialport` is removed.

- [ ] Remove `axios`, `express`, `cors`, `express-rate-limit`, `serialport` from `dependencies`.
- [ ] Remove `@electron/rebuild` from `devDependencies`.
- [ ] Remove the `"rebuild": "electron-rebuild -f -w serialport"` script.
- [ ] Run the package manager's install command (`npm install` or equivalent) to update the lockfile.
- [ ] `npm run build` (or equivalent) still succeeds — confirms nothing else silently depended on these.

## Task 4: Fix the two preexisting typecheck gaps

**Files:**
- Modify: `package.json` (root) — add missing dependency
- Modify: `src/main/preload.ts` — remove unused type

**Verification:** `src/main/database.ts:1` does `import Database from 'better-sqlite3'` but `better-sqlite3` is absent from `package.json` (confirmed via grep, 2026-07-24) — this only works today because some transitive dependency happens to hoist it into `node_modules`, which is fragile. `src/main/preload.ts:6` declares `type IpcResult<T = void> = IpcSuccess<T> | IpcError` and it's never referenced again in that file (confirmed via grep — 1 total occurrence).

- [ ] Add `better-sqlite3` to `package.json` `dependencies` at whatever version is currently resolved in `node_modules/better-sqlite3/package.json`, then `npm install`.
- [ ] Delete the unused `IpcResult` type declaration (and its now-possibly-unused `IpcSuccess`/`IpcError` dependents, if those also become unused) from `src/main/preload.ts`.
- [ ] `npx tsc --noEmit` across both `tsconfig.json` (main) and `renderer/tsconfig.json` — expect no errors.

---

## Follow-up (not part of this plan)

Joining an existing organization by invite code or email-domain match needs backend work first (an org join-code/domain field plus a self-service join endpoint) — see `docs/superpowers/specs/2026-07-24-self-signup-design.md` for details. Do not attempt it as part of this plan.
