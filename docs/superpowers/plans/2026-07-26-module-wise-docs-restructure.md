# Module-Wise Documentation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete all phase-numbered planning docs and replace them with six self-contained, module-wise domain docs under `docs/modules/`, each backed by a live-verified backend capability matrix (fresh evidence against the deployed API, not carried forward from old docs).

**Architecture:** One task deletes the old docs. Six tasks each produce one domain doc (Foundation, Purchase, Sales, Inventory, Auth & Access, Ops & Admin) by reading `core-apis` source directly and curling the deployed instance for live evidence. A final task writes the cross-cutting `README.md` index. No `core-erp-client` application code changes, no `core-apis` source changes.

**Tech Stack:** Markdown docs, `curl` against the deployed NestJS API, direct source reads of the `core-apis` TypeScript repo.

## Global Constraints

- **Design spec:** `docs/superpowers/specs/2026-07-26-module-wise-docs-restructure-design.md` — every domain doc MUST follow its §4 template exactly: (1) Backend modules covered, (2) Capability matrix, (3) Client state, (4) Gap/bug list split into "Backend must fix" / "Client can build now", (5) Task checklist.
- **Deployed API base URL:** `https://core-apis-m03n.onrender.com/api/v1` — no `Authorization` header is needed or accepted for any endpoint except `/auth/*` (see Task 6).
- **Evidence standard:** every capability-matrix cell cites either a real curl response (paste HTTP status + body) or an exact `file:line` from source. Never write "should work" or "looks correct."
- **No scratch files.** Write findings directly into the target domain doc as you go.
- **`core-apis` source root:** `D:\WorkSpace\core-apis\src`. Pattern: controller at `application/modules/<module>/<module>.controller.ts`; create DTO at `application/modules/<module>/models/requests/create-<resource>.request.ts` (some modules bundle all DTOs in one `<resource>.request.ts` file — check the directory if the `create-*` filename doesn't exist); command handler at `application/modules/<module>/commands/create-<resource>/create-<resource>.command-handler.ts`; entity at `infrastructure/persistence/entities/<resource-singular>.entity.ts`.
- **`core-erp-client` source root:** `D:\WorkSpace\core-erp-client\renderer\src`. Pages at `pages/<Name>.tsx`, API calls in `api.ts`, response shapes in `types.ts`.
- **Known seed data** (from `D:\WorkSpace\core-apis\src\infrastructure\persistence\seeds\*.seed.ts`, confirmed by direct read 2026-07-26):
  - Organization: `00000000-0000-4000-8000-000000000001` ("Demo Organization")
  - Store: `00000000-0000-4000-8000-000000000002` ("Main HQ Store")
  - Category: `00000000-0000-4000-8000-000000000003` ("Electronics")
  - Supplier: `00000000-0000-4000-8000-000000000004` ("Tech Wholesalers Inc.")
  - Product: `00000000-0000-4000-8000-000000000005` ("High-End Laptop")
  - PurchaseOrder: `poNumber` = `PO-2026-00001`, `id` is auto-generated — fetch it live via `GET /purchase-orders/list` or `GET /purchase-orders`.
  - Super-admin user: email `admin@demo.com`, `id` auto-generated — not independently discoverable via API (no user list endpoint).
  - Inventory row (storeId `...002`, productId `...005`, qty 150): `id` auto-generated — fetch live via `GET /inventory/list`.
  - Roles (`SuperAdmin`, `OrgAdmin`, `StoreManager`, `StoreStaff`): seeded but **no fixed IDs and no list/search endpoint** — their IDs cannot currently be discovered through the API at all. Note this as a confirmed gap wherever it blocks a test (e.g. `/user-roles` needs a real `roleId`).
- **Cleanup:** for every resource whose controller has `@Delete(':id')`, delete any test row you create via the API once its evidence is recorded, to avoid leaving junk data in the shared deployed DB. Resources with no delete endpoint will accumulate test rows — note this explicitly in that resource's matrix row rather than skip the create test.
- **Don't trust prior docs' conclusions.** `docs/core-apis-fixes.md` and `docs/requirements.md` (both deleted in Task 1) contain some claims already found to be wrong this session (e.g. they claimed Products' create DTO is a `{name}`-only scaffold — it is not; `CreateProductRequest` has 11 real fields including `costPrice`/`retailPrice`/`categoryId`). Re-derive every finding from source + live curl; do not copy forward old conclusions even where they happen to be right.

---

### Task 1: Delete phase-wise docs

**Files:**
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-00-overview.md`
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md`
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-02-purchase-module.md`
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-03-sales-module.md`
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-04-inventory-transactions.md`
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-05-roles-access.md`
- Delete: `docs/superpowers/specs/2026-07-23-erp-implementation-06-reports.md`
- Delete: `docs/superpowers/specs/2026-07-24-erp-implementation-00-overview.md`
- Delete: `docs/superpowers/specs/2026-07-24-self-signup-design.md`
- Delete: `docs/superpowers/specs/2026-07-26-purchase-sales-inventory-completion-design.md`
- Delete: `docs/superpowers/plans/2026-07-23-phase1-crud-foundation.md`
- Delete: `docs/superpowers/plans/2026-07-24-self-signup.md`
- Delete: `docs/superpowers/plans/2026-07-26-core-apis-live-diagnostic.md`
- Delete: `docs/core-apis-fixes.md`
- Delete: `docs/requirements.md`

**Interfaces:**
- Produces: a clean `docs/` tree with no phase-numbered planning docs, ready for Tasks 2-8 to populate `docs/modules/`.

- [ ] **Step 1: Confirm the file list matches what's on disk**

```bash
cd "D:\WorkSpace\core-erp-client"
ls docs/superpowers/specs/
ls docs/superpowers/plans/
ls docs/*.md
```

Expected: every path listed above appears in the output. `docs/superpowers/specs/2026-07-26-module-wise-docs-restructure-design.md` should ALSO appear — do not delete that one, it's this restructure's own spec.

- [ ] **Step 2: Delete the files**

```bash
cd "D:\WorkSpace\core-erp-client"
git rm "docs/superpowers/specs/2026-07-23-erp-implementation-00-overview.md" \
       "docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md" \
       "docs/superpowers/specs/2026-07-23-erp-implementation-02-purchase-module.md" \
       "docs/superpowers/specs/2026-07-23-erp-implementation-03-sales-module.md" \
       "docs/superpowers/specs/2026-07-23-erp-implementation-04-inventory-transactions.md" \
       "docs/superpowers/specs/2026-07-23-erp-implementation-05-roles-access.md" \
       "docs/superpowers/specs/2026-07-23-erp-implementation-06-reports.md" \
       "docs/superpowers/specs/2026-07-24-erp-implementation-00-overview.md" \
       "docs/superpowers/specs/2026-07-24-self-signup-design.md" \
       "docs/superpowers/specs/2026-07-26-purchase-sales-inventory-completion-design.md" \
       "docs/superpowers/plans/2026-07-23-phase1-crud-foundation.md" \
       "docs/superpowers/plans/2026-07-24-self-signup.md" \
       "docs/superpowers/plans/2026-07-26-core-apis-live-diagnostic.md" \
       "docs/core-apis-fixes.md" \
       "docs/requirements.md"
```

- [ ] **Step 3: Verify deletion**

```bash
git status
```

Expected: all 15 files show as staged deletions (`D  docs/...`), nothing else changed.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
Delete phase-wise planning docs

Removing all phase-numbered specs/plans (erp-implementation-00
through 06, phase1-crud-foundation, the unexecuted local-Docker
diagnostic plan) plus core-apis-fixes.md and requirements.md.
Replaced by module-wise docs under docs/modules/ (see design spec
2026-07-26-module-wise-docs-restructure-design.md), built in
subsequent tasks of this plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Foundation domain doc

**Files:**
- Create: `docs/modules/foundation.md`

**Interfaces:**
- Consumes: nothing from other tasks (can run in parallel with Tasks 3-7).
- Produces: `docs/modules/foundation.md`, linked from Task 8's `README.md`.

Resources in scope: **Organizations, Stores, Categories, Products, Suppliers**. Per source read of each `*.controller.ts`, all five have `@Get()`, `@Get('list')`, `@Get(':id')`, `@Post()`, `@Put(':id')`, `@Delete(':id')` — i.e. decorator-level full CRUD. This task verifies whether that's also true at the DTO/entity/live level.

- [ ] **Step 1: Read source for all 5 resources**

For each of `organizations`, `stores`, `categories`, `products`, `suppliers`:
- Read the controller: `D:\WorkSpace\core-apis\src\application\modules\<module>\<module>.controller.ts`
- Read the create DTO: `D:\WorkSpace\core-apis\src\application\modules\<module>\models\requests\create-<resource-singular>.request.ts`
- Read the create command handler: `D:\WorkSpace\core-apis\src\application\modules\<module>\commands\create-<resource-singular>\create-<resource-singular>.command-handler.ts` — specifically check whether it sets `organizationId` anywhere, or only maps DTO fields straight through (this determines whether a missing-org-context failure is expected).
- Read the entity: `D:\WorkSpace\core-apis\src\infrastructure\persistence\entities\<resource-singular>.entity.ts` — note every `NOT NULL` (no `nullable: true`, no `default`) column.
- Compare DTO fields vs entity NOT NULL columns. Note every entity NOT NULL column the DTO can't populate.

Known from this session's research (re-verify, don't just copy): `CreateOrganizationRequest`/`CreateStoreRequest`/`CreateCategoryRequest`/`CreateSupplierRequest` each expose only an optional `name` field. `CreateProductRequest` is fully fleshed out (name/categoryId/sku/barcode/description/unit/costPrice/retailPrice/loyaltyPrice/wholesalePrice/transferPrice/reorderPoint) — NOT a scaffold, contrary to an old doc's claim. None of the five DTOs include `organizationId` as a field, but every one of the five entities has a NOT NULL `organizationId` column — check each command handler to see if/how that gap is bridged (or isn't).

