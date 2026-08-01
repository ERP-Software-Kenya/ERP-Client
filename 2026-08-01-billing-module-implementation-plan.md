# Billing Module — Implementation Plan

**Date:** 2026-08-01  
**Branch:** `feat/billing-module`  
**Scope:** Customer-facing sales bill (header + line items), Customer module gap-fill, inventory deduction on completion.

---

## Context

The existing `BillEntity` is a broken placeholder linked to `SupplierEntity` + `StoreEntity` (purchase-payable semantics). It is being **redefined** as the customer-facing sales bill. Purchase payables are already covered by `PurchaseOrderEntity` + `PurchaseItemEntity`.

The new `BillEntity` tracks:
- **Who** created it (`createdById` → `UserEntity`)
- **Where** stock is drawn from (`locationId` → `LocationEntity`: `store | warehouse`)
- **Who** is buying (nullable `customerId` → `CustomerEntity`, or walk-in inline fields)
- **What** is sold (`BillItemEntity` lines with quantity, price snapshot, tax, discount)
- **Status lifecycle**: `INITIATED → DRAFT → COMPLETED` / `CANCELLED`

---

## Final Schema

### `BillEntity` — `core.bills` (redefine existing)

| Column | TypeORM type | Constraints |
|---|---|---|
| `id` | `uuid` PK | auto |
| `billNumber` | `varchar(50)` | unique, not null |
| `organizationId` | `uuid` FK→Organizations | not null |
| `locationId` | `uuid` FK→Locations | not null |
| `customerId` | `uuid` FK→Customers | nullable |
| `createdById` | `uuid` FK→Users | not null |
| `walkInName` | `varchar(255)` | nullable |
| `walkInPhone` | `varchar(20)` | nullable |
| `walkInGstin` | `varchar(50)` | nullable |
| `status` | `enum` | `INITIATED \| DRAFT \| COMPLETED \| CANCELLED` |
| `subtotal` | `decimal(18,4)` | default 0 |
| `taxAmount` | `decimal(18,4)` | default 0 |
| `discountAmount` | `decimal(18,4)` | default 0 |
| `totalAmount` | `decimal(18,4)` | default 0 |
| `notes` | `text` | nullable |
| `paymentMethod` | `enum` | `CASH \| CARD \| UPI \| NET_BANKING \| CHEQUE \| CREDIT` — nullable, set on COMPLETED |
| `billedAt` | `timestamp` | nullable — set on COMPLETED |
| `createdAt` | `timestamp` | auto |
| `updatedAt` | `timestamp` | auto, nullable |
| `deletedAt` | `timestamp` | soft-delete, nullable |

Relations: `ManyToOne` → Organization, Location, Customer (nullable), User (createdBy); `OneToMany` → BillItemEntity.

### `BillItemEntity` — `core.bill_items` (new)

| Column | TypeORM type | Constraints |
|---|---|---|
| `id` | `uuid` PK | auto |
| `billId` | `uuid` FK→Bills | not null |
| `productId` | `uuid` FK→Products | not null |
| `variantId` | `uuid` FK→ProductVariants | nullable |
| `quantity` | `decimal(18,4)` | not null |
| `unitPrice` | `decimal(18,4)` | not null — snapshot at billing time |
| `taxRate` | `decimal(5,2)` | default 0 — percentage (e.g. `18.00`) |
| `taxAmount` | `decimal(18,4)` | default 0 — `qty × unitPrice × taxRate / 100` |
| `discountAmount` | `decimal(18,4)` | default 0 |
| `lineTotal` | `decimal(18,4)` | not null — `(qty × unitPrice) + taxAmount − discountAmount` |

Relations: `ManyToOne` → Bill (cascade delete), Product, ProductVariant (nullable).

### `CustomerEntity` — `core.customers` (no column changes)

Existing columns (`id`, `organizationId`, `name`, `email`, `phone`, `gstin`, `createdAt`, `updatedAt`, `deletedAt`) are sufficient.  
Only the module layer is extended (list, update, delete).

