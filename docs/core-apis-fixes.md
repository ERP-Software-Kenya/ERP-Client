# Core API changes needed by ERP-Client

**Date:** 2026-07-31  
**Rule:** Do **not** change `core-apis` from the client alignment work unless you explicitly approve items below.  
**Live docs:** https://core-apis-m03n.onrender.com/api/docs  
**Client status:** Almost every Swagger module is already wired. Gaps below block real UX.

### Client Option B (2026-07-31) — superseded after source audit
Option B re-enabled creates; live/source check showed several creates **cannot** succeed via any client payload.

### Client stance after core-apis source check (2026-07-31) — **no Core API edits**
Verified in local `D:\ERP\core-apis` (read-only):

| Create | Client | Why (Core API) |
|--------|--------|----------------|
| Customers | **Blocked** | No `organizationId` on command; no auth injection |
| Bills | **Blocked** | Request fields ≠ command/entity; no `@AutoMap` on request |
| Payments | **Blocked** | No `@AutoMap` on request; `orgId` ≠ entity `organizationId` |
| Purchase orders | **Blocked** | Handler only `{ name }`; entity needs store/supplier/poNumber |
| Purchase items | **Blocked** | `quantity`/`unitPrice` ≠ `quantityOrdered`/`unitCost` |
| Item returns | **Blocked** | Request has no `@AutoMap` |
| Orders / Invoices | **Enabled** | Work if FK ids already exist |
| Expenses | **Enabled** | Request has proper `@AutoMap` + fields |

List/browse kept working where search exists. UUID lookup for create-only resources. Lists still missing for stock-transfers / unpublished-stock / activity-logs / customers / orders / invoices.

Referenced from UI banners and comments as `docs/core-apis-fixes.md` (this file).

---

## Priority legend

| P | Meaning |
|---|--------|
| P0 | Breaks create/save for a primary workflow |
| P1 | Missing endpoint; client can only look up by UUID |
| P2 | Incomplete feature / polish |

---

## P0 — Create / DTO / tenancy blockers

### #0 — Purchase Orders create/update incomplete
- **Symptom:** Create fails server-side even with only `name` (live-tested 2026-07-26). Response DTO only exposes `name`; DB has supplier/store/totals that are not on the API contract.
- **Client impact:** Purchase Orders create/update disabled; PO detail limited.
- **Ask of Core API:** Expand create/update/response DTOs to real fields (`supplierId`, `storeId`, status, totals, dates) and fix create handler so org/tenancy is set correctly.

### #0b — Purchase Order line / related actions
- **Client impact:** Some PO detail actions stay disabled.
- **Ask:** Expose stable APIs for PO lines / receive flows the UI expects (document exact contract if different).

### #0c — Bills ↔ Purchase Order linkage missing
- **Symptom:** Bill DTOs are `orgId` / `billNumber` / `amount` / `status`. Create 500s: entity needs `supplierId` / `storeId` / `totalAmount` which the DTO never sets. No field links Bill → PurchaseOrder.
- **Client impact:** Bills create/update disabled; cannot attach bill to PO.
- **Ask:** Align Bill create DTO with entity; add optional `purchaseOrderId` (or documented link pattern).

### #0d — Payment transactions `orgId` vs `organizationId`
- **Symptom:** Domain/DTO use `orgId`; entity column is `organizationId`. Create 500s.
- **Client impact:** Recording payments from Bill detail blocked.
- **Ask:** Map `orgId` → `organizationId` in command handler (or rename consistently).

### #0e — Item returns
- **Symptom:** No `returnNumber` field; returns cannot cleanly reference a PurchaseOrder in current contract.
- **Ask:** Document or add stable return number + PO/order reference fields.

### #1 — Bills / POs list-search instability
- **Symptom:** Client banners note list/search 500s and field mismatches (historical).
- **Ask:** Re-verify deployed search/list; fix remaining 500s and document wire shape.

### #8 — Customers (and cascade) organizationId never set
- **Symptom:** `CreateCustomer` does not set NOT-NULL `organizationId` → every create 500s.
- **Client impact:** Customers create disabled; Orders / Invoices / POS sales path blocked downstream.
- **Ask:** Set `organizationId` from auth context (Clerk org) in create command.

### #10 — Auth / tenancy on thin creates
- **Related to #8.** Ensure all create commands that require org scope read org from the authenticated user, not the client body alone.