- [ ] **Step 2: Live-test list/get (safe, read-only) for all 5**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/organizations/list
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/organizations/00000000-0000-4000-8000-000000000001
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/stores/list
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/stores/00000000-0000-4000-8000-000000000002
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/categories/list
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/categories/00000000-0000-4000-8000-000000000003
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/products/list
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/products/00000000-0000-4000-8000-000000000005
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/suppliers/list
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/suppliers/00000000-0000-4000-8000-000000000004
```

Record HTTP status + full response body for each.

- [ ] **Step 3: Live-test create for all 5**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/organizations \
  -H "Content-Type: application/json" -d '{"name":"Docs Diag Org"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/stores \
  -H "Content-Type: application/json" -d '{"name":"Docs Diag Store"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/categories \
  -H "Content-Type: application/json" -d '{"name":"Docs Diag Category"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Docs Diag Product","categoryId":"00000000-0000-4000-8000-000000000003","sku":"DOCS-DIAG-001","unit":"piece","costPrice":10,"retailPrice":20}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/suppliers \
  -H "Content-Type: application/json" -d '{"name":"Docs Diag Supplier"}'
```

For every `2xx`, capture the returned `id` and immediately test `PUT` (any field) and `DELETE` against it, then record all three results. For every non-`2xx`, record the exact status + body as the create finding — do not retry with more fields than the DTO exposes.

