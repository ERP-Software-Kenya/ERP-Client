# Core-apis full endpoint audit

**Date:** 2026-07-30
**Status:** Source audit only — no live HTTP probes (API not running locally)
**Scope:** Every NestJS controller under `core-apis/src` (28 controllers, 135 routes)
**Base URL pattern:** `/api/v1/<resource>` (globalPrefix=`api`, URI version=`1`)
**Auth:** `ClerkAuthGuard` + `RolesGuard` on all domain controllers; only `POST /auth/token` is `@AllowAnonymous`
**CQRS wiring:** 135/135 handlers call `mediator.execute` with a Command/Query (verified statically)

---

## Summary

| Metric | Count |
|--------|------:|
| Controllers | 28 |
| HTTP endpoints | 135 |
| Full CRUD modules (search+list+create+get+update+delete) | 13 |
| Create+get only (thin) modules | 11 |

### Full CRUD
`bills`, `categories`, `inventory`, `item-returns`, `locations`, `notifications`, `organizations`, `payment-transactions`, `products`, `purchase-orders`, `report-generation-logs`, `stores`, `suppliers`

### Create + getById only (no list/search/update/delete)
- `activity-logs`
- `customers`
- `expenses`
- `invoices`
- `orders`
- `platform-configurations`
- `purchase-items`
- `roles`
- `stock-transfers (+ PUT /:id/cancel, PUT /:id/complete)`
- `user-roles`
- `users`

### Intentional non-CRUD / action APIs
- `auth` — have —; extras: ['GET /me', 'POST /invite', 'POST /organizations', 'POST /sync', 'POST /token']
- `product-logs` — have ['getById']; extras: ['GET /by-inventory/:inventoryId', 'GET /by-product/:productId']
- `stock-movements` — have ['getById']; extras: ['GET /by-inventory/:inventoryId', 'POST /add', 'POST /adjust', 'POST /damage', 'POST /release-reservation', 'POST /remove', 'POST /reserve', 'POST /write-off']
- `unpublished-stock` — have ['getById']; extras: ['GET /by-record/:unpublishedStockId', 'POST /add', 'POST /publish']

### Known gaps (high/medium)

| Gap | Priority | Notes |
|-----|----------|-------|
| `GET /unpublished-stock` list/search | High | Only get-by-id + add + publish + by-record movements |
| `GET /stock-transfers` list/search | Medium | Only create, get-by-id, complete, cancel |
| `GET /inventory/:id/summary` | Medium | Not present; client can derive from get-by-id |
| `GET /product-logs/by-location/:locationId` | Low | Mentioned in inventory API guide; not implemented |
| Frontend-only resources with **no** backend controller | High | `vehicles`, `org-addresses`, `user-addresses` |
| Dual store concepts | Medium | Both `/stores` and `/locations` registered |

### Frontend ↔ backend mismatches

- Client `api.ts` calls `/api/v1/vehicles`, `/api/v1/org-addresses`, `/api/v1/user-addresses` — **no controllers exist**
- Client does not wrap `/api/v1/auth` (uses Clerk directly / other paths)
- Thin modules still exposed as full `createResource` in client (list/search will 404)

---

## Complete endpoint catalog

