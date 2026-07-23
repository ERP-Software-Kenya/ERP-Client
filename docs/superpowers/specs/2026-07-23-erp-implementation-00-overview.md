# ERP Client Implementation — Overview & Index

**Status:** Draft for review — **Date:** 2026-07-23
**Source of ambition:** `inventory_management_spec.md` (repo root) — the target data model.
**Source of reality:** live API at `https://core-apis-m03n.onrender.com` (OpenAPI at `/api/docs-json`, verified 2026-07-23) + current renderer code.

This is the index for a 6-phase implementation plan. Each phase has its own detailed spec:

| Phase | File | Covers |
|---|---|---|
| 1 | `2026-07-23-erp-implementation-01-crud-foundation.md` | Shared form/dialog infrastructure + edit/delete for the 12 resources that already fully support it |
| 2 | `2026-07-23-erp-implementation-02-purchase-module.md` | Purchase Orders → Purchase Items → Bills → Payments → Purchase Returns |
| 3 | `2026-07-23-erp-implementation-03-sales-module.md` | Orders → Invoices → Customers → Sales Returns |
| 4 | `2026-07-23-erp-implementation-04-inventory-transactions.md` | Stock Movements (adjustments) + Stock Transfers (between stores) |
| 5 | `2026-07-23-erp-implementation-05-roles-access.md` | Roles, User Roles, platform Users vs. Clerk org roles vs. local SQLite PIN accounts |
| 6 | `2026-07-23-erp-implementation-06-reports.md` | Report Generation Logs + the named reports from spec §7 |

---

## 1. Why this differs from `inventory_management_spec.md`

That document specs an aspirational data model: Unit Library with base/derived units, a dynamic Tax Group engine, per-item Batch/Serial/Expiry, Customer/Supplier credit tracking (limit, days, opening balance), Location `type`/`state`, bundle↔piece conversion, stock valuation method, etc.

**None of that exists in the live backend today.** Confirmed by diffing the OpenAPI schema against `renderer/src/types.ts` (whose header comment notes its fields were matched against real API responses, not guessed):

| Spec concept | Backend today |
|---|---|
| Unit Library (base/derived units, conversion factor) | `Product.unit` is a single free-text string. No unit entity, no conversion, no per-item unit variants. |
| Tax Group / HSN / CGST-SGST-IGST engine | No tax fields anywhere. `Customer.gstin` exists; nothing computes tax from it. |
| Batch/Serial/Expiry (optional per item) | Not present on any entity. |
| Customer/Supplier credit (limit, days, opening balance) | `Customer` has only `name/email/phone/gstin/status`. `Supplier` has only `name/code/email/phone/status`. No receivables/payables ledger. |
| Location `type` (Warehouse/Branch) / `state` | `Store` has only `name/code/address/organization_id/status`. |
| Bundle ↔ Piece conversion | No concept of unit variants at all, so nothing to convert between. |
| Stock valuation method (FIFO/weighted avg) | Not present — `StockMovement` just has `quantity/type/reason`, no cost. |

**Decision (confirmed with user 2026-07-23):** build against the real API as it exists today. Treat the above as a **backend roadmap**, not this session's scope. Every phase doc below calls out, per feature, whether it's buildable now or blocked on a backend change — nothing from the original spec is silently dropped, it's tagged.

## 2. What the app already has right, structurally

The renderer's module navigation (`renderer/src/config/modules.ts`) already groups screens as **Inventory / Sales / Purchasing / Warehouse / Finance / Reports / Admin** — this matches the spec's module boundaries well. No nav restructuring needed; phases below fill in behavior behind existing nav entries.

## 3. What's actually implemented today (verified by reading routed code, not the unused legacy files)

Two component families exist. Only one is actually routed:

