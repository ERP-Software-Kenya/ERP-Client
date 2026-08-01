# Frontend ↔ Backend parity (section-by-section)

**Date:** 2026-07-30  
**Sources:** core-apis controllers (135 routes), ERP-Client pages + `api.ts` + `auth.service.ts`  
**Method:** Static code compare — not re-live-tested today  
**Companion:** `2026-07-30-full-endpoint-audit.md`

Legend for **Verdict**:
- **OK** — FE matches what BE exposes; usable as-is
- **CHANGE FE** — page/api layer should be adjusted
- **CHANGE BE** — backend must be fixed/extended before FE can be honest
- **ADD** — missing piece on FE and/or BE
- **DECIDE** — product choice needed (not a technical guess)

---

## Open questions (do not assume)

1. What is the bar for “done” per section — full CRUD UI for every existing endpoint, only nav pages made correct, or list+create/edit minimum for every business module?
2. Evaluation priority — inventory cluster, admin master data, finance/sales, or all equal?
3. Are `stores` and `locations` both still required, or is one the replacement?
4. Should vehicles / org-addresses / user-addresses stay in the product if core-apis has no controllers?
5. Are the 2026-07-26 “BLOCKED / 500” banners still believed accurate, or should we re-live-test before changing FE?

---

## Section matrix

| # | Section | BE | FE page | Verdict | Action |
|---|---------|----|---------|---------|--------|
| 1 | auth | 5 routes | Login/SSO/onboarding/invite | OK / small CHANGE FE | Wire invite fully; document token as dev-only |
| 2 | organizations | Full CRUD | Organizations | OK | — |
| 3 | stores | Full CRUD | Stores | DECIDE | Keep vs deprecate vs locations |
| 4 | locations | Full CRUD + image | Locations | OK | — |
| 5 | categories | Full CRUD + parents | Categories | OK | Optional: use `/parents` in form |
| 6 | products | Full CRUD + images + suppliers | Products | OK | — |
| 7 | suppliers | Full CRUD | Suppliers | OK | — |
| 8 | inventory | Full CRUD + low-stock + valuation | Inventory + Detail | OK / optional ADD BE | Summary endpoint optional |
| 9 | stock-movements | Ops + by-inventory + get | StockMovements + Detail | OK (given BE) | Don’t fake global list |
| 10 | stock-transfers | create/get/complete/cancel | StockTransfers UUID UI | CHANGE BE (+ later FE) | Need list/search |
| 11 | unpublished-stock | get/add/publish/movements | UnpublishedStock UUID UI | CHANGE BE (+ later FE) | Need list/search |
| 12 | product-logs | read-only 3 routes | ProductLogs | OK | Optional by-location |
| 13 | purchase-orders | Full CRUD routes | PurchaseOrders BLOCKED | CHANGE BE then FE | Re-test 500s; re-enable |
| 14 | purchase-items | create+get only | PurchaseItems BLOCKED | CHANGE BE then FE | Field mismatch + no list |
| 15 | customers | create+get | Customers BLOCKED | CHANGE BE then FE | orgId + list |
| 16 | orders | create+get | Orders BLOCKED | CHANGE BE then FE | tenancy + list + lines |
| 17 | invoices | create+get | Invoices BLOCKED | CHANGE BE then FE | re-test; list |
| 18 | bills | Full CRUD routes | Bills BLOCKED | CHANGE BE then FE | re-test 500s |
| 19 | payment-transactions | Full CRUD routes | Payments BLOCKED | CHANGE BE then FE | orgId field name |
| 20 | expenses | create+get | Expenses create-only | OK vs BE / DECIDE | List needs BE |
| 21 | item-returns | Full CRUD | ItemReturns | PARTIAL / DECIDE | Line-items API? |
| 22 | notifications | Full CRUD | list/update/delete | OK / DECIDE | Create in UI? |
| 23 | report-generation-logs | Full CRUD | list/update/delete | OK / DECIDE | Create in UI? |
| 24 | users | create+get + auth invite | Users create+invite | OK vs BE / DECIDE | List needs BE |
| 25 | roles | create+get | Roles create-only | CHANGE BE and/or FE | Schema discard warnings |
| 26 | user-roles | create+get | UserRoles create-only | OK vs BE / DECIDE | List + pickers need BE |
| 27 | platform-configurations | create+get | create-only | OK vs BE | List needs BE |
| 28 | activity-logs | create+get | create + demo AuditLog | CHANGE FE | Don’t ship demo as real audit |
| 29 | vehicles | **no controller** | VehiclesPage (search + mock CUD) | CHANGE FE or ADD BE | Dead API path |
| 30 | org-addresses | **no controller** | OrgAddresses full CRUD UI | CHANGE FE or ADD BE | Will 404 |
| 31 | user-addresses | **no controller** | UserAddresses full CRUD UI | CHANGE FE or ADD BE | Will 404 |

---

## Cross-cutting FE issues (extra, not asked)

1. **`createResource` assumes full CRUD** (`/list`, search, put, delete) even for thin modules → selects and unused hooks will 404/500.
2. **BLOCKED banners cite 2026-07-26** — may be stale; re-live-test before large FE work.
3. **Sidebar has many `disabled` modules** with no BE (quotations, GRN, drivers, …) — out of current API surface.
4. **Auth `POST /token`** is anonymous/dev — ensure FE never calls it in production builds.

---

## Suggested work order (proposal only — confirm)

1. Decide dead clients: vehicles, org-addresses, user-addresses (remove UI vs add BE).
2. Decide stores vs locations.
3. Re-live-test BLOCKED finance/purchase modules against current BE.
4. Inventory list gaps: unpublished-stock + stock-transfers list endpoints.
5. Thin modules that product needs as directories: customers, users, roles lists.
6. Slim `createResource` usage on create-only pages.