- [ ] **Step 4: Read client state**

Read `renderer/src/pages/Organizations.tsx`, `Stores.tsx`, `Categories.tsx`, `Products.tsx`, `Suppliers.tsx`, plus their entries in `renderer/src/api.ts` and `renderer/src/types.ts`. Note what each page currently does (list table, create/edit dialog, etc.) and whether its field usage matches what Step 2/3 found live.

- [ ] **Step 5: Write `docs/modules/foundation.md`**

Follow the design spec's §4 template exactly (see Global Constraints). Capability matrix has one row per resource with columns List/Create/Update/Delete/DTO-matches-entity/Live-evidence. Gap list splits backend-must-fix vs client-can-build-now. Task checklist is concrete `- [ ]` items only for client-side work (backend bugs go in the gap list, not the checklist — they're not actionable from this repo).

- [ ] **Step 6: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/foundation.md
git commit -m "$(cat <<'EOF'
Add docs/modules/foundation.md with live-verified capability matrix

Covers Organizations, Stores, Categories, Products, Suppliers.
Evidence gathered by reading core-apis source directly and curling
the deployed instance, per the module-wise docs restructure plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Purchase domain doc

**Files:**
- Create: `docs/modules/purchase.md`

**Interfaces:**
- Consumes: nothing from other tasks (can run in parallel with Tasks 2, 4-7).
- Produces: `docs/modules/purchase.md`, cross-links `docs/modules/inventory.md`'s ItemReturns section (written in Task 5), linked from Task 8's `README.md`.

Resources in scope: **PurchaseOrders** (full CRUD per controller decorators), **PurchaseItems** (create + get-by-id only), **Bills** (full CRUD per controller decorators).

- [ ] **Step 1: Read source for all 3 resources**

Same method as Task 2 Step 1: controller, create DTO (`purchase-orders`, `purchase-items`, `bills` modules), create command handler, entity (`purchase-order.entity.ts`, `purchase-item.entity.ts`, `bill.entity.ts`).

Known from this session's earlier research (re-verify, don't just copy): `CreatePurchaseOrderRequest` was found to expose only `name?: string` while `PurchaseOrderEntity` has NOT NULL `poNumber`/`supplierId`/`storeId` — confirm this is still true. `CreateBillRequest` was found to use `orgId`/`billNumber`/`amount` while `BillEntity` uses `supplierId`/`storeId`/`totalAmount` — confirm.

