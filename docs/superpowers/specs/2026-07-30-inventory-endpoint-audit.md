# Core-apis inventory endpoint audit

**Date:** 2026-07-30  
**Status:** Audit only — no core-apis changes made  
**Scope:** Sub-project 2 of inventory rebuild program

## Confirmed missing (Section 7 of frontend inventory API guide)

| Endpoint | Priority | Frontend stance |
|----------|----------|-----------------|
| `GET /api/v1/unpublished-stock` (list/search) | High | UI uses UUID lookup only |
| `GET /api/v1/inventory/:id/summary` | Medium | Detail uses `GET :id` + client available calc |
| `GET /api/v1/stock-transfers` (list/search) | Medium | UI uses UUID lookup only |

## Present and usable

- Inventory: search, list, CRUD, low-stock, valuation
- Stock movements: by-inventory, get by id, ops (add/remove/adjust/reserve/release/damage/write-off)
- Stock transfers: create, get by id, complete, cancel
- Unpublished stock: get by id, by-record movements, add, publish
- Product logs: get by id, by-product, by-inventory

## Proposed backend fixes (awaiting approval — not implemented)

1. **High:** Add `GET /unpublished-stock` search before `:id` route; reuse `UnpublishedStockFilter` on repo.
2. **Medium:** Add `GET /inventory/:id/summary` returning onHand/unpublished/reserved/available/avgCost.
3. **Medium:** Add `GET /stock-transfers` paginated search.

## Frontend stance for sub-project 3

Rebuild inventory UI against endpoints that exist today. Staging and transfer panels stay UUID-lookup oriented until the high/medium backends land.
