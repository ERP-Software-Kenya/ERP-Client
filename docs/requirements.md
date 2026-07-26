# ERP Client — Requirements (authoritative)

**Status:** Active — supersedes `inventory_management_spec.md` (repo root) as the working target.
**Date:** 2026-07-24 (capability matrix independently re-verified against real source same day, after an earlier draft of this doc wrongly claimed a nonexistent path and completed work that hadn't been done — see `.claude/rules/lessons-learned.md`)
**Source of truth:** `core-apis` source (`D:\WorkSpace\core-apis`, sibling of this repo; org `ERP-Software-Kenya/core-apis`), read directly — not the deployed API, not assumption. A duplicate checkout exists at `D:\urban\core-apis` (same commit); treat `D:\WorkSpace\core-apis` as canonical.

## 1. Why this doc exists, and how it relates to `inventory_management_spec.md`

`inventory_management_spec.md` describes an aspirational data model — Unit Library, dynamic Tax Groups, per-item Batch/Serial/Expiry, Bundle↔Piece conversion, Customer/Supplier credit ledgers, stock valuation method. None of that exists in `core-apis` today (verified below, §4). Building against it would mean building UI for a backend that doesn't exist.

This doc splits that ambition into two tracks:
- **§2–§3: what "fully functional" means now** — every screen backed by the real, current `core-apis` contract.
- **§4: the backend roadmap** — the `inventory_management_spec.md` concepts, preserved as future work, not dropped.

## 2. Current backend capability (verified from `core-apis` source, 2026-07-24)

Verified by grepping every `*.controller.ts` for `@Get/@Post/@Put/@Delete` decorators and cross-checking each module's `queries/` folder for a `list-*`/`search-*` handler.

**Full CRUD + list/search (12 resources)** — list, get-by-id, create, update, delete all exist:
Bills, Categories, Inventory, ItemReturns, Notifications, Organizations, PaymentTransactions, Products, PurchaseOrders, ReportGenerationLogs, Stores, Suppliers.

**2026-07-26 correction — "full CRUD" here only ever meant "the controller has the right decorators," never "the DTOs carry the resource's real fields."** Confirmed broken so far: PurchaseOrders (DTOs only expose `name`), Bills (DTO field set is entirely disconnected from the entity), PaymentTransactions (`orgId`/`organizationId` mismatch) — see `docs/core-apis-fixes.md` #0/#0c/#0d. ItemReturns is confirmed *not* to have this class of bug and still 500s live anyway, suggesting a further, shared cause on top of this. Treat every resource in this list as unverified for real-field round-tripping until independently checked.

**Create + get-by-id only, no list, no update, no delete (12 resources)**:
ActivityLogs, Customers, Expenses, Invoices, Orders, PlatformConfigurations, PurchaseItems, Roles, StockMovements, StockTransfers, UserRoles, Users.

For this group, no browsable table is possible without a backend change. Stock-movement/stock-transfer/activity-log immutability (no update/delete) looks intentional — audit-trail entities shouldn't be editable — so only the missing **list** endpoint is a real gap for those three; Customers/Expenses/Invoices/Orders/PlatformConfigurations/PurchaseItems/Roles/UserRoles/Users are missing all of list/update/delete.

**No backend at all**: `vehicles` — no entity, no controller, nothing in `core-apis/src`. The client's Vehicles/Fleet screen runs entirely on in-memory mock data (`VehiclesView.tsx`'s `MOCK_STORE`). **Decision (confirmed 2026-07-24): leave as-is.** Not a bug to fix, not a feature to build out this round.

**Real entity field shapes** (`renderer/src/types.ts`, header-noted as matched against real API responses): see that file directly rather than duplicating it here — it drifts with the API and this doc shouldn't fork from it.

## 3. What "fully functional" means for this round

