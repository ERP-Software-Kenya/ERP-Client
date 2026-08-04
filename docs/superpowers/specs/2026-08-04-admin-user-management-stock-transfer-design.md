# Administration User Management & Stock Transfer Redesign

**Date:** 2026-08-04
**Scope:** Both repos — `core-apis` (backend) and `ERP-Client` (`renderer`, frontend)
**Status:** Approved in brainstorming; awaiting implementation plan
**Supersedes:** The "User management" and "Stock transfer redesign" sections of `ERP-Client/TODO-4-features.md` (both listed there as "not started" — this doc is the design for finishing them). Location dashboard and SKU auto-generation are tracked separately and are NOT part of this doc.

## Context

These are the same two feature requests originally captured 2026-08-03 (org-scoped user list + pending invites, product-first stock transfer with animation + logging). Verified against actual code on 2026-08-04 before designing anything further — see Key Findings below, several assumptions from the 2026-08-03 plan needed correction.

## Key Findings (verified 2026-08-04, not carried over from prior-session memory)

- A same-day commit (`9895715`, `feat: implement Clerk user management APIs (CQRS)`, by a teammate) added `/api/v1/users/clerk/*` endpoints backed by Clerk's own user store. **This is not the foundation for this feature.** It has no phone number field, no org-scoped invitations, no way to list pending invites, and — critically — `RolesGuard` (`core-apis/src/common/auth/guards/roles.guard.ts:28`) grants real permissions from the DB (`org_member.role` / `user_role`), not from Clerk's `publicMetadata.roles`. Writing roles via that API would not actually grant permissions. Left untouched, unused by this feature.
- `UserEntity` (`core-apis/src/infrastructure/persistence/entities/user.entity.ts`) already has `firstName`, `lastName`, `email`, `phone`, `isActive`, `createdAt` — everything the requirement needs, no new columns required there.
- `OrgMemberEntity` (`core-apis/src/infrastructure/persistence/entities/org-member.entity.ts`) has `userId` (NOT NULL today), `roleId`, `status` (free string, default `'active'`) — needs the nullable-`userId` + `invitedEmail`/`invitedAt` migration from the 2026-08-03 plan; that part of the old plan still holds.
- `InviteMemberCommandHandler` (`core-apis/src/application/modules/auth/commands/invite-member/invite-member.command-handler.ts:24-28`) currently throws `ConflictException` for any email not already in `UserEntity` — invites to brand-new people are impossible today. It also never actually sends an email; it only creates a DB row.
- `org_member.status` is set to `'invited'` on creation and **nothing in the codebase ever transitions it** — grepped for `EOrgMemberStatus`, `'active'` transitions: none found. The reconciliation-on-signup logic assumed complete by the 2026-08-03 plan was never built.
- `SyncUserCommandHandler` (`core-apis/src/application/modules/auth/commands/sync-user/sync-user.command-handler.ts`) does not sync `phone` from Clerk today.
- Stock transfer backend/frontend status is unchanged since the 2026-08-03 audit (no commits touched `stock-transfers` module or `StockTransfers.tsx` since): create/complete/cancel exist, no list endpoint, no source-stock validation on create, `StockTransferItemEntity` unpopulated, frontend is a location-first `FormDrawer` with in-memory `sessionIds` history and no completion animation. Logging (`StockMovement` + `ActivityLogEntity` via `StockOrchestrationService`) is already complete and needs no changes.

## Feature 1: User Management

**Architecture:** DB-native, built on `OrgMemberEntity` ⋈ `UserEntity` ⋈ `RoleEntity`. This is the source of truth `RolesGuard` already reads from.

### Schema migration (`core-apis`)
- `org_member.user_id` → nullable
- Add `org_member.invited_email` (varchar, nullable), `org_member.invited_at` (timestamp, nullable)
- Replace unique index `(org_id, user_id)` with two partial unique indexes: `(org_id, user_id) WHERE user_id IS NOT NULL` and `(org_id, invited_email) WHERE invited_email IS NOT NULL`

### Backend changes
- `InviteMemberCommandHandler`: remove the `ConflictException` block on unregistered emails. If the email matches an existing `UserEntity`, create the membership as today. If not, create a pending row (`userId=null, invitedEmail=email, invitedAt=now, status='invited'`) and call Clerk to send an actual invitation email.
- `SyncUserCommandHandler`: after upserting the user, look up any `org_member` row with matching `invitedEmail` and `status='invited'`; reconcile — set `userId`, clear `invitedEmail`, `status='active'`, `joinedAt=now`. Also sync `phone` (currently dropped).
- New `ListOrgMembersQuery` / `SearchOrgMembersQuery` + controller endpoints — join `org_member` → `user` + `role`, eager-loaded. Returns firstName/lastName/email/phone/createdAt/isActive/role/status; pending rows return `invitedEmail` in place of name/phone.

### Frontend (`ERP-Client`)
- `Users.tsx`: replace the current "API gap" placeholder with a real table — columns: name, email, phone, created at, role, active/pending status.
- Search bar unchanged in position. **Invite User** button next to it opens a form: email + role dropdown (the 4 fixed `ERole` values: SuperAdmin, OrgAdmin, StoreManager, StoreStaff).
- New gear-icon button next to search opens a **side panel** listing pending (`status='invited'`) rows, each with resend/revoke actions.

### Error handling
- Invite to an email already an active member → 409 (existing check covers this).
- Invite to an email already pending → resend instead of creating a duplicate row.

### Testing
- Unit test: `SyncUserCommandHandler` reconciliation claims a matching pending row and leaves non-matching ones untouched.
- Unit test: partial-unique-index behavior at the repo layer — same email can't be invited twice while pending.

## Feature 2: Stock Transfer Redesign

**Scope:** single product per transfer (confirmed — narrows today's multi-line capability). Logging is already complete via `StockOrchestrationService`; no changes needed there.

### Backend changes (`core-apis`)
- `GET /inventory/by-product/:id` — new endpoint: all locations currently holding stock for a product (location id/name + quantityOnHand).
- `GET /stock-transfers` — new list/search endpoint (org-scoped, paginated), replacing the frontend's in-memory `sessionIds` history hack.
- `CreateStockTransferCommandHandler`: add source-location stock validation — reject if requested quantity exceeds `quantityOnHand` at the chosen source (currently no check at all).
- `CompleteStockTransferCommandHandler`: populate the currently-unused `StockTransferItemEntity` rows (`quantitySent`/`quantityReceived`) on completion.

### Frontend (`ERP-Client`)
- New **Transfer Stock** button opens a modal (replacing the `FormDrawer`): select product → modal shows locations holding stock (from the new by-product endpoint) → pick source location + quantity → pick target location → **Transfer Stock** button.
- On confirm: short GPay-style success animation while create+complete calls run, then a confirmation state in the same modal before closing.
- Persisted **transfer history** list/table on the page, backed by `GET /stock-transfers`, replacing in-memory session tracking.

### Error handling
- Insufficient source stock → inline validation in the modal before submit (client-side, against the by-product endpoint's quantities) AND server-side rejection as a backstop for races.

### Testing
- Unit test: `CreateStockTransferCommandHandler` source-stock validation — reject over-quantity, accept exact/under.

## Out of scope
- Deleting or modifying the same-day Clerk-native `/api/v1/users/clerk/*` endpoints — left as-is, just unused by this feature.
- Location dashboard, SKU auto-generation — tracked separately (SKU auto-gen is an active in-progress task as of this doc's writing).
