# Phase 5 — Roles & Access

**Depends on:** Phase 1 (foundation).
**Spec sections referenced:** §2.8 (Roles), §3.3/§5.3 references to Branch Staff location restriction.

## 1. Goal

Spec wants: Admin (all locations, all modules) and Branch Staff (restricted to assigned location, all modules within it), spec explicitly says more granular roles can come later without restructuring. Reconcile this against **three separate, currently-disconnected identity systems already in the codebase**:

1. **Clerk** (`lib/clerk.ts`, `AuthContext.tsx`) — cloud auth, drives login. `MeResponse` includes `membership.roleId` and a `roles: string[]` array.
2. **Backend Role/UserRole resources** (`/api/v1/roles`, `/api/v1/user-roles`) — `Role` has `organizationId, name, permissions: object` (a free-form permissions blob, structure undocumented). `UserRole` links `userId` to `roleId`.
3. **Local SQLite `users` table** (`src/main/database.ts`, managed by `UsersManagement.tsx`) — a completely separate PIN-based admin/operator system for shared-terminal lock-screen switching, unrelated to Clerk or the backend Role system.

These three were **not designed together** — this phase is as much a reconciliation/decision task as an implementation one.

## 2. Current state

- Clerk handles who's logged in and which organization they belong to (`ProtectedRoute.tsx` gates on this).
- Backend `Roles`/`UserRoles`: create + get-by-id only, no list — same structural blocker as Phases 3/4. Can't build a Roles management screen without a list endpoint.
- `Api.Users` isn't wired at all yet (Phase 1 §5 item 7 fixes the plumbing; this phase decides what to build on top of it).
- Local SQLite roles (`admin`/`operator`) are a real, working, independent system today (`AppUserRole` type) — used for physically shared terminals where operators PIN-switch without re-logging into Clerk. This is likely solving a different problem (device-level access, not business-role permissions) and probably shouldn't be conflated with the spec's Admin/Branch-Staff concept.

## 3. What to actually build now vs. blocked

**Blocked:** any Roles/UserRoles browsing screen — no list endpoint, same issue as every other create-only resource in this plan.

**Buildable now:**
- Create a Role (`organizationId, name, permissions`) — but the `permissions: object` shape is undocumented. **Do not invent a permissions schema speculatively** — this needs an explicit decision (see §5) about what the object should contain (e.g., `{ locations: ['*'] | string[], modules: string[] }` to match spec's Admin-sees-all vs Branch-Staff-sees-own-location model) before a form can meaningfully be built. Building a generic JSON-blob editor is the fallback if no structured decision is made, but that's a poor UX for a "permissions" field.
- Assign a UserRole (`userId, roleId`) — same caveat, needs `Api.Users` wired (Phase 1) and ideally a way to pick from existing roles (blocked by no Role list — so this screen would need free-text role ID entry until that's fixed, which isn't good UX; recommend deferring UserRole assignment UI until Roles has a list endpoint).

## 4. Recommendation

This phase has the least "just build it" work of the six and the most "get a decision" work. Two decisions needed before writing code:

1. **What does `Role.permissions` actually contain?** Suggest matching spec §2.8 directly: `{ scope: 'all' | 'own-location', locationIds?: string[] }` for this round (Admin vs Branch Staff only, spec explicitly defers granular roles). This is a recommendation, not something to build without confirmation, since it's effectively defining a new backend contract.
2. **Is the local SQLite PIN system meant to stay independent** (device lock-screen convenience layer, orthogonal to business permissions), or should it eventually be replaced by the Clerk+backend Role system? Recommend: leave it alone, it's solving a different problem (shared-terminal physical access) and touching it isn't in scope for an inventory/purchase/sales spec.

## 5. Open questions for this phase

- Confirm the intended shape of `Role.permissions` before building any Role create/edit form (§4 point 1).
- Confirm the local PIN system should remain untouched (§4 point 2) — if wrong, this phase's scope changes significantly.
- Should Branch Staff location-restriction actually be enforced client-side (hide other locations' data), server-side (API refuses cross-location requests), or both? Given the backend doesn't appear to have location-aware auth today (no evidence of it in the OpenAPI spec), this may itself be a backend gap worth flagging alongside the others.

## 6. Done when

- [ ] `Api.Users` wired (from Phase 1) and a basic Users screen exists — create + detail-by-id only, matching the rest of this doc's resources: `/api/v1/users` has no list endpoint either (see overview doc §4, "create + get-by-id only" group), so no Users directory table is possible yet.
- [ ] Role.permissions shape decided and documented (not guessed).
- [ ] Role create form works against that shape.
- [ ] UserRole assignment explicitly deferred with reasoning, or built against a manual-role-ID-entry fallback if urgency demands it now.