1. **Every one of the 12 full-CRUD resources gets working Add/Edit/Delete in the UI**, wired to real `POST`/`PUT`/`DELETE` calls. **Built 2026-07-25** (Phase 1, commit `116c799`): all 12 pages exist with mutation calls wired through `api.ts`. **Not yet verified end-to-end**: list/mutation calls on 8 of the 12 resources 500 against the deployed backend for new orgs. Narrowed to `core-apis`'s shared `BaseReadOnlyRepo.pagedAsync()` code path, but the exact crash line is **not yet confirmed** (no server stack trace pulled) — see `docs/core-apis-fixes.md` §1. **Worse than that for PurchaseOrders specifically (found 2026-07-26)**: its create/update/response DTOs only expose a `name` field — `supplier_id`/`store_id`/`total_amount`/`status`/`ordered_at`, which `PurchaseOrders.tsx` was built against, don't exist on the API at all. See `docs/core-apis-fixes.md` §0. The capability matrix below only checked that `@Get/@Post/@Put/@Delete` decorators exist per controller — it never checked whether the DTOs actually carry the resource's real fields, so this failure mode hasn't been ruled out for the other 11 "full CRUD" resources either. This is a `core-apis`-side issue, not fixable from this repo. Blocks calling Phase 1 done until it's root-caused, fixed, and the UI is re-tested.
2. **Two orphaned nav entries get fixed**: `users` and `reports`. `getApiClient()` in `ModulePage.tsx` resolves `'users'` → `Api.Users` and `'reports'` → `Api.Reports`, and neither is exported from `api.ts` — both screens currently render silently empty.
   - `users`: `/api/v1/users` exists (create + get-by-id only, §2) — build a minimal screen matching that capability (no directory table possible; see §2's caveat).
   - `reports`: no `/api/v1/reports` endpoint exists at all, only `/report-generation-logs`. Either repoint the nav entry at `ReportGenerationLogs` (which already has full CRUD) or remove the `reports` nav entry — this needs a decision, not a guess (see §5).
3. **The 12 create-only resources get the best UI their backend allows**: a create form plus get-by-id detail view, no list/edit/delete controls. Do not fake a table with client-side pagination over an endpoint that can't list — that produces a screen that looks functional and silently only ever shows one record.
4. **Roles/access reconciliation** (see §5) — three separate, currently-disconnected identity systems exist (Clerk, backend Role/UserRole, local SQLite PIN accounts) and need an explicit decision before any Role-management UI is built.

## 4. Backend roadmap (from `inventory_management_spec.md`, not built, not dropped)

| Spec concept | Backend today |
|---|---|
| Unit Library (base/derived units, conversion factor) | `Product.unit` is a single free-text string. No unit entity, no conversion, no per-item unit variants. |
| Tax Group / HSN / CGST-SGST-IGST engine | No tax fields anywhere. |
| Batch/Serial/Expiry (optional per item) | Not present on any entity. |
| Customer/Supplier credit (limit, days, opening balance) | `Customer`/`Supplier` have only name/email/phone/status. No receivables/payables ledger. |
| Location `type` (Warehouse/Branch) / `state` | `Store` has only name/code/address/organization_id/status. |
| Bundle ↔ Piece conversion | No unit-variant concept, so nothing to convert between. |
| Stock valuation method (FIFO/weighted avg) | `StockMovement` has quantity/type/reason only, no cost. |
| Vehicle/Fleet | No entity or controller at all (§2). |
| Subscription/plan billing, third-party payment gateway, transactional email | No module, no dependency, no code anywhere in `core-apis/src`. |

None of this is scoped for the current round. If a phase doc below needs one of these, it stops and calls it out rather than inventing a schema.

## 5. Decisions (confirmed with user, 2026-07-24)

- **`reports` nav entry**: repoint to `ReportGenerationLogs` (which already has full CRUD). Scoped into Phase 6.
- **`Role.permissions` shape**: undocumented `object` field on the backend `Role` entity. Proposed: `{ scope: 'all' | 'own-location', locationIds?: string[] }` to match the spec's Admin-vs-Branch-Staff model. This is a **proposed backend contract, not a confirmed one** — flag for backend-team confirmation before the Role form ships in Phase 5; do not build against it as settled.
- **Local SQLite PIN system** (`src/main/database.ts`, `UsersManagement.tsx`): independent shared-terminal lock-screen layer, unrelated to Clerk or backend Roles. Leave untouched, it solves a different problem (device access, not business permissions).
- **Branch Staff location restriction**: out of scope for this round. Every authenticated user sees all data regardless of store assignment, same as today. No evidence of location-aware auth in the backend — revisit only if requested.

## 6. Auth architecture (as it exists today, for reference)

Three separate identity systems, not unified:
1. **Clerk** — cloud auth, drives login/session (`AuthContext.tsx`, `lib/clerk.ts`). Self-signup **implemented 2026-07-25** (Phase 0, commit `36fa0e4` + follow-up fixes): `Login.tsx` has sign-in/sign-up/verify modes with Cloudflare Turnstile CAPTCHA.
2. **Backend Role/UserRole** (`/api/v1/roles`, `/api/v1/user-roles`) — create + get-by-id only (§2).
3. **Local SQLite `users` table** — PIN-based admin/operator switching for shared terminals, fully independent of the other two.