- [ ] **Step 2: Fetch the seeded PurchaseOrder's real id**

```bash
curl -s https://core-apis-m03n.onrender.com/api/v1/purchase-orders/list
```

Find the entry with `poNumber: "PO-2026-00001"` and record its `id` as `<PO_ID>` for Step 3.

- [ ] **Step 3: Live-test list/get for PurchaseOrders and Bills (PurchaseItems has no list)**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/purchase-orders/list
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/purchase-orders/<PO_ID>
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/bills/list
```

- [ ] **Step 4: Live-test create for all 3**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{"name":"Docs Diag PO","supplierId":"00000000-0000-4000-8000-000000000004","storeId":"00000000-0000-4000-8000-000000000002"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/purchase-items \
  -H "Content-Type: application/json" \
  -d '{"purchaseOrderId":"<PO_ID>","productId":"00000000-0000-4000-8000-000000000005","quantity":5,"unitPrice":1200.50}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/bills \
  -H "Content-Type: application/json" \
  -d '{"supplierId":"00000000-0000-4000-8000-000000000004","storeId":"00000000-0000-4000-8000-000000000002","totalAmount":500.00,"status":"pending"}'
```

For `purchase-items`, `<PO_ID>` is the real seeded id from Step 2 — this makes the test unconfounded by a fake FK, unlike a prior session's attempt. If PurchaseOrders create in this same step is broken, note that PurchaseItems still had a real PO to test against (the seeded one), so its result is clean either way. For every `2xx` PurchaseOrders/Bills result, test `PUT`/`DELETE` and record, then delete the test row.

- [ ] **Step 5: Read client state**

Read `renderer/src/pages/PurchaseOrders.tsx`, `PurchaseOrderDetail.tsx`, `Bills.tsx`, `BillDetail.tsx`, their `api.ts`/`types.ts` entries.

- [ ] **Step 6: Write `docs/modules/purchase.md`**

Follow the §4 template. In the Gap/bug list, add a line cross-linking `docs/modules/inventory.md` for ItemReturns (purchase-side returns), which is documented there, not duplicated here.

- [ ] **Step 7: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/purchase.md
git commit -m "$(cat <<'EOF'
Add docs/modules/purchase.md with live-verified capability matrix

Covers PurchaseOrders, PurchaseItems, Bills. Evidence gathered by
reading core-apis source directly and curling the deployed instance,
per the module-wise docs restructure plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Sales domain doc

**Files:**
- Create: `docs/modules/sales.md`

**Interfaces:**
- Consumes: nothing from other tasks (can run in parallel with Tasks 2-3, 5-7).
- Produces: `docs/modules/sales.md`, cross-links `docs/modules/inventory.md`'s ItemReturns section, linked from Task 8's `README.md`.

Resources in scope: **Customers** (create + get-by-id only), **Orders** (create + get-by-id only), **Invoices** (create + get-by-id only). Also note: `OrderItemEntity` exists in `D:\WorkSpace\core-apis\src\infrastructure\persistence\entities\order-item.entity.ts` (confirm this file exists) but has no controller/module — schema-only, no API. Document as a confirmed gap, not a bug to test.

- [ ] **Step 1: Read source for all 3 resources + confirm OrderItems is schema-only**

Controller, create DTO, create command handler, entity for `customers`, `orders`, `invoices`. Then:

```bash
find "D:/WorkSpace/core-apis/src/application/modules" -iname "*order-item*"
```

Expected: no matches (no `order-items` module directory) — confirms schema-only. If a module DOES exist, this gap is stale; document what you actually find instead.

- [ ] **Step 2: Live-test create for Customers first (no FK dependency)**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Docs Diag Customer","email":"docs-diag@example.com","phone":"0700000000"}'
```

If `2xx`, record the returned `id` as `<CUSTOMER_ID>`. If not `2xx`, use a fabricated valid-v4 UUID for `<CUSTOMER_ID>` in Step 3 and note explicitly in the doc that Orders' FK is fabricated because Customer create failed — don't claim Orders' result is "clean" in that case.

- [ ] **Step 3: Live-test create for Orders, then Invoices**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"storeId":"00000000-0000-4000-8000-000000000002","customerId":"<CUSTOMER_ID>","subtotal":1200,"taxAmount":120,"totalAmount":1320}'
```

If `2xx`, record the returned `id` as `<ORDER_ID>` and use it below; otherwise fabricate and note the same caveat as Step 2.

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/invoices \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<ORDER_ID>","totalAmount":1320}'
```

- [ ] **Step 4: Live-test get-by-id for all 3, using any real ids obtained above**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/customers/<CUSTOMER_ID>
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/orders/<ORDER_ID>
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/invoices/<INVOICE_ID>
```