---

## Status Lifecycle

```
INITIATED ──► DRAFT ──► COMPLETED  (terminal — triggers inventory deduction)
    │              │
    └──────────────┴──► CANCELLED  (terminal — no inventory change)
```

- `INITIATED`: header + items freely editable.
- `DRAFT`: items locked; only status transition allowed.
- `COMPLETED`: deducts `BillItem.quantity` from `InventoryEntity.quantityOnHand` at `bill.locationId` for each product, inside a single DB transaction.
- `CANCELLED`: no stock change.

Edit guard rule: any mutation to header fields or items is rejected if `status !== 'INITIATED'`.

---

## Implementation Steps

### Phase 1 — Schema & Infrastructure

**Step 1 — Add `BillItems` table name**  
File: `src/infrastructure/persistence/entities/e-core-table-name.ts`  
Add: `BillItems = 'bill_items'` to `ECoreTableName`.

---

**Step 2 — Rewrite `bill.entity.ts`**  
File: `src/infrastructure/persistence/entities/bill.entity.ts`  
Replace the current supplier-linked entity with the schema above.  
FK constraint names follow the existing pattern:
- `FK__bills__organizations`
- `FK__bills__locations`
- `FK__bills__customers`
- `FK__bills__users` (for `createdById`)

Export `EBillStatus` enum (`INITIATED | DRAFT | COMPLETED | CANCELLED`) from this file.

---

**Step 3 — Create `bill-item.entity.ts`**  
File: `src/infrastructure/persistence/entities/bill-item.entity.ts`  
New entity. FK constraint names:
- `FK__bill_items__bills` (`onDelete: 'CASCADE'`)
- `FK__bill_items__products`
- `FK__bill_items__product_variants`

---

**Step 4 — Register `BillItemEntity` in the entities index**  
File: `src/infrastructure/persistence/entities/index.ts`  
Add import + re-export + add `BillItemEntity` to the default array.

---

**Step 5 — Add injection token**  
File: `src/application/constants.ts`  
Add: `export const BILL_ITEM_REPO = 'BILL_ITEM_REPO';`

---

**Step 6 — Create `bill-item.repo.ts`**  
File: `src/infrastructure/persistence/repositories/bill-item.repo.ts`  
Standard TypeORM repository extending the base repo pattern (follow `product-supplier.repo.ts` as reference).  
Export from `src/infrastructure/persistence/index.ts` (add to barrel).

---

**Step 7 — Update `InfrastructureModule`**  
File: `src/infrastructure/infrastructure.module.ts`  
Add `BillItemRepo` import, `BILL_ITEM_REPO` token, and register as provider + export in `forRoot()`.

---

**Step 8 — Generate migration**  
Command: `npm run migration:generate -- src/infrastructure/persistence/migrations/billing-module-schema`  
Verify the generated SQL:
- `ALTER TABLE core.bills` drops `supplier_id`, `store_id`; adds all new columns.
- `CREATE TABLE core.bill_items` with all columns and FK constraints.
- Down migration exists and reverses the above.

---

### Phase 2 — Customer Module (gap-fill)

Current gaps: list/search (paginated), update, delete.

**Step 9 — Add `CustomerFilter` domain model**  
File: `src/application/modules/customers/domain/customer.filter.ts`  
Fields: `organizationId?`, `name?` (substring search), `phone?`, `$page?`, `$perPage?`.

**Step 10 — Add search query**  
Files:
- `src/application/modules/customers/queries/search-customers/search-customers.query.ts`
- `src/application/modules/customers/queries/search-customers/search-customers.query-handler.ts`
- `src/application/modules/customers/queries/search-customers/index.ts`

Handler injects `CUSTOMER_REPO`, executes paginated query with optional `name` ILIKE and `phone` filter.

