# Self-Signup (Clerk) — Design

## Problem

`Login.tsx` only implements Clerk sign-in (`signIn.create` with `password` strategy). There is no way for a new user to register — the app assumes every account already exists in Clerk. Org-creation onboarding (`/onboarding/create-org`, `CreateOrganization.tsx`, `ProtectedRoute` redirect on `!user.organization`) already exists and works; it's just never reached because nothing creates new Clerk accounts.

## Decisions made during brainstorming

- **Registration model**: open self-signup. Anyone can create an account.
- **Org association for v1**: sign-up always creates a brand-new organization; the signer-up becomes its admin (reuses the existing `AuthService.createOrganization` call already wired into `CreateOrganization.tsx`).
- **Joining an existing org (by invite code or by email-domain match) is explicitly OUT of scope for this change.** Neither has backend support today:
  - No org "domain" field exists anywhere in the client or backend types.
  - No self-service "join org by code" endpoint exists — `inviteMember` requires an existing admin to invite a specific email first; `Organizations.list()` is a generic authenticated CRUD resource, not a pre-membership lookup.
  - This is a known gap, tracked here, not silently dropped. Follow-up backend work needed: an org "join code"/domain field + a join endpoint, before self-join can be built.
- **Backend is out of scope** for this change entirely (separate repo, not available locally). The plan only touches the Electron renderer.
- **Email verification**: the Clerk instance (native-quetzal-47) requires email OTP verification for password sign-ups. The sign-up flow needs a verification-code step before the session is created.
- **UI structure**: no new route. `Login.tsx` becomes a single component with a `mode` toggle (`sign-in` / `sign-up` / `verify`), switched via a text link, matching how the page already behaves as one self-contained screen.

## Design

### State machine in `Login.tsx`

```
mode: 'sign-in' | 'sign-up' | 'verify'   (default 'sign-in')
```

- **`sign-in`** (existing, unchanged): email + password → `clerk.client.signIn.create({ strategy: 'password', identifier, password })` → on `complete`, `clerk.setActive({ session })`.
- **`sign-up`**: first name, last name, email, password → `clerk.client.signUp.create({ emailAddress, password, firstName, lastName })` → `signUp.prepareEmailAddressVerification({ strategy: 'email_code' })` → switch to `verify`.
- **`verify`**: single 6-digit code field → `clerk.client.signUp.attemptEmailAddressVerification({ code })` → on `status === 'complete'`, `clerk.setActive({ session: signUp.createdSessionId })`. Includes:
  - "Resend code" — re-calls `prepareEmailAddressVerification({ strategy: 'email_code' })`.
  - "Back" — returns to `sign-up` mode to correct email/password (Clerk's `signUp` client resource is stateful; calling `create()` again on retry resets it).

A text link at the bottom of the form toggles `sign-in ↔ sign-up` ("Don't have an account? Sign up" / "Already have an account? Sign in"). Errors in every mode reuse the existing pattern: `error?.errors?.[0]?.longMessage || error?.message || '<fallback>'` via `toast.error`.

### Downstream flow (already built, no changes needed)

Once `clerk.setActive` fires, `AuthContext`'s existing `clerk.addListener` picks up the new session → `refresh()` → `AuthService.getMe()`. Since the user is new, `isOnboarded` is `false` → `AuthService.sync()` runs → `getMe()` again. `user.organization` is `null`, so `ProtectedRoute` redirects to `/onboarding/create-org`, and `CreateOrganization.tsx` handles the rest unchanged.

### Files touched

- `renderer/src/pages/Login.tsx` — only file changed. Add `mode` state, sign-up handler, verify handler, resend/back links, and the mode-toggle link. Reuses existing `Input`, `Label`, `Button`, `toast` primitives. No new files, no new dependencies.

### Error handling

- Duplicate email, weak password, malformed input on sign-up: surfaced via existing toast error pattern from Clerk's `error.errors[0].longMessage`.
- Wrong/expired verification code: same toast pattern; user can resend or go back.
- Any `signUp.status` other than `complete` after verification (e.g. Clerk demands an extra step this UI doesn't support): toast a generic "requires an additional step that isn't supported yet" message, same as the existing sign-in fallback.

### Testing

Real email OTP delivery can't be exercised by an automated check. Verification: run the Electron app, exercise sign-up → real inbox → code entry → confirm redirect to `/onboarding/create-org`, and confirm existing sign-in still works unchanged. TypeScript strict check covers the Clerk API surface used.

### Known follow-up (not built now)

Joining an existing organization via invite code or email-domain match. Needs backend work first: an org join-code/domain field and a self-service join endpoint. Tracked here so it isn't forgotten, not part of this implementation.
