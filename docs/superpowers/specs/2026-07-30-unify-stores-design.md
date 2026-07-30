# Unify on Stores — design

**Date:** 2026-07-30  
**Status:** Approved (BE unify deferred)  
**Interim (2026-07-30):** FE-only Option A — Locations removed from sidebar; inventory still uses Locations API/`locationId` with “Store” labels. Full Store FK cutover waits until core-apis changes are allowed.  


**Scope:** One place model for ERP (core-apis + ERP-Client). Locations deprecated in favor of Stores.

## Goal

Make **Store** the only place concept in product and API surface used by the client. Inventory, stock movements, and unpublished stock must use `storeId` the same way sales, purchase, and stock transfers already do. UI that today picks Locations must pick Stores. Locations page is removed from navigation (API may remain temporarily unused).

## Non-goals (this design)

- Deleting Locations tables/module from core-apis on day one (deprecate after cutover; hard delete later)
- Building vehicles / org-addresses / user-addresses backends (later phase; pages kept)
- Full sales/purchase unblock (Phase 2+) — only store-related wiring needed for inventory cutover
- Renaming every user-facing word “location” in prose (bin location / shelf stays as `binLocation`)

## Decision

| Choice | Value |
|--------|--------|
| Single place model | **Store** |
| Rejected | Unify on Locations; dual Store↔Location sync bridge |
| Warehouse support | `Store.type`: `store` \| `warehouse` |
| Images | Port location image upload/remove onto Stores |

## Current state (problem)

- Inventory, stock-movements, unpublished-stock FK **`location_id`**
- Stock transfers, orders, POs, expenses, users use **`storeId`**
- Both `/stores` and `/locations` APIs and pages exist → split brain

## Target state

```
Organization
  └── Store (type: store | warehouse, optional image, address fields)
        └── Inventory (organizationId + storeId + productId unique)
              ├── Stock movements (storeId)
              └── Unpublished stock (storeId)
        └── Stock transfers (fromStoreId / toStoreId) — already correct
```

## Backend changes

### Store entity / API

- Add `type` enum: `store` | `warehouse` (required on create; default `store` only if migration needs it for existing rows)
- Add image fields/endpoints mirroring Locations (`POST/DELETE /stores/:id/image` or equivalent existing storage pattern)
- Keep existing CRUD: search, list, get, create, update, delete
- Create/update request DTOs accept `type` (+ existing address/contact fields)

### Inventory cluster — rename FK

| Area | Today | Target |
|------|-------|--------|
| `InventoryEntity` | `locationId` | `storeId` → `StoreEntity` |
| Unique key | org + location + product | org + store + product |
| Stock movement entity + ops DTOs | `locationId` | `storeId` |
| Unpublished stock (+ movements) | `locationId` | `storeId` |
| Domain/commands/queries/filters/responses | `locationId` | `storeId` |

Swagger/OpenAPI field names must match (`storeId`).

### Data migration

- Prefer a TypeORM migration that:
  1. Adds `store_id` columns nullable
  2. Backfills only when a deterministic map exists (e.g. empty inventory → no-op; or 1:1 copy if previously synced)
  3. Drops `location_id` FKs after cutover
- **If DB has inventory rows tied to locations with no store map:** migration must fail loudly or require a one-time script — do not silently point at wrong stores
- Confirm against the target environment before applying (dev may be empty)

### Locations module

- After FE cutover: leave module registered but unused by client (or return 410 on write later)
- Do not remove until a follow-up “delete Locations” task

### Stock transfers

- No path rename (already store-based)
- Verify complete/cancel still resolve inventory by `storeId` after inventory migration (fix any internal location lookups)

## Frontend changes

### Navigation / routes

- Keep `/stores` and Stores page
- Remove Locations from sidebar (`modules.ts`) and routes (`App.tsx`)
- Optionally keep route redirect `/locations` → `/stores` for bookmarks

### Stores page

- Add `type` select (`store` / `warehouse`)
- Port image upload/remove UX from Locations page
- Align form field names with Store API (`organizationId` vs `organization_id` — match whatever create DTO actually expects; fix if currently wrong)

### Inventory cluster pages

Replace every Locations list/get picker and `locationId` payload with Stores / `storeId`:

- `Inventory.tsx`, `InventoryDetail.tsx`
- `StockMovements.tsx`
- `UnpublishedStock.tsx`
- `ProductLogs.tsx` (labels)
- `ItemReturns.tsx` restock form
- Dashboard inventory tables that show place columns
- `api.ts` types: inventory/stock types use `storeId`

### API client

- Keep `Stores` resource; add store image hooks (from location image hooks)
- Stop importing `Locations` from pages in scope; remove dead exports only when unused

## Success criteria

1. Create Store with `type=warehouse` (+ optional image) in UI — persists via `/api/v1/stores`
2. Create inventory row selecting that store — body uses `storeId`; list shows store name
3. Stock add/remove/adjust on that inventory works with `storeId`
4. Unpublished add + publish works with `storeId`
5. Stock transfer between two stores still create/complete/cancel
6. No Locations entry in sidebar; inventory flows do not call `/api/v1/locations`

## Phased delivery (program order)

| Phase | Focus |
|-------|--------|
| **1 (this design)** | Store enhancements + inventory FK cutover + FE cutover + hide Locations |
| 2 | Sales (customers → orders → invoices) — re-live-test then enable |
| 3 | Purchase (POs, items, bills, payments) |
| 4 | Warehouse polish (transfer/unpublished list endpoints if still missing) |
| 5 | Remaining (users/roles lists, addresses/vehicles BE, etc.) |

## Risks

| Risk | Mitigation |
|------|------------|
| Existing location-linked inventory data | Migration gate; empty-dev happy path |
| FE still posts `locationId` somewhere | Grep + typecheck before done |
| Store form field mismatch (`organization_id`) | Fix against live Store create DTO in Phase 1 |
| Stock transfer complete assumes location inventory | Code review transfer handlers during BE migrate |

## Open at implement time (not blocking approval)

- Exact migration strategy if non-empty location inventory exists in shared DB
- Whether Locations controller stays mounted or is feature-flagged off