**Step 11 — Add `UpdateCustomerCommand`**  
Files:
- `src/application/modules/customers/commands/update-customer/update-customer.command.ts`
- `src/application/modules/customers/commands/update-customer/update-customer.command-handler.ts`
- `src/application/modules/customers/commands/update-customer/index.ts`

Updatable fields: `name`, `email`, `phone`, `gstin`.

**Step 12 — Add `DeleteCustomerCommand`**  
Files:
- `src/application/modules/customers/commands/delete-customer/delete-customer.command.ts`
- `src/application/modules/customers/commands/delete-customer/delete-customer.command-handler.ts`
- `src/application/modules/customers/commands/delete-customer/index.ts`

Uses soft delete (`softDelete` / `deletedAt`).

**Step 13 — Add request/response models**  
Files:
- `src/application/modules/customers/models/requests/search-customers.request.ts` — `organizationId?`, `name?`, `phone?`, `$page?`, `$perPage?`
- `src/application/modules/customers/models/requests/update-customer.request.ts` — `name?`, `email?`, `phone?`, `gstin?`

**Step 14 — Update `CustomersController`**  
File: `src/application/modules/customers/customers.controller.ts`  
Add endpoints:
- `GET /v1/customers` — paginated search
- `PATCH /v1/customers/:id` — update
- `DELETE /v1/customers/:id` — soft delete

**Step 15 — Update `CustomersModule`**  
File: `src/application/modules/customers/customers.module.ts`  
Add new command + query handlers to `providers`.

---

### Phase 3 — Bills Module (full rework)

**Step 16 — Domain models**  
Files:
- `src/application/modules/bills/domain/bill.model.ts` — rewrite with all new fields; add `items?: BillItem[]`
- `src/application/modules/bills/domain/bill-item.model.ts` — new model for line items
- `src/application/modules/bills/domain/index.ts` — re-export both

**Step 17 — Request/response models**  
Files to rewrite/create under `src/application/modules/bills/models/`:

`requests/`:
- `create-bill.request.ts` — `organizationId`, `locationId`, `customerId?`, `walkInName?`, `walkInPhone?`, `walkInGstin?`, `notes?`, `items: CreateBillItemRequest[]`
- `create-bill-item.request.ts` — `productId`, `variantId?`, `quantity`, `unitPrice`, `taxRate?`, `discountAmount?`
- `update-bill.request.ts` — `locationId?`, `customerId?`, `walkIn*?`, `notes?` (header-only, INITIATED only)
- `update-bill-item.request.ts` — `quantity?`, `unitPrice?`, `taxRate?`, `discountAmount?`
- `transition-bill-status.request.ts` — `status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'`
- `search-bills.request.ts` — `organizationId?`, `locationId?`, `customerId?`, `status?`, `dateFrom?`, `dateTo?`, `$page?`, `$perPage?`
- `list-bills.request.ts` — `organizationId?`, `locationId?`, `status?`

`responses/`:
- `bill.response.ts` — all bill fields + `items?: BillItemResponse[]`
- `bill-item.response.ts` — all item fields

**Step 18 — Mapper profile**  
File: `src/application/modules/bills/mapper/bill.profile.ts`  
Map: `BillEntity → Bill`, `Bill → BillResponse`, `CreateBillRequest → CreateBillCommand`, `BillItemEntity → BillItem`, `BillItem → BillItemResponse`.

**Step 19 — Commands**

`CreateBillCommand` / handler (`src/application/modules/bills/commands/create-bill/`):
- Injects `BILL_REPO`, `BILL_ITEM_REPO`.
- Validates: if `customerId` is null, `walkInName` must be present.
- Generates `billNumber` as `BILL-${YYYYMMDD}-${zeroPad(count+1, 4)}` using a count of existing bills for that date.
- Saves bill header with `status = INITIATED`, then saves each item in bulk.
- Returns populated `Bill` domain model.

`UpdateBillCommand` / handler (`src/application/modules/bills/commands/update-bill/`):
- Rejects if `status !== 'INITIATED'`.
- Updates header fields only.