None of these 3 resources has a delete endpoint — any successfully created rows stay in the deployed DB. Note this explicitly in the doc rather than skip the create test.

- [ ] **Step 5: Read client state**

Read `renderer/src/pages/Customers.tsx`, `Orders.tsx`, `Invoices.tsx`, their `api.ts`/`types.ts` entries.

- [ ] **Step 6: Write `docs/modules/sales.md`**

Follow the §4 template. Include the OrderItems schema-only finding in the gap list. Cross-link `docs/modules/inventory.md` for sales-side ItemReturns.

- [ ] **Step 7: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/sales.md
git commit -m "$(cat <<'EOF'
Add docs/modules/sales.md with live-verified capability matrix

Covers Customers, Orders, Invoices, and the schema-only OrderItems
gap. Evidence gathered by reading core-apis source directly and
curling the deployed instance, per the module-wise docs restructure
plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Inventory domain doc

**Files:**
- Create: `docs/modules/inventory.md`

**Interfaces:**
- Consumes: nothing from other tasks (can run in parallel with Tasks 2-4, 6-7).
- Produces: `docs/modules/inventory.md`, referenced by `docs/modules/purchase.md` and `docs/modules/sales.md` for ItemReturns, linked from Task 8's `README.md`.

Resources in scope: **Inventory** (full CRUD per controller decorators), **StockMovements** (create + get-by-id only), **StockTransfers** (create + get-by-id only), **ItemReturns** (full CRUD per controller decorators — covers both purchase-side and sales-side returns, one entity). Also note: `StockTransferItemEntity` — check `D:\WorkSpace\core-apis\src\infrastructure\persistence\entities\` for its existence and whether any module/controller exists for it; document as schema-only gap if confirmed, same as Task 4's OrderItems check.

- [ ] **Step 1: Read source for all 4 resources + confirm StockTransferItems is schema-only**

Controller, create DTO, create command handler, entity for `inventory`, `stock-movements`, `stock-transfers`, `item-returns`. Then:

```bash
find "D:/WorkSpace/core-apis/src/application/modules" -iname "*stock-transfer-item*"
find "D:/WorkSpace/core-apis/src/infrastructure/persistence/entities" -iname "*stock-transfer-item*"
```

- [ ] **Step 2: Fetch a real Inventory row id**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/inventory/list
```

Record the first entry's `id` as `<INVENTORY_ID>` (the seeded row has `storeId` `...002`, `productId` `...005`, `quantityOnHand` 150 — confirm this is what you find).

- [ ] **Step 3: Live-test get-by-id for Inventory**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" https://core-apis-m03n.onrender.com/api/v1/inventory/<INVENTORY_ID>
```

- [ ] **Step 4: Live-test create for all 4**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/inventory \
  -H "Content-Type: application/json" \
  -d '{"storeId":"00000000-0000-4000-8000-000000000002","productId":"00000000-0000-4000-8000-000000000005","quantityOnHand":25}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/stock-movements \
  -H "Content-Type: application/json" \
  -d '{"storeId":"00000000-0000-4000-8000-000000000002","productId":"00000000-0000-4000-8000-000000000005","movementType":"IN","quantityBefore":150,"quantityAfter":160}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/stock-transfers \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"00000000-0000-4000-8000-000000000001","fromStoreId":"00000000-0000-4000-8000-000000000002","toStoreId":"00000000-0000-4000-8000-000000000002"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/item-returns \
  -H "Content-Type: application/json" \
  -d '{"storeId":"00000000-0000-4000-8000-000000000002","supplierId":"00000000-0000-4000-8000-000000000004","returnType":"purchase","status":"PENDING","totalAmount":150}'
```

The `stock-movements` payload above uses field names from the entity (`storeId`/`productId`/`movementType`/`quantityBefore`/`quantityAfter`), not the older `organizationId`/`inventoryId`/`quantity`/`type`/`reason` shape a prior session's DTO read found — **verify against the DTO you actually read in Step 1** and use its real field names, adjusting this payload if the DTO differs from the entity (that mismatch is itself the finding to record, not something to paper over). Same caveat for `stock-transfers` and `item-returns`: only one store exists in seed data, so `fromStoreId`/`toStoreId` are forced identical — note this limits transfer-between-different-stores testing.

