# Auth Rebuild: Login, Sign-up, Google OAuth — Design

Date: 2026-08-13
Scope: `ERP-Client` (renderer) frontend + `core-apis` backend auth module

## Context

The current auth flow (`renderer/src/pages/Login`, `SSOCallback`, `SSOContinue`, `context/AuthContext.tsx`) is a hand-rolled custom flow on `@clerk/clerk-js` (headless SDK — required because the app runs in Electron over `file://` with `HashRouter`, which rules out Clerk's prebuilt `<SignIn>`/`<SignUp>` components built for standard web routing).

A cross-referencing pass against Clerk's docs found a real gap: `SSOCallback` only branches on `signUp.status === 'missing_requirements'` and `clerk.session` after `handleRedirectCallback()`. It never checks `signIn.status === 'needs_second_factor'`. An existing user with MFA enabled who signs in with Google hits the fallback branch ("Google sign-in did not create a session — try again") and gets stuck, because the second-factor UI (`beginSecondFactor` in `Login/index.tsx`) is only wired to the password sign-in path. (Logged in `ERP-Client/.claude/rules/lessons-learned.md`, 2026-08-13 entry — a prior session's memory claimed this was already fixed; it wasn't, and `git log` shows only one commit touching either file.)

This rebuild fixes that gap and, per user direction, rewrites both the frontend flow and the backend auth module cleanly — the backend rewrite preserves every endpoint, DTO shape, and security property unchanged (it was security-hardened on 2026-08-11/12, S95/S100); only the frontend gets new behavior.

## Frontend design

### Routes (all lazy-loaded, registered in `App.tsx`)

| Route | Component | Purpose |
|---|---|---|
| `/login` | `SignIn` | Password sign-in form + "Continue with Google" |
| `/signup` | `SignUp` | Password sign-up form (replaces the mode-toggle inside old `Login`) |
| `/verify-email` | `VerifyEmail` | Email-code verification after password sign-up |
| `/verify-second-factor` | `VerifySecondFactor` | Email-code 2FA, reached from **either** password sign-in or Google OAuth |
| `/sso-callback` | `SSOCallback` | Google OAuth redirect target (rewritten) |
| `/sso-continue` | `SSOContinue` | Kept as-is — OAuth sign-ups missing required profile fields |

`/verify-email` and `/verify-second-factor` read the pending Clerk resource fresh from `clerk.client.signUp` / `clerk.client.signIn` on mount, the same pattern `SSOContinue` already uses — Clerk's client singleton holds this state across navigations, so no extra app-level state is needed.

### Shared orchestration module: `renderer/src/lib/auth-flow.ts`

Every `clerk.client.signIn`/`signUp` call and all status-branching logic lives here as plain exported functions (not a hook — this is async orchestration, not reactive state). Replaces the copy-pasted `clerkErrorMessage` and `activateSession` currently duplicated across `Login/index.tsx` and `SSOContinue/index.tsx`.

Key export — `resolveSignInStatus(signIn, { navigate, refresh })`:
- `status === 'complete'` → `activateSession()` (Clerk `setActive` + `AuthContext.refresh()`) → navigate `/`
- `status === 'needs_second_factor'` → `prepareEmailSecondFactor(signIn)` (fires the email code) → navigate `/verify-second-factor`
- anything else → throw/report, caller shows a toast

**This is the fix.** Both `SignIn`'s password submit handler and `SSOCallback` (after `handleRedirectCallback()`) call this same function, so the Google OAuth path now reaches the same 2FA screen the password path already has.

Other exports: `prepareEmailSecondFactor`, `verifySecondFactor`, `signUpWithPassword` → `prepareEmailVerification`, `verifyEmailCode`, `startGoogleOAuth`, `clerkErrorMessage`.

### Dropped vs. kept (per requirements gathering)

- Dropped: `VITE_DEV_BYPASS_AUTH` dev-bypass mode; phone-code and TOTP second-factor support (email-code only going forward).
- Kept unchanged: Electron user-agent stripping for Google OAuth (bypasses Google's in-app-webview blocklist), `HashRouter`, the `/me` localStorage cache-first pattern in `AuthContext`/`lib/auth-cache.ts` (consumes `MeResponse` — untouched by this rebuild).

## Backend design (`core-apis`)

Matched-pair rewrite — same public contract, freshly written files, zero behavior change:

- `ClerkJwtStrategy` — same JWKS validation (`passport-jwt` + `jwks-rsa`), same email resolution (JWT claim first, else Clerk API lookup preferring primary → verified email), same DB user/role enrichment (system roles + org-member roles merged).
- `ClerkAuthGuard` — same `AllowAnonymous` bypass, same `UnauthorizedException` on missing/invalid token.
- `RolesGuard` — unchanged RBAC check.
- `AuthController` — same 5 endpoints/DTOs: `POST /auth/token` (dev/local/test-only, existing allow-list gate — never reachable in production), `POST /auth/sync`, `POST /auth/organizations`, `POST /auth/invite` (RolesGuard + OrgAdmin/SuperAdmin), `GET /auth/me`.
- Commands/queries (`SyncUserCommand`, `OnboardOrganizationCommand`, `InviteMemberCommand`, `GetMeQuery`, `GetTokenQuery`) — same CQRS structure/handlers per this repo's `backend-rules.md`.

No new endpoints: Clerk's 2FA/email-verification challenge is entirely client-side against Clerk's hosted infra — the backend only ever sees a final valid JWT, so the OAuth-2FA fix is 100% frontend. Every org-scoping / cross-tenant guard from the 2026-08-11/12 security audits (S95, S100) carries over exactly as implemented.

## Data flow — Google OAuth with existing 2FA user (the bug being fixed)

1. `/login` → "Continue with Google" → `clerk.client.signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: '.../#/sso-callback' })`.
2. Google redirects back → `SSOCallback` calls `clerk.handleRedirectCallback()`.
3. `SSOCallback` calls `resolveSignInStatus(clerk.client.signIn, ...)`:
   - `complete` → activate session → navigate `/`.
   - `needs_second_factor` → prepare email code → navigate `/verify-second-factor`.
   - `clerk.client.signUp?.status === 'missing_requirements'` (new-user case, existing behavior, unchanged) → navigate `/sso-continue`.
4. `/verify-second-factor` submits the code via `clerk.client.signIn.attemptSecondFactor()`, activates the session on success.

## Error handling

`auth-flow.ts` functions throw Clerk's native error shape; each page's submit handler catches once and calls `clerkErrorMessage(error, fallback)` → `toast.error(...)`. No silent catches. `SSOCallback`'s fallback branch (status matches none of the known cases) surfaces a toast and returns to `/login` rather than hanging — same behavior as today.

## Testing

`resolveSignInStatus` is the one piece of real branching logic (3-way status switch driving two different navigations) — gets a small `auth-flow.test.ts` with fake `signIn`/`signUp` objects asserting each branch triggers the right side effect. No broader test scaffolding — the rest is thin UI glue exercised by using the app.

## Out of scope

- Organization creation/onboarding (`CreateOrganization` page, `/onboarding/create-org` route) — separate subsystem, untouched.
- User management, invites UI, RBAC admin pages — untouched.
- Backend functional/security changes beyond preserving existing behavior in freshly written files.