---

## P1 — Missing list / search endpoints

| Resource | Today | Client workaround | Ask |
|----------|-------|-------------------|-----|
| Stock transfers | create, getById, complete, cancel only | **Client:** browser recent list (newest first) via `lib/recentIds.ts` | `GET /api/v1/stock-transfers` (+ optional `/list`) |
| Unpublished stock | getById, by-record, add, publish only | **Client:** browser recent list; add returns void so UUID must be pasted | `GET /api/v1/unpublished-stock` (+ optional `/list`) |
| Activity logs | create + getById only | UUID lookup; Audit Log demo removed | `GET /api/v1/activity-logs` search/list for real audit directory |

---

## P2 — Product image presigned flow incomplete

### Current (live API)
1. `GET /api/v1/products/:id/image/presigned-url?mimeType=…` → `{ uploadUrl, key, publicUrl }`
2. Client `PUT` to `uploadUrl`
3. **No confirm endpoint** — object may sit in R2; **no** `product_images` row; gallery (`GET …/images`) unchanged.

Multipart `POST /api/v1/products/:id/images` still works and is the client default.

### Scaffold note (local core-apis)
Folder `src/application/modules/products/commands/confirm-product-image/` exists but is **empty** (no handler/DTO/controller route). Live Swagger has **no** confirm path.

### Ask of Core API (when you approve backend work)
1. Implement `ConfirmProductImageCommand` + handler: verify object exists at `key`, insert `product_images` row (prefer key pattern consistent with multipart, or accept presigned key `products/{id}/image`).
2. Expose e.g. `POST /api/v1/products/:id/images/confirm` body `{ key: string, isPrimary?: boolean }` → `ProductImageResponse`.
3. Fix Swagger text on `ProductImageUploadUrlResponse.key` (“pass as imageKey…”) to match the real field name `key`.
4. Consider unique keys per upload (timestamp) so direct R2 does not overwrite.

### Client follow-up (after Core API ships)
- Call confirm after successful PUT.
- Invalidate `['products', id, 'images']`.
- Drop amber “not in gallery” warning; keep Advanced R2 as optional fast path.

---

## P2 — Other frontend-only / out of scope here

| Item | Notes |
|------|--------|
| Vehicles | No Core API module; client keeps mock UI on purpose |
| Org / user addresses | Removed from client (no API) |
| `POST /auth/token` | Dev-only; client uses Clerk — do not require in prod UI |

---

## Suggested Core API work order

1. **#8** Customers `organizationId` (unblocks Orders, Invoices, POS sales)  
2. **#0 / #0c / #0d** PO + Bills + Payments DTO/handler alignment  
3. **Presigned confirm** endpoint (completes Direct R2)  
4. **List** stock-transfers + unpublished-stock + activity-logs  

When an item is fixed and deployed, tell the client team the issue id — UI `disabled` buttons and amber banners can then be removed.

---

## Verification checklist (for Core API owners)

- [ ] `POST /customers` with valid Clerk token creates a row with `organizationId`  
- [ ] `POST /purchase-orders` with realistic body succeeds  
- [ ] `POST /bills` succeeds and can reference a PO if designed  
- [ ] `POST /payment-transactions` succeeds with `organizationId` mapped  
- [ ] `POST /products/:id/images/confirm` (or agreed path) after presigned PUT returns gallery image  
- [ ] `GET /stock-transfers` and `GET /unpublished-stock` return org-scoped pages  
- [ ] `GET /activity-logs` search returns pages for Audit Log UI  

---

## Implementation appendix (for Core API engineers)

> Sourced from code exploration of local `core-apis` (2026-07-31). Still **do not implement** until explicitly approved.

### Ranked order (refined)

| # | Work | Why | Rough size |
|---|------|-----|------------|
| 1 | **#8 Customers** + ClerkAuthGuard / `@CurrentUser()` tenancy on thin creates (#1/#10) | Unblocks customer → order → invoice → POS sales | ~3–5 files |
| 2 | **Orders create** retest after #8; align command vs `OrderEntity` if still 500 | FK / required columns | ~2–5 files |
| 3 | **Invoices** guards + depends on real `orderId` | Consistency | ~1–2 files |
| 4 | **Product image confirm** | Completes client Direct R2 path | ~7–9 files |
| 5 | **List unpublished-stock** | Filter + paged DTO already exist | ~8 new + 5 edits |
| 6 | **List stock-transfers** | Need real `StockTransferFilter` + paged response | ~10 new + 6 edits |
| 7 | Defer unless needed: #0–#0e PO/Bills/Payments/returns DTO overhauls | Larger procurement surface | varies |