For every `2xx`, test `PUT`/`DELETE` where the controller supports it (Inventory and ItemReturns do; StockMovements and StockTransfers don't), then delete test rows where possible.

- [ ] **Step 5: Read client state**

Read `renderer/src/pages/Inventory.tsx`, `StockMovements.tsx`, `StockTransfers.tsx`, `ItemReturns.tsx`, their `api.ts`/`types.ts` entries.

- [ ] **Step 6: Write `docs/modules/inventory.md`**

Follow the §4 template. ItemReturns section must explicitly note it serves both purchase-side and sales-side returns (`returnType: 'purchase' | 'sale'`), and that `purchase.md`/`sales.md` link here instead of duplicating it. Include the StockTransferItems schema-only finding in the gap list.

- [ ] **Step 7: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/inventory.md
git commit -m "$(cat <<'EOF'
Add docs/modules/inventory.md with live-verified capability matrix

Covers Inventory, StockMovements, StockTransfers, ItemReturns
(purchase- and sales-side), and the schema-only StockTransferItems
gap. Evidence gathered by reading core-apis source directly and
curling the deployed instance, per the module-wise docs restructure
plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Auth & Access domain doc

**Files:**
- Create: `docs/modules/auth-access.md`

**Interfaces:**
- Consumes: nothing from other tasks (can run in parallel with Tasks 2-5, 7).
- Produces: `docs/modules/auth-access.md`, linked from Task 8's `README.md`.

Resources in scope: **Auth** (special endpoints, not a CRUD resource), **Users** (create + get-by-id only), **Roles** (create + get-by-id only), **UserRoles** (create + get-by-id only).

**Auth is a special case.** Its controller (`D:\WorkSpace\core-apis\src\application\modules\auth\auth.controller.ts`) has `@UseGuards(ClerkAuthGuard)` at the class level — confirmed by direct read 2026-07-26, the ONLY controller in the entire codebase with any guard at all. `POST /auth/token` is `@AllowAnonymous()` (dev-only: exchanges an existing Clerk `userId` with an active session for a JWT) but every other route (`/auth/sync`, `/auth/organizations`, `/auth/invite`, `/auth/me`) requires a real, valid Clerk-issued bearer token that this diagnostic has no way to produce anonymously. **Do not attempt to curl `/auth/sync`, `/auth/organizations`, `/auth/invite`, or `/auth/me` — they will correctly 401, and that 401 is not a finding, it's the guard working as designed.** Document Auth by source read only: list its 5 endpoints, what each does (read the full controller file), and explicitly state that live verification requires a real Clerk session and is out of reach of this diagnostic.

- [ ] **Step 1: Read Auth source and document its 5 endpoints (source-only, no live test)**

Read `D:\WorkSpace\core-apis\src\application\modules\auth\auth.controller.ts` in full (already read once this session: `POST /token`, `POST /sync`, `POST /organizations`, `POST /invite`, `GET /me`). Note the guard requirement for each and what each does. This becomes the Auth row(s) in the capability matrix, marked "source-verified only, live test requires a Clerk session."

- [ ] **Step 2: Read source for Users, Roles, UserRoles**

Controller, create DTO, create command handler, entity for `users`, `roles`, `user-roles`. None of these three controllers has any `@UseGuards` (confirmed by the earlier repo-wide grep this session) — they're live-testable anonymously like every other business controller.

Known DTOs from this session's research (re-verify): `CreateUserRequest` requires `email`/`passwordHash`/`firstName`/`lastName`/`organizationId`. `CreateRoleRequest` requires `organizationId`/`name`/`permissions` (object). `CreateUserRoleRequest` requires `userId`/`roleId`.

- [ ] **Step 3: Live-test create for Users**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"docs-diag@example.com","passwordHash":"not-a-real-hash-diagnostic-only","firstName":"Docs","lastName":"Diag","organizationId":"00000000-0000-4000-8000-000000000001"}'
```

If `2xx`, record `id` as `<USER_ID>` and test `GET /users/<USER_ID>`.

- [ ] **Step 4: Live-test create for Roles**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/roles \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"00000000-0000-4000-8000-000000000001","name":"Docs Diag Role","permissions":{"scope":"all"}}'
```

If `2xx`, record `id` as `<ROLE_ID>` and test `GET /roles/<ROLE_ID>`.

- [ ] **Step 5: Live-test create for UserRoles**

