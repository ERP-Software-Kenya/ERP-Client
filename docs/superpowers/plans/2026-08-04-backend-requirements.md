# Backend Requirements — User Management + Stock Transfer

**Date:** 2026-08-04
**Status:** Frontend built and committed against these contracts already (both features, `ERP-Client` commit `b87107e` on branch `feat-user-manage`). Everything below is what backend (`core-apis`) still needs to deliver for the frontend to actually work end to end.
**Full implementation detail:** every item below has a complete, code-level task (exact files, exact code to write, tests) in one of these two plans — this doc is the contract summary, those are the how-to. An implementing agent should read the relevant plan task, not just this file:
- `docs/superpowers/plans/2026-08-04-user-management.md`
- `docs/superpowers/plans/2026-08-04-stock-transfer-redesign.md`

Frontend code that depends on something here is marked with a `// NEEDS BACKEND: ...` comment pointing back to this file — grep for that string in `ERP-Client/renderer/src` to find every call site.

## Setup for whoever/whatever implements this

- Repo: `core-apis`, branch `feat-user-manage` (already exists, already fast-forwarded to `develop`).
- That branch already has commit `9e986ca` — the `org_member` migration + entity change from user-management plan Task 1. **Do not redo it.** It has not been run against a live DB yet — do that first (`npm run migration:run` or whatever the actual script name is in `package.json`) and confirm before starting anything that depends on the new columns/indexes.
- Everything else below (Tasks 2–4, 6 of the user-management plan; Tasks 1–2 of the stock-transfer plan) is unstarted.
- Work task-by-task from the two plans in the "Suggested order" at the bottom of this file — each plan task is self-contained (exact file paths, full code, tests, commit message) and assumes zero prior context.

---

## User Management

### ✅ Already done
Migration + entity change (`core-apis`, branch `feat-user-manage`, commit `9e986ca`): `org_member.user_id` is now nullable, `invited_email`/`invited_at` columns added, `EOrgMemberStatus` enum (`active`/`invited`) added, two partial unique indexes replace the old single unique index. **Not yet verified against a live DB** — the migration was written but couldn't run (local Postgres unreachable at the time). Run it and confirm before building on it.

### ⬜ `POST /api/v1/auth/invite` — fix, don't add
Exists today at `core-apis/src/application/modules/auth/auth.controller.ts` but rejects any email not already in `UserEntity`, and never actually sends an email (just writes a DB row). Needs:
- Accept emails with no existing `UserEntity` row → create a pending `org_member` (`userId: null, invitedEmail: <email>, status: 'invited'`).
- Actually call Clerk to send the invite (`IClerkService.inviteUserAsync`, already implemented in `core-apis/src/common/auth/clerk.service.ts:65-72` — just wasn't being called from this handler).
- Full code: user-management plan, Task 2.

### ⬜ `GET /api/v1/auth/members` — new
Frontend already calls this (`ERP-Client/renderer/src/api.ts`, `OrgMembers` resource; used in `Users.tsx` and `PendingInvitesPanel.tsx`).

Query params: `$page` (default 1), `$perPage` (default 15), `search` (matches against name/email/invited-email, case-insensitive substring).

Response:
```json
{
  "items": [{
    "id": "uuid",
    "firstName": "string | null",
    "lastName": "string | null",
    "email": "string | null",
    "phone": "string | null",
    "createdAt": "ISO date string | null",
    "isActive": "boolean | null",
    "role": "string",
    "status": "'active' | 'invited'",
    "invitedEmail": "string | null"
  }],
  "total": "number",
  "page": "number",
  "perPage": "number",
  "totalPages": "number"
}
```
`firstName`/`lastName`/`email`/`phone`/`createdAt`/`isActive` are `null` for pending (`status: 'invited'`) rows — those rows only have `invitedEmail`. Scoped to the current user's organization (from the auth token), not a request param.

Full code: user-management plan, Task 4.

### ⬜ `DELETE /api/v1/auth/members/:id` — new
Revokes a pending invite (hard-deletes the `org_member` row). `404` if not found or not in this org, `400` if the row isn't `status: 'invited'` (can't revoke an already-active membership through this endpoint). Frontend: `PendingInvitesPanel.tsx`'s Revoke button.

Full code: user-management plan, Task 6.

### ⬜ Sign-in reconciliation + phone sync
`SyncUserCommandHandler` (`core-apis/src/application/modules/auth/commands/sync-user/`) runs on every Clerk sign-in but never claims pending invites and never syncs `phone`. Needs: after upserting the user, find any `org_member` rows with matching `invitedEmail` and `status: 'invited'`, set `userId`, clear `invitedEmail`, `status: 'active'`. Also pass `phone` from the Clerk JWT payload through to the user upsert (currently dropped).

This is what makes an invited person's row flip from "Pending" to a real active member with their name/phone/created-date once they actually sign up — without it, every invite stays pending forever even after acceptance.

Full code: user-management plan, Task 3.

---

## Stock Transfer

### ⬜ `GET /api/v1/stock-transfers` — new
Frontend already calls this (`ERP-Client/renderer/src/api.ts`, `StockTransfers.useSearch`; used in `StockTransfers.tsx` for the history table — currently shows a permanent load error without this).

Query params: `$page`, `$perPage`, `search` (substring match against `transferNumber`).

Response: same `{ items, totalCount, page, perPage, totalPages }` shape as other paginated list endpoints in this codebase (e.g. `ProductsController`'s search route). Scoped to the current user's organization.

Simpler than the user-members endpoint — `StockTransferEntity` has no cross-relation search need, the existing generic `pagedAsync`/`Filter` repo mechanism covers it with one small override for the `search` param. Full code: stock-transfer plan, Task 2.

### ⬜ `PUT /api/v1/stock-transfers/:id/complete` — fix existing
Two gaps in `CompleteStockTransferCommandHandler` (`core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/`):

1. **Destination inventory resolution.** The endpoint currently requires the caller to supply `toInventoryId` — a real, already-existing `InventoryEntity` row id. That's impossible to know client-side when the target location has never stocked this product before (no row exists yet). The frontend now omits `toInventoryId` entirely (`ERP-Client/renderer/src/pages/StockTransfers.tsx`) — the handler needs to resolve an existing row by `(organizationId, toLocationId, productId)` or create a new zero-stock one, before calling the orchestrator.
2. **Item logging.** `StockTransferItemEntity` (`quantitySent`/`quantityReceived`) is never written anywhere today — the table exists, nothing populates it. Insert one row per completed item after the orchestrator runs.

Note: source-stock validation does **not** need new code — `InventoryRepo.deductStockAsync` (`core-apis/src/infrastructure/persistence/repositories/inventory.repo.ts:81-87`) already throws `BadRequestException` if the requested quantity exceeds on-hand stock. That guard already fires through this same endpoint.

Full code: stock-transfer plan, Task 1.

---

## Suggested order
1. Verify the already-written migration runs clean (User Management "already done" item above).
2. `GET /api/v1/auth/members` and `GET /api/v1/stock-transfers` — unblock both frontends' list views first, highest visible impact.
3. Invite fix + sign-in reconciliation — unblocks the invite flow actually working end to end.
4. Stock transfer complete-endpoint fixes — unblocks transferring into a never-stocked location.
5. Revoke-invite endpoint — smallest, lowest urgency.