`AddBillItemCommand` / handler (`src/application/modules/bills/commands/add-bill-item/`):
- Rejects if `status !== 'INITIATED'`.
- Saves item; recalculates and updates bill totals (subtotal, taxAmount, totalAmount).

`UpdateBillItemCommand` / handler (`src/application/modules/bills/commands/update-bill-item/`):
- Rejects if `status !== 'INITIATED'`.
- Updates item; recalculates bill totals.

`RemoveBillItemCommand` / handler (`src/application/modules/bills/commands/remove-bill-item/`):
- Rejects if `status !== 'INITIATED'`.
- Deletes item; recalculates bill totals.

`TransitionBillStatusCommand` / handler (`src/application/modules/bills/commands/transition-bill-status/`):
- Validates allowed transitions (see lifecycle above).
- On `COMPLETED`:
  - Sets `billedAt = NOW()`.
  - Opens a DB transaction.
  - For each `BillItem`: decrements `InventoryEntity.quantityOnHand` at `bill.locationId` for `item.productId`. Throws if stock is insufficient.
  - Commits; returns updated bill.
- On `CANCELLED`: updates status only, no stock change.

`DeleteBillCommand` / handler (`src/application/modules/bills/commands/delete-bill/`):
- Soft deletes bill. Allowed only when `status = INITIATED | DRAFT`.

**Step 20 — Queries**

`SearchBillsQuery` / handler (`src/application/modules/bills/queries/search-bills/`):
- Paginated; filters: `organizationId`, `locationId`, `customerId`, `status`, date range on `createdAt`.
- Eager-loads `items`, `customer`, `location`, `createdBy`.

`ListBillsQuery` / handler (`src/application/modules/bills/queries/list-bills/`):
- Non-paginated flat list; filters: `organizationId`, `locationId`, `status`.

`GetBillQuery` / handler (`src/application/modules/bills/queries/get-bill/`):
- Fetch single bill by `id`; eager-loads all relations including items → product.

**Step 21 — Controller**  
File: `src/application/modules/bills/bills.controller.ts`  
Rewrite with:

| Method | Path | Command / Query |
|---|---|---|
| `POST` | `/v1/bills` | `CreateBillCommand` |
| `GET` | `/v1/bills` | `SearchBillsQuery` |
| `GET` | `/v1/bills/list` | `ListBillsQuery` |
| `GET` | `/v1/bills/:id` | `GetBillQuery` |
| `PUT` | `/v1/bills/:id` | `UpdateBillCommand` |
| `DELETE` | `/v1/bills/:id` | `DeleteBillCommand` |
| `POST` | `/v1/bills/:id/items` | `AddBillItemCommand` |
| `PUT` | `/v1/bills/:id/items/:itemId` | `UpdateBillItemCommand` |
| `DELETE` | `/v1/bills/:id/items/:itemId` | `RemoveBillItemCommand` |
| `PATCH` | `/v1/bills/:id/status` | `TransitionBillStatusCommand` |

**Step 22 — `BillsModule`**  
File: `src/application/modules/bills/bills.module.ts`  
Add all new command + query handlers to `providers`. No direct imports of repos needed (injected via DI tokens from `InfrastructureModule`).

---

## Totals Recalculation Logic

Called after any item add, update, or remove. Runs inside the command handler before saving the bill header.

```
subtotal      = Σ (item.quantity × item.unitPrice) for all items
taxAmount     = Σ item.taxAmount for all items
totalAmount   = subtotal + taxAmount − bill.discountAmount
```

Bill-level `discountAmount` is set on the header only (not recomputed from items).

---

## Bill Number Generation

Pattern: `BILL-YYYYMMDD-NNNN` (zero-padded sequence, resets per day).

Implementation: count existing non-deleted bills where `DATE(createdAt) = today` in the `CreateBillCommand` handler, increment by 1, format with `padStart(4, '0')`.