Use `<USER_ID>` from Step 3 and `<ROLE_ID>` from Step 4 if both succeeded. If either failed, fabricate a valid-v4 UUID for the missing one and note the confound explicitly — do not skip the test.

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/user-roles \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","roleId":"<ROLE_ID>"}'
```

Also record, as a separate confirmed gap: the 4 seeded Roles (`SuperAdmin`/`OrgAdmin`/`StoreManager`/`StoreStaff`) have no fixed IDs and Roles has no list/search endpoint, so a `/user-roles` create against one of the *real seeded* roles (as opposed to one you just created) cannot currently be tested at all through the API.

- [ ] **Step 6: Read client state**

Read `renderer/src/pages/Login.tsx` and `AuthContext.tsx`/`lib/clerk.ts` (find via `renderer/src` — grep for `Clerk`) for the Clerk-side auth flow. Check `renderer/src/api.ts`/`ModulePage.tsx` for whether `users`/`roles`/`user-roles` nav entries exist and what they resolve to (a prior finding: `'users'` and `'reports'` nav entries had no matching `api.ts` export — confirm current state, don't assume it's still true).

- [ ] **Step 7: Write `docs/modules/auth-access.md`**

Follow the §4 template. Include a dedicated subsection on the three separate identity systems (Clerk / backend Role+UserRole / local SQLite PIN table in `src/main/database.ts`) — read `src/main/database.ts`'s users table usage briefly to confirm it's still independent of the other two, then describe the relationship. Capability matrix: Auth's 5 endpoints marked source-only; Users/Roles/UserRoles get full live evidence.

- [ ] **Step 8: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/auth-access.md
git commit -m "$(cat <<'EOF'
Add docs/modules/auth-access.md with live-verified capability matrix

Covers Auth (source-verified only — its routes require a real Clerk
session, out of reach of an anonymous diagnostic), Users, Roles,
UserRoles, and the three-separate-identity-systems architecture.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Ops & Admin domain doc

**Files:**
- Create: `docs/modules/ops-admin.md`

**Interfaces:**
- Consumes: nothing from other tasks (can run in parallel with Tasks 2-6).
- Produces: `docs/modules/ops-admin.md`, linked from Task 8's `README.md`.

Resources in scope: **Notifications** (full CRUD per controller decorators), **ReportGenerationLogs** (full CRUD per controller decorators), **PaymentTransactions** (full CRUD per controller decorators), **ActivityLogs** (create + get-by-id only), **PlatformConfigurations** (create + get-by-id only), **Expenses** (create + get-by-id only).

- [ ] **Step 1: Read source for all 6 resources**

Controller, create DTO, create command handler, entity for `notifications`, `report-generation-logs`, `payment-transactions`, `activity-logs`, `platform-configurations`, `expenses`.

Known DTO shapes from this session's research (re-verify against the entity, don't assume they're wrong or right): `CreateNotificationRequest` uses `userId`/`orgId`/`type`/`title`/`body`. `CreateReportLogRequest` uses `orgId`/`reportType`/`status`. `CreatePaymentTransactionRequest` uses `orgId`/`referenceId`/`referenceType`/`type`/`method`/`amount`/`status` — a prior session confirmed this one's entity column is actually `organizationId` (`@Column({ name: 'org_id' })` in TypeORM but the TS property is `organizationId`), i.e. the DTO's `orgId` field name doesn't match the command/entity's `organizationId` property — check whether Notifications and ReportGenerationLogs share this exact same `orgId`-vs-`organizationId` mismatch, since they use the identical DTO pattern. `CreateActivityLogRequest` uses `organizationId`/`userId?`/`action`/`entityName`/`entityId`/`details?`. `CreatePlatformConfigurationRequest` uses `configKey`/`configValue`/`description?`. `CreateExpenseRequest` uses `organizationId`/`storeId?`/`category`/`amount`/`expenseDate`/`description?`.

- [ ] **Step 2: Live-test list/get for the 3 full-CRUD resources**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" "https://core-apis-m03n.onrender.com/api/v1/notifications/list?orgId=00000000-0000-4000-8000-000000000001"
curl -s -w "\nHTTP_STATUS:%{http_code}\n" "https://core-apis-m03n.onrender.com/api/v1/report-generation-logs/list?orgId=00000000-0000-4000-8000-000000000001"
curl -s -w "\nHTTP_STATUS:%{http_code}\n" "https://core-apis-m03n.onrender.com/api/v1/payment-transactions/list?orgId=00000000-0000-4000-8000-000000000001"
```