- **`renderer/src/components/*View.tsx`** (BillsView, CategoriesView, InventoryView, OrganizationsView, PaymentsView, ProductsView, PurchaseOrdersView, StoresView, SuppliersView, NotificationsView) — **dead code.** Not imported by `App.tsx`. Do not extend these; either delete them in Phase 1 cleanup or confirm with user why they're kept.
- **`renderer/src/pages/ModulePage.tsx`** — the actual generic table, routed for all 22 "generic" resources (`App.tsx` `GENERIC_KEYS`). It auto-derives table columns from `Object.keys(firstRow)` of whatever the API returns, and its "Add New" / "Edit" buttons have **no `onClick` handler at all** — completely inert.
- **`renderer/src/pages/Products.tsx`** and **`Inventory.tsx`** — dedicated pages using `ERPDataTable`, one step more built (defined columns, formatted price), but `onAdd`/`onEdit` are `console.log(...)` stubs — also non-functional.
- **`renderer/src/api.ts`** `makeResource<T>()` factory only implements `search()`, `list()`, `getById()`. **There is no `create`, `update`, or `remove` method anywhere in the client**, even though the backend supports POST/PUT/DELETE on 12 resources. This is the single biggest gap and the first thing Phase 1 fixes.
- **`renderer/src/components/ui/`** has only `button.tsx`, `input.tsx`, `label.tsx`. Radix `Dialog`, `Select`, `DropdownMenu` are installed as dependencies but never wrapped into reusable components — needed for any create/edit form or confirm-delete dialog.
- **Two orphaned nav items**: `'reports'` and `'users'` keys resolve via `ModulePage`'s `getApiClient()` (pascal-cases the key, looks up `Api[Pascal]`) to `Api.Reports` and `Api.Users` — **neither exists** in `api.ts`. Both screens currently render silently empty. `/api/v1/users` does exist on the backend (create + get-by-id only); `/api/v1/reports` does not exist at all (only `/report-generation-logs` does).
- **`Vehicles` resource** (`api.ts` → `/api/v1/vehicles`) has **no corresponding path in the live OpenAPI spec at all** — it's leftover from what looks like a prior fleet-management version of this app. Out of scope for this spec; flagging so nobody spends time debugging why it 404s.

## 4. Endpoint capability matrix (verified against live OpenAPI, 2026-07-23)

**Full CRUD** (list + get + post + put + delete) — 12 resources:
Bills, Categories, Inventory, ItemReturns, Notifications, Organizations, PaymentTransactions, Products, PurchaseOrders, ReportGenerationLogs, Stores, Suppliers.

**Create + get-by-id only** (no list endpoint, no update, no delete) — 13 resources:
ActivityLogs, Customers, Expenses, Invoices, Orders, PlatformConfigurations, PurchaseItems, Roles, StockMovements, StockTransfers, UserRoles, Users.

For the second group, no browsable table is possible without either (a) a backend addition of a list/filter endpoint, or (b) reaching each record only via a relation from something that *is* listable (e.g., open a Purchase Order, see its items via IDs the client cached at creation time). Each affected phase doc proposes the specific workaround and names the ideal backend fix. **Stock-movement/stock-transfer/activity-log immutability (no PUT/DELETE) looks intentional** — audit-trail entities shouldn't be editable — so that part isn't flagged as a gap, only the missing list endpoint is.

## 5. Cross-phase foundation work (built once in Phase 1, reused everywhere)

1. `api.ts`: add `create(body)`, `update(id, body)`, `remove(id)` to `makeResource<T>()`, gated per-resource by what the OpenAPI matrix above actually supports (don't expose `update`/`remove` for the 13 create-only resources — calling them would 404/405).
2. `components/ui/`: add `dialog.tsx` (Radix Dialog wrapper), `select.tsx` (Radix Select wrapper), `form-field.tsx` (label + input/select + error message), `confirm-dialog.tsx` (delete confirmation).
3. A generic `<ResourceForm>` pattern (or per-resource forms, decided in Phase 1 doc) driven off the same `Column<T>` metadata `ERPDataTable` already uses, so add/edit stays in sync with the table for free.
4. Fix the `Api.Users` / `Api.Reports` orphaned nav entries.
5. Delete or repurpose the dead `components/*View.tsx` files (confirm with user before deleting).

## 6. Open items still needing your call (not blocking, but flagged so nothing's assumed silently)

- Delete the dead `components/*View.tsx` files, or is something else using them that the code search missed?
- `Vehicles`/Fleet nav — keep as-is (dead/404ing), hide from nav, or is this actually a separate concern you'll clarify later?
- Per-phase docs will each end with their own open questions where the API's real behavior is genuinely unknown (e.g., whether `PurchaseOrderResponse` embeds items server-side — the OpenAPI schema is too thin to tell, and I don't have a live token to test the real payload shape).