---

## Inventory Deduction (COMPLETED transition)

Inside a TypeORM `QueryRunner` transaction:

```
For each BillItem:
  inventory = find InventoryEntity WHERE organizationId = bill.organizationId
                                     AND locationId    = bill.locationId
                                     AND productId     = item.productId

  if inventory.quantityOnHand < item.quantity:
    ROLLBACK → throw InsufficientStockException

  inventory.quantityOnHand -= item.quantity
  SAVE inventory
```

If any product has insufficient stock, the entire transaction is rolled back and the bill stays in `DRAFT`.

---

## Validation Rules

| Rule | Where enforced |
|---|---|
| `customerId` null → `walkInName` required | `CreateBillCommand` handler |
| Header/item mutations blocked unless `INITIATED` | All update/add/remove command handlers |
| Status transition must follow allowed graph | `TransitionBillStatusCommand` handler |
| Insufficient stock → rollback | `TransitionBillStatusCommand` handler (COMPLETED path) |
| `COMPLETED` / `CANCELLED` cannot be deleted | `DeleteBillCommand` handler |

---

## Files Created / Modified Summary

**New files:**
- `src/infrastructure/persistence/entities/bill-item.entity.ts`
- `src/infrastructure/persistence/repositories/bill-item.repo.ts`
- `src/application/modules/bills/domain/bill-item.model.ts`
- `src/application/modules/bills/models/requests/create-bill-item.request.ts`
- `src/application/modules/bills/models/requests/update-bill-item.request.ts`
- `src/application/modules/bills/models/requests/transition-bill-status.request.ts`
- `src/application/modules/bills/models/responses/bill-item.response.ts`
- `src/application/modules/bills/commands/add-bill-item/` (3 files)
- `src/application/modules/bills/commands/update-bill-item/` (3 files)
- `src/application/modules/bills/commands/remove-bill-item/` (3 files)
- `src/application/modules/bills/commands/transition-bill-status/` (3 files)
- `src/application/modules/customers/queries/search-customers/` (3 files)
- `src/application/modules/customers/commands/update-customer/` (3 files)
- `src/application/modules/customers/commands/delete-customer/` (3 files)
- `src/application/modules/customers/models/requests/search-customers.request.ts`
- `src/application/modules/customers/models/requests/update-customer.request.ts`
- `src/infrastructure/persistence/migrations/<timestamp>-billing-module-schema.ts`

**Modified files:**
- `src/infrastructure/persistence/entities/e-core-table-name.ts`
- `src/infrastructure/persistence/entities/bill.entity.ts`
- `src/infrastructure/persistence/entities/index.ts`
- `src/application/constants.ts`
- `src/infrastructure/infrastructure.module.ts`
- `src/application/modules/bills/domain/bill.model.ts`
- `src/application/modules/bills/domain/index.ts`
- `src/application/modules/bills/mapper/bill.profile.ts`
- `src/application/modules/bills/models/requests/bill.request.ts` (rewrite)
- `src/application/modules/bills/models/responses/bill.response.ts` (rewrite)
- `src/application/modules/bills/commands/create-bill/` (rewrite)
- `src/application/modules/bills/commands/update-bill/` (rewrite)
- `src/application/modules/bills/commands/delete-bill/` (rewrite)
- `src/application/modules/bills/queries/search-bills/` (rewrite)
- `src/application/modules/bills/queries/list-bills/` (rewrite)
- `src/application/modules/bills/queries/get-bill/` (rewrite)
- `src/application/modules/bills/bills.controller.ts`
- `src/application/modules/bills/bills.module.ts`
- `src/application/modules/customers/customers.controller.ts`
- `src/application/modules/customers/customers.module.ts`
- `src/application/modules/customers/domain/index.ts`
- `src/application/modules/customers/commands/index.ts`
- `src/application/modules/customers/queries/index.ts`
- `src/application/modules/customers/models/index.ts`