- [ ] **Step 3: Live-test create for all 6**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-4000-8000-000000000001","orgId":"00000000-0000-4000-8000-000000000001","type":"info","title":"Docs Diag","body":"diagnostic notification"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/report-generation-logs \
  -H "Content-Type: application/json" \
  -d '{"orgId":"00000000-0000-4000-8000-000000000001","reportType":"docs-diag"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/payment-transactions \
  -H "Content-Type: application/json" \
  -d '{"orgId":"00000000-0000-4000-8000-000000000001","referenceId":"00000000-0000-4000-8000-000000000001","referenceType":"docs-diag","type":"payment","method":"cash","amount":100}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/activity-logs \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"00000000-0000-4000-8000-000000000001","action":"docs-diag","entityName":"DiagEntity","entityId":"00000000-0000-4000-8000-000000000001"}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/platform-configurations \
  -H "Content-Type: application/json" \
  -d '{"configKey":"docs.diag.key","configValue":{"enabled":true}}'

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://core-apis-m03n.onrender.com/api/v1/expenses \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"00000000-0000-4000-8000-000000000001","category":"docs-diag","amount":50,"expenseDate":"2026-07-26"}'
```

`userId` in the Notifications payload uses the org id as a placeholder since no real user id is discoverable (see Task 6's Users finding) — note this as a fabricated FK in the doc, same disclosure standard as elsewhere in this plan. For every `2xx` on Notifications/ReportGenerationLogs/PaymentTransactions (the 3 full-CRUD ones), test `PUT`/`DELETE` and clean up.

- [ ] **Step 4: Read client state**

Read `renderer/src/pages/Notifications.tsx`, `ReportGenerationLogs.tsx`, `PaymentTransactions.tsx`, their `api.ts`/`types.ts` entries. Check whether ActivityLogs/PlatformConfigurations/Expenses have any client page at all (search `renderer/src/pages/` — if none exist, that's a client-side gap: "backend supports create+get, no UI exists yet").

- [ ] **Step 5: Write `docs/modules/ops-admin.md`**

Follow the §4 template.

- [ ] **Step 6: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/ops-admin.md
git commit -m "$(cat <<'EOF'
Add docs/modules/ops-admin.md with live-verified capability matrix

Covers Notifications, ReportGenerationLogs, PaymentTransactions,
ActivityLogs, PlatformConfigurations, Expenses. Evidence gathered by
reading core-apis source directly and curling the deployed instance,
per the module-wise docs restructure plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: README index

**Files:**
- Create: `docs/modules/README.md`

**Interfaces:**
- Consumes: `docs/modules/foundation.md`, `purchase.md`, `sales.md`, `inventory.md`, `auth-access.md`, `ops-admin.md` from Tasks 2-7 — this task must run last, after all six exist.
- Produces: the entry point for anyone opening `docs/modules/`.

- [ ] **Step 1: Read all 6 domain docs**

Confirm all six files from Tasks 2-7 exist and skim each for its confirmed findings.

- [ ] **Step 2: Re-confirm the no-`@UseGuards` finding applies repo-wide**

```bash
cd "D:\WorkSpace\core-apis"
grep -rl "UseGuards" src/application/modules --include="*.controller.ts"
```

Expected: only `auth.controller.ts` appears (confirmed twice already this session — by the original 2026-07-26 diagnostic and by Task 6's direct read). If any other controller now appears, that's a change since this plan was written — document what's actually found, not the expected result.

- [ ] **Step 3: Write `docs/modules/README.md`**

Structure:
1. **What this is** — one paragraph: module-wise (not phase-wise) documentation of `core-apis` capability + `core-erp-client` state, one file per business domain, links to all 6.
2. **Cross-cutting: no authentication on any business controller** — state the Step 2 finding, explain the consequence (every write endpoint in every domain doc is reachable with no credentials, and this is the most likely root cause of every "`organizationId` never reaches the command" bug found across the 6 domain docs — cite 2-3 concrete examples pulled from the domain docs' gap lists).
3. **Cross-cutting: DTO-must-be-subset-of-entity recommendation** — the single CI check that would have caught the largest number of confirmed bugs across all 6 domains; list which resources hit this bug class (pull the count from the domain docs).
4. **Vehicles/Fleet is intentionally mock-only** — one paragraph: no backend entity/controller exists (confirm via `find "D:/WorkSpace/core-apis/src" -iname "*vehicle*"` returning nothing), `renderer/src/pages/VehiclesPage.tsx`/`VehicleDetailPage.tsx` run on in-memory mock data by prior confirmed decision, not in scope to build.
5. **Domain doc index** — table: domain | file | resources covered | one-line status summary (e.g. "3/3 creates broken, backend must fix" or "5/5 full CRUD confirmed working").

- [ ] **Step 4: Commit**

```bash
cd "D:\WorkSpace\core-erp-client"
git add docs/modules/README.md
git commit -m "$(cat <<'EOF'
Add docs/modules/README.md index with cross-cutting findings

Ties together the 6 domain docs (foundation/purchase/sales/inventory/
auth-access/ops-admin), surfaces the no-auth-guards finding and the
DTO-subset-of-entity CI recommendation at the top level instead of
duplicating them per domain, and notes the confirmed Vehicles-mock
decision. Completes the module-wise docs restructure.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
