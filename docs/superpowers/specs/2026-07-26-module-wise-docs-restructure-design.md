# Module-Wise Documentation Restructure — Design

**Date:** 2026-07-26
**Status:** Approved, ready for implementation plan.

## 1. Why

The project's planning docs are organized by phase (`erp-implementation-01-crud-foundation`, `-02-purchase-module`, ...) instead of by backend module/business domain. This has caused problems:

- Docs drifted from reality — a prior session's overview/requirements docs claimed verified work that didn't exist on disk (see `.claude/rules/lessons-learned.md`, 2026-07-24 entry).
- The single plan file for "Phase 1" grew to 3334 lines, covering unrelated resources together.
- Backend capability findings live in a separate cross-cutting doc (`docs/core-apis-fixes.md`) instead of next to the client work they block, and that doc itself only covers Purchase/Sales/Inventory — Foundation, Auth, and Ops modules have never been live-verified.

This restructure replaces phase-numbered docs with one doc per business domain, each independently self-contained: backend capability (live-verified), client state, gaps, and a task checklist.

## 2. Scope — what gets deleted

- `docs/superpowers/specs/2026-07-23-erp-implementation-00-overview.md`
- `docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md`
- `docs/superpowers/specs/2026-07-23-erp-implementation-02-purchase-module.md`
- `docs/superpowers/specs/2026-07-23-erp-implementation-03-sales-module.md`
- `docs/superpowers/specs/2026-07-23-erp-implementation-04-inventory-transactions.md`
- `docs/superpowers/specs/2026-07-23-erp-implementation-05-roles-access.md`
- `docs/superpowers/specs/2026-07-23-erp-implementation-06-reports.md`
- `docs/superpowers/specs/2026-07-24-erp-implementation-00-overview.md`
- `docs/superpowers/specs/2026-07-24-self-signup-design.md`
- `docs/superpowers/specs/2026-07-26-purchase-sales-inventory-completion-design.md`
- `docs/superpowers/plans/2026-07-23-phase1-crud-foundation.md`
- `docs/superpowers/plans/2026-07-24-self-signup.md`
- `docs/superpowers/plans/2026-07-26-core-apis-live-diagnostic.md` (written but never executed as local-Docker diagnostic — superseded by the deployed-curl approach actually used)
- `docs/core-apis-fixes.md`
- `docs/requirements.md`

This spec document itself, and this restructure's own implementation plan, are not phase-numbered inventory-work docs — they describe the restructuring effort and are exempt.

Not in scope: renderer source code, `graphify-out/`, anything outside `docs/`.

## 3. New structure

New folder: `docs/modules/` (flat, no phase numbers, no sequencing implied by filename).

| File | Backend modules covered |
|---|---|
| `README.md` | Index + cross-cutting findings (see §5) |
| `foundation.md` | Organizations, Stores, Categories, Products, Suppliers |
| `purchase.md` | PurchaseOrders, PurchaseItems, Bills |
| `sales.md` | Customers, Orders, Invoices (+ schema-only OrderItems) |
| `inventory.md` | Inventory, StockMovements, StockTransfers (+ schema-only StockTransferItems), ItemReturns |
| `auth-access.md` | Auth, Users, Roles, UserRoles |
| `ops-admin.md` | Notifications, ReportGenerationLogs, PaymentTransactions, ActivityLogs, PlatformConfigurations, Expenses |

**ItemReturns placement:** one entity, one client page (`ItemReturns.tsx`), used by both purchase-side and sales-side returns — doesn't split cleanly, so it's documented once in `inventory.md` (it's fundamentally a stock-affecting transaction) and cross-linked from `purchase.md` and `sales.md` rather than duplicated.

**Vehicles/Fleet:** no backend entity or controller exists; the client screen (`VehiclesPage.tsx`, `VehicleDetailPage.tsx`) runs entirely on in-memory mock data. Prior confirmed decision (requirements.md §5, 2026-07-24): leave as-is, not in scope to build backend for. Carried forward as a one-line note in `README.md`, not given its own domain doc.

## 4. Per-domain doc template

Every one of the 6 domain docs follows this shape:

1. **Backend modules covered** — source paths under `D:\WorkSpace\core-apis\src\application\modules\`
2. **Capability matrix** — table: `Resource | List | Create | Update | Delete | DTO fields match entity? | Live status + evidence`. "Live status" cites an actual curl response from today's pass against `https://core-apis-m03n.onrender.com`, never "should work."
3. **Client state** — which `renderer/src/pages/*.tsx` files exist for this domain, what they currently call (`api.ts`), any known drift from the capability matrix
4. **Gap/bug list** — two subsections:
   - *Backend must fix* (not actionable from this repo — DTO/entity mismatches, missing endpoints, missing guards; flagged for the `core-apis` team)
   - *Client can build/fix now* (buildable against what the backend actually supports today)
5. **Task checklist** — `- [ ]` items, concrete enough to hand directly to `writing-plans` for an implementation plan

## 5. Cross-cutting findings (go in `README.md`, not repeated per-domain)

- **No `@UseGuards` on any business controller** (confirmed by source read across all `*.controller.ts` under `application/modules/`, only `auth.controller.ts` has any guard) — applies to all 24 modules, not just Purchase/Sales/Inventory where it was first found. This is the single highest-severity item and the likely root cause of every `organizationId`-not-populated bug.
- **DTO-must-be-subset-of-entity CI check recommendation** — the single backend-side guardrail that would have caught most of the confirmed create-endpoint bugs (PurchaseOrder, Bills, Inventory, Stores, Suppliers, Products, StockMovements, PurchaseItems all hit this exact bug class). Surfaced prominently, not buried in a per-domain list.
- **Vehicles/Fleet is intentionally mock-only** — one-line callout, links to `foundation.md` or stands alone, not worth a 7th domain doc.
- **Three separate identity systems** (Clerk, backend Role/UserRole, local SQLite PIN) — summarized here, detailed in `auth-access.md`.

## 6. Verification method

For each of the 24 backend resources:

1. **Source check** — read the `core-apis` controller for HTTP-verb decorators, and compare the create/update DTO's fields against the entity's real columns (same rigor as the `verify-core-apis-capability` skill already applies).
2. **Live check** — curl `https://core-apis-m03n.onrender.com/api/v1/...` directly (no auth header needed — none is enforced): list/get endpoints first (safe, read-only), then create/update where testable, reusing real seeded IDs where they exist and flagging any test that had to use a fabricated FK (same disclosure standard the existing Purchase/Sales/Inventory findings used).
3. Evidence goes directly into the domain doc's capability matrix — no intermediate scratch files kept around after the doc is written.

This repeats, uniformly, across all 6 domains — including re-verifying Purchase/Sales/Inventory rather than copying forward today's earlier findings, per the chosen approach.

## 7. Out of scope for this restructure

- Fixing any of the confirmed backend bugs (that's `core-apis`-side work, tracked as "backend must fix" items in each domain doc, not fixed here).
- Building the actual client-side gap-closing work — this restructure produces the docs and task checklists; implementation happens in a later, separate pass per domain (or across domains), following normal `writing-plans` → execution flow.
- Self-signup docs (`2026-07-24-self-signup-design.md`, `2026-07-24-self-signup.md`) — deleted per decision (feature already shipped), but the shipped feature itself is untouched.