Working tenancy reference: `products.controller.ts` (`ClerkAuthGuard` + `command.organizationId = user.organizationId`).

Thin controllers lacking that pattern today include: `customers`, `orders`, `invoices`, `expenses`, `bills`, `purchase-orders`, `purchase-items`, `payment-transactions`, `item-returns`, `notifications`, `activity-logs`, …

---

### A. Product image confirm — concrete contract

**Do not overload** multipart `POST :id/images`. Add:

```
POST /api/v1/products/:id/images/confirm
Body: { key: string; sortOrder?: number; isPrimary?: boolean }
201: ProductImageResponse
```

Handler (mirror `AddProductImageCommandHandler` without buffer upload):
1. Prefix-check `key` starts with `products/{productId}/`
2. `storage.existsAsync(key)`
3. `imageRepo.createAsync` with `storageKey = key`, `uploadedById` from `@CurrentUser()`
4. Return mapped `ProductImageResponse` + `url` via `getUrlAsync`

**Files to touch (under `core-apis/src/application/modules/products/`):**
- `models/requests/confirm-product-image.request.ts` (+ `requests/index.ts`)
- `commands/confirm-product-image/` — fill empty folder: command + handler
- `commands/index.ts` — export/register handler
- `mapper/product.profile.ts`
- `products.controller.ts` — route before/alongside existing image routes; same guards as other mutations

**Note:** Presign currently uses fixed key `products/{id}/image` (overwrite). Multipart uses `products/{id}/images/{timestamp}`. Confirm should accept the returned `key` as-is; unique keys are a later improvement.

**Client after deploy:** `useProductImagePresignedUpload` → PUT → `POST …/images/confirm` → invalidate gallery; remove amber Advanced warning.

---

### B. List unpublished-stock — mirror inventory

**Already present:** `UnpublishedStockFilter` (`organizationId?`, `locationId?`, `productId?`), `UnpublishedStocksPagedResponse`, `BaseRepo.allAsync` / `pagedAsync`.

**Add (copy inventory list/search stack):**
- `queries/list-unpublished-stock/`, `queries/search-unpublished-stock/`
- `models/requests/list-unpublished-stock.request.ts`, `search-unpublished-stock.request.ts`
- `helpers/unpublished-stock-filter.normalizer.ts`, `options/unpublished-stock-feature.options.ts`
- Controller: `GET /` (paged) + `GET /list` **before** `GET :id`
- Wire `queries/index.ts`, `mapper/unpublished-stock.profile.ts`, `unpublished-stock.module.ts`

---

### C. List stock-transfers — mirror suppliers + define filter

**Blockers to fix first:**
- `StockTransferFilter` is currently `Record<string, never>` — define e.g. `{ organizationId?, fromStoreId?, toStoreId?, status? }`
- Add `StockTransfersPagedResponse`

**Then add** list/search query + request + normalizer + options + controller `GET /` + `GET /list` **before** `GET :id` (same pattern as bills/inventory/suppliers).

**Repo:** no new methods needed (`BaseRepo` already has `allAsync` / `pagedAsync`). Optional: soft-delete filtering (`deletedAt` on entity).

---

### D. Customers #8 — minimal fix files

- `create-customer.command.ts` — add `@AutoMap() organizationId`
- `customers.controller.ts` — `ClerkAuthGuard` / `RolesGuard`, `@CurrentUser()`, set `command.organizationId = user.organizationId` on create
- Retest `POST /orders` / `POST /invoices` after customers work (order entity has no `organizationId` column — failures are often FK to missing customer)

---

### E. Client follow-up checklist (ERP-Client only, after Core API deploy)

- [ ] Enable Customers / Orders / Invoices create buttons; remove amber blockers for #8  
- [ ] Wire stock-transfers + unpublished-stock to `createResource` or list hooks; replace UUID-only directory UX  
- [ ] Presigned upload: confirm + gallery invalidate; demote Advanced warning  
- [ ] Audit Log: switch from get-by-id to search table when activity-logs list exists  
