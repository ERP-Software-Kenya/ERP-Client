# FE-only full parity pass (sales → purchase → warehouse → remaining)

> **For agentic workers:** Use subagent-driven-development. ERP-Client only.

**Goal:** Make every ERP-Client section honest against what core-apis already exposes — no fake lists, no mock writes presented as real, UUID lookup where BE is get-by-id only. **No core-apis changes.**

**Architecture:** Add `createCreateOnlyResource` for thin backends; update pages/nav copy; keep blocked submits disabled when BE is known broken (cannot fix without API).

**Tech Stack:** React, TanStack Query, existing FormDrawer patterns.

## Global Constraints

- Touch **only** `/home/hitarth/ERP/ERP-Client`
- Do **not** modify `core-apis`
- Do **not** enable Submit on pages whose BE create still lacks org scoping (customers/orders) unless live-proven
- Do **not** commit unless user asks
- Inventory stores-first Option A already done — skip rework unless broken

---

### Task 1: `createCreateOnlyResource` + wire thin APIs

**Files:** `renderer/src/lib/resource.ts`, `renderer/src/api.ts`

- [x] Add `createCreateOnlyResource` with only `useGet` + `useCreate` (no list/search/update/delete)
- [x] Switch these exports to it: Customers, Orders, Invoices, Expenses, PurchaseItems, ActivityLogs, Roles, UserRoles, PlatformConfigurations, Users
- [x] Leave full `createResource` for modules with search/list/update/delete on BE
- [x] Vehicles, OrgAddresses, UserAddresses: keep exports but pages will stop treating them as live CRUD (Task 5)

---

### Task 2: Sales — Customers, Orders, Invoices

For each page:
- Honest banner: create+get only; no directory
- Add UUID **Look up** using `useGet` (works if ID known)
- Keep create submit **disabled** with reason (org scoping / BE) — do not silently enable
- Remove any `useSearch`/`useList` usage
- Orders: keep customer ID paste (no customer list)

---

### Task 3: Purchase — POs, items, bills, payments

- PurchaseItems: create-only resource + UUID lookup; create stays disabled if field mismatch banner still accurate
- PurchaseOrders / Bills / PaymentTransactions: BE has full CRUD routes but FE blocked on 500s — keep disabled submits; ensure list errors show friendly empty state (not infinite spinner); banners say needs backend fix
- Do not invent list for PurchaseItems

---

### Task 4: Warehouse polish

- StockTransfers / UnpublishedStock: ensure banners accurate; no Locations nav (already done)
- StockMovements: confirm no fake global list
- WarehouseDashboard: no fake GRN counts as live API

---

### Task 5: Remaining — dead APIs + demo audit

- Vehicles: banner “no vehicles API”; disable/hide mock CUD or label clearly as local mock only
- OrgAddresses / UserAddresses: banner “no backend endpoints”; disable save or show unavailable
- AuditLog: remove from sidebar **or** title must say Demo; prefer remove from nav, keep route
- Users/Roles/UserRoles/PlatformConfigurations/ActivityLogs/Expenses: ensure create-only UX (no table pretending to list)

---

### Task 6: Verify

- `rg` no `core-apis` diffs from this work
- `tsc --noEmit` in ERP-Client renderer if available
- Checklist: sales/purchase/warehouse/remaining pages match BE surface honesty