### `activity-logs` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/activity-logs` | `create` |  |  |
| `GET` | `/api/v1/activity-logs/:id` | `getById` |  |  |
### `auth` (5 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/auth/invite` | `inviteMember` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/auth/me` | `getMe` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/auth/organizations` | `onboardOrganization` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/auth/sync` | `sync` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/auth/token` | `getToken` |  | OrgAdmin, SuperAdmin |
### `bills` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/bills` | `search` |  |  |
| `POST` | `/api/v1/bills` | `create` |  |  |
| `DELETE` | `/api/v1/bills/:id` | `delete` |  |  |
| `GET` | `/api/v1/bills/:id` | `getById` |  |  |
| `PUT` | `/api/v1/bills/:id` | `update` |  |  |
| `GET` | `/api/v1/bills/list` | `list` |  |  |
### `categories` (7 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/categories` | `search` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/categories` | `create` |  | OrgAdmin, SuperAdmin |
| `DELETE` | `/api/v1/categories/:id` | `delete` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/categories/:id` | `getById` |  | OrgAdmin, SuperAdmin |
| `PUT` | `/api/v1/categories/:id` | `update` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/categories/list` | `list` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/categories/parents` | `listParents` |  | OrgAdmin, SuperAdmin |
### `customers` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/customers` | `create` |  |  |
| `GET` | `/api/v1/customers/:id` | `getById` |  |  |
### `expenses` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/expenses` | `create` |  |  |
| `GET` | `/api/v1/expenses/:id` | `getById` |  |  |
### `inventory` (8 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/inventory` | `search` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/inventory` | `create` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `DELETE` | `/api/v1/inventory/:id` | `delete` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/inventory/:id` | `getById` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `PUT` | `/api/v1/inventory/:id` | `update` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/inventory/list` | `list` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/inventory/low-stock` | `getLowStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/inventory/valuation` | `getValuation` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
### `invoices` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/invoices` | `create` |  |  |
| `GET` | `/api/v1/invoices/:id` | `getById` |  |  |
### `item-returns` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/item-returns` | `search` |  |  |
| `POST` | `/api/v1/item-returns` | `create` |  |  |
| `DELETE` | `/api/v1/item-returns/:id` | `delete` |  |  |
| `GET` | `/api/v1/item-returns/:id` | `getById` |  |  |
| `PUT` | `/api/v1/item-returns/:id` | `update` |  |  |
| `GET` | `/api/v1/item-returns/list` | `list` |  |  |
### `locations` (8 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/locations` | `search` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/locations` | `create` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `DELETE` | `/api/v1/locations/:id` | `delete` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/locations/:id` | `getById` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `PUT` | `/api/v1/locations/:id` | `update` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `DELETE` | `/api/v1/locations/:id/image` | `removeImage` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/locations/:id/image` | `uploadImage` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/locations/list` | `list` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
### `notifications` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/notifications` | `search` |  |  |
| `POST` | `/api/v1/notifications` | `create` |  |  |
| `DELETE` | `/api/v1/notifications/:id` | `delete` |  |  |
| `GET` | `/api/v1/notifications/:id` | `getById` |  |  |
| `PUT` | `/api/v1/notifications/:id` | `update` |  |  |
| `GET` | `/api/v1/notifications/list` | `list` |  |  |
### `orders` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/orders` | `create` |  |  |
| `GET` | `/api/v1/orders/:id` | `getById` |  |  |
### `organizations` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/organizations` | `search` |  |  |
| `POST` | `/api/v1/organizations` | `create` |  |  |
| `DELETE` | `/api/v1/organizations/:id` | `delete` |  |  |
| `GET` | `/api/v1/organizations/:id` | `getById` |  |  |
| `PUT` | `/api/v1/organizations/:id` | `update` |  |  |
| `GET` | `/api/v1/organizations/list` | `list` |  |  |
### `payment-transactions` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/payment-transactions` | `search` |  |  |
| `POST` | `/api/v1/payment-transactions` | `create` |  |  |
| `DELETE` | `/api/v1/payment-transactions/:id` | `delete` |  |  |
| `GET` | `/api/v1/payment-transactions/:id` | `getById` |  |  |
| `PUT` | `/api/v1/payment-transactions/:id` | `update` |  |  |
| `GET` | `/api/v1/payment-transactions/list` | `list` |  |  |
### `platform-configurations` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/platform-configurations` | `create` |  |  |
| `GET` | `/api/v1/platform-configurations/:id` | `getById` |  |  |
### `product-logs` (3 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/product-logs/:id` | `getById` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/product-logs/by-inventory/:inventoryId` | `listByInventory` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/product-logs/by-product/:productId` | `listByProduct` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
### `products` (13 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/products` | `search` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/products` | `create` |  | OrgAdmin, SuperAdmin |
| `DELETE` | `/api/v1/products/:id` | `delete` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/products/:id` | `getById` |  | OrgAdmin, SuperAdmin |
| `PUT` | `/api/v1/products/:id` | `update` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/products/:id/image/presigned-url` | `getImagePresignedUrl` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/products/:id/images` | `listImages` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/products/:id/images` | `addImage` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/products/:id/suppliers` | `listSuppliers` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/products/:id/suppliers` | `linkSupplier` |  | OrgAdmin, SuperAdmin |
| `DELETE` | `/api/v1/products/:id/suppliers/:supplierId` | `unlinkSupplier` |  | OrgAdmin, SuperAdmin |
| `PUT` | `/api/v1/products/:id/suppliers/:supplierId` | `updateSupplierLink` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/products/list` | `list` |  | OrgAdmin, SuperAdmin |
### `purchase-items` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/purchase-items` | `create` |  |  |
| `GET` | `/api/v1/purchase-items/:id` | `getById` |  |  |
### `purchase-orders` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/purchase-orders` | `search` |  |  |
| `POST` | `/api/v1/purchase-orders` | `create` |  |  |
| `DELETE` | `/api/v1/purchase-orders/:id` | `delete` |  |  |
| `GET` | `/api/v1/purchase-orders/:id` | `getById` |  |  |
| `PUT` | `/api/v1/purchase-orders/:id` | `update` |  |  |
| `GET` | `/api/v1/purchase-orders/list` | `list` |  |  |
### `report-generation-logs` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/report-generation-logs` | `search` |  |  |
| `POST` | `/api/v1/report-generation-logs` | `create` |  |  |
| `DELETE` | `/api/v1/report-generation-logs/:id` | `delete` |  |  |
| `GET` | `/api/v1/report-generation-logs/:id` | `getById` |  |  |
| `PUT` | `/api/v1/report-generation-logs/:id` | `update` |  |  |
| `GET` | `/api/v1/report-generation-logs/list` | `list` |  |  |
### `roles` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/roles` | `create` |  |  |
| `GET` | `/api/v1/roles/:id` | `getById` |  |  |
### `stock-movements` (9 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/stock-movements/:id` | `getById` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/add` | `addStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/adjust` | `adjustStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/stock-movements/by-inventory/:inventoryId` | `listByInventory` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/damage` | `damageStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/release-reservation` | `releaseReservation` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/remove` | `removeStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/reserve` | `reserveStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/stock-movements/write-off` | `writeOffStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
### `stock-transfers` (4 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/stock-transfers` | `create` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/stock-transfers/:id` | `getById` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `PUT` | `/api/v1/stock-transfers/:id/cancel` | `cancel` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `PUT` | `/api/v1/stock-transfers/:id/complete` | `complete` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
### `stores` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/stores` | `search` |  |  |
| `POST` | `/api/v1/stores` | `create` |  |  |
| `DELETE` | `/api/v1/stores/:id` | `delete` |  |  |
| `GET` | `/api/v1/stores/:id` | `getById` |  |  |
| `PUT` | `/api/v1/stores/:id` | `update` |  |  |
| `GET` | `/api/v1/stores/list` | `list` |  |  |
### `suppliers` (6 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/suppliers` | `search` |  | OrgAdmin, SuperAdmin |
| `POST` | `/api/v1/suppliers` | `create` |  | OrgAdmin, SuperAdmin |
| `DELETE` | `/api/v1/suppliers/:id` | `delete` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/suppliers/:id` | `getById` |  | OrgAdmin, SuperAdmin |
| `PUT` | `/api/v1/suppliers/:id` | `update` |  | OrgAdmin, SuperAdmin |
| `GET` | `/api/v1/suppliers/list` | `list` |  | OrgAdmin, SuperAdmin |
### `unpublished-stock` (4 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `GET` | `/api/v1/unpublished-stock/:id` | `getById` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/unpublished-stock/add` | `addStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `GET` | `/api/v1/unpublished-stock/by-record/:unpublishedStockId` | `listMovements` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
| `POST` | `/api/v1/unpublished-stock/publish` | `publishStock` |  | OrgAdmin, SuperAdmin, StoreManager, StoreStaff |
### `user-roles` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/user-roles` | `create` |  |  |
| `GET` | `/api/v1/user-roles/:id` | `getById` |  |  |
### `users` (2 routes)

| Method | Path | Handler | Anon | Roles (class/method) |
|--------|------|---------|------|----------------------|
| `POST` | `/api/v1/users` | `create` |  |  |
| `GET` | `/api/v1/users/:id` | `getById` |  |  |

---

## Method counts by HTTP verb

- `DELETE`: 15
- `GET`: 64
- `POST`: 40
- `PUT`: 16

## Notes

- This audit is **static** (controller + CQRS wiring). It does **not** prove runtime success (DTO/entity mismatches, 500s from live tests on 2026-07-26 are out of scope here).
- Nest route order: static paths like `list`, `low-stock` must be registered before `:id` — verified present on full-CRUD controllers.
- Prior inventory-only audit: `ERP-Client/docs/superpowers/specs/2026-07-30-inventory-endpoint-audit.md`
