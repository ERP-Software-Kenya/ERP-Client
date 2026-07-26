# Phase 4 — Inventory Transactions

**Depends on:** Phase 1 (foundation). Independent of Phases 2/3.
**Spec sections referenced:** §3 (Inventory Module).

## 1. Goal

Spec's §3.1 flow covers Stock Ledger, Stock Adjustment, and Stock Transfer. This phase covers the two transaction types the backend actually has resources for: **Stock Movements** (adjustments — damage/loss/found/correction) and **Stock Transfers** (between stores). Bundle↔Piece conversion (spec §3.2) is **blocked** — no unit-variant concept exists (see overview doc §1), so there's nothing to convert between.

## 2. Current state

- `StockMovements`: create + get-by-id only. No list.
- `StockTransfers`: create + get-by-id only. No list.
- `InventoryItem` (the stock-balance record) has full CRUD (Phase 1) but represents current balance, not the transaction log.
- No screen exists for either today (both are `GENERIC_KEYS` routed to the inert `ModulePage`).

## 3. The blocker, same shape as Phases 2/3

No list endpoint for either resource means no Stock Ledger view is possible ("Date, Transaction Type, Ref No, In Qty, Out Qty, Balance" per spec §3.2) — you cannot ask the API "show me all movements for Product X at Store Y." This is arguably the most damaging gap of the three "no-list" phases, since a stock ledger is core to any inventory system and the spec explicitly names it as a required report (§3.2, §7).

**Recommend requesting `GET /api/v1/stock-movements?inventoryId=` and `GET /api/v1/stock-transfers?storeId=` (or generic `/list` endpoints matching the rest of the API's convention) as a backend priority alongside the Sales module's asks (Phase 3 §3).**

## 4. Screens & interactions

**Stock Adjustment (create-only, buildable now)**
Form matching spec §3.2: Location (store_id), Item+Unit (inventory_id — since there's no unit-variant concept, this is just the InventoryItem being adjusted), Adjustment Qty (+/-), Reason (Damage/Loss/Found/Correction — map to the `reason` field), Remarks. Submits `StockMovements.create({ organizationId, inventoryId, userId, quantity, type, reason })`. **This should also update the corresponding `InventoryItem.quantity`** — confirm whether the backend does this automatically as a side effect of creating a StockMovement, or whether the client needs to separately call `Inventory.update()` after. This needs one real test call to determine; don't build both halves speculatively without checking whether it'd double-apply the adjustment.

**Stock Transfer (create-only, buildable now)**
Form matching spec §2.5: From Store, To Store, Items+Qty (again, no unit-variant, so just InventoryItem/quantity pairs — but note the OpenAPI schema for `CreateStockTransferRequest` only shows `organizationId, fromStoreId, toStoreId, status` — **no items array is visible**, meaning either items are a separate linked resource not yet discovered, or a transfer currently only moves a status/header record with no actual line items. This must be confirmed with a real call before assuming the spec's "Items + Qty + Unit Variant" table (§2.5) is even representable). Status flow per spec: Draft → In-Transit → Received — confirm these are the real enum values (same caution as PurchaseOrder's status in Phase 1 §3).

**Stock Ledger view** — blocked per §3 above. Once a list/filter endpoint exists, this becomes a straightforward filtered table (Location, Item, Date Range → rows with running balance computed client-side or server-side depending on what the new endpoint returns).

## 5. Business rules from spec §3.3 — status

| Rule | Status |
|---|---|
| Stock tracked at Location + Item + Unit Variant (+Batch) | Partially blocked — no unit variant or batch concept, so tracking is effectively Location + Item only. |
| Stock-out rule precedence (item overrides location default) | Blocked — no stock-out toggle field exists on Product, InventoryItem, or Store. |
| Reorder alerts per Item per Location | Partially implementable — `InventoryItem.min_quantity` already exists; a simple client-side check (`quantity < min_quantity`) can flag low stock today without any backend change. This is a real near-term win worth prioritizing within this phase even though it's not a "transaction." |
| Stock valuation method (Weighted Avg / FIFO) | Blocked — no cost tracking on StockMovement at all. |

## 6. Recommendation

Ship Stock Adjustment and Stock Transfer as create-only forms now (real value: at least the action gets logged even if it can't be reviewed later), and treat the reorder-alert check as a quick independent win inside this phase since it needs zero backend changes. Push the Stock Ledger view to "as soon as the list endpoint exists."

## 7. Open questions for this phase — resolved 2026-07-25 by reading `core-apis` source directly

- **Does creating a StockMovement auto-adjust InventoryItem.quantity?** No, and it can't today either way: `CreateStockMovementCommand`'s fields (`organizationId`/`inventoryId`/`userId`/`quantity`/`type`/`reason`) don't match `StockMovementEntity`'s actual columns (`storeId`/`productId`/`movementType`/`quantityBefore`/`quantityAfter`, several NOT NULL). Every create call 500s. Confirmed bug, not fixable client-side — see `docs/core-apis-fixes.md` #2.
- **Does StockTransfer support line items?** No — `StockTransferItemEntity` exists in the DB schema with a real relation from `StockTransferEntity.items`, but has zero application-layer wiring (no module/controller/command/query). Schema-only, not exposed via API. A transfer today really is header/status-only, as suspected.
- **StockTransfer status enum?** Not a real enum — `status` is `varchar(50) default 'PENDING'`, no CHECK constraint. The spec's Draft/In-Transit/Received assumption isn't backend-enforced. Decision (2026-07-25): build the picker with those three values anyway, since the field accepts any string.

## 8. Done when

- [x] Low-stock flag (quantity < min_quantity) — already shipped as part of Phase 1's `Inventory.tsx` (built ahead of this phase).
- [x] Stock Transfer create form built (`renderer/src/pages/StockTransfers.tsx`) — organization/from-store/to-store/status. UI verified live via an Electron+Playwright smoke run (2026-07-26): page renders, dialog opens, Organization/Store selects populate real data from the live backend. **Submitting fails**: `POST /api/v1/stock-transfers` returns `Internal server error` against the deployed API — source-level analysis said this endpoint should work, but live testing contradicts that. Root cause unconfirmed, see `docs/core-apis-fixes.md` #3. This form is UI-complete but not currently functional end-to-end, same practical status as Stock Adjustment below (blocked on a backend fix), just not yet given a disabled-submit treatment since it was expected to work.
- [x] Stock Adjustment create form built (`renderer/src/pages/StockMovements.tsx`) but **submit intentionally disabled** with an explanatory banner — the backend bug above means every call would 500. Ready to enable once `core-apis` fixes it.
- [x] Stock Ledger view explicitly deferred — no list endpoint exists for either resource; noted in both new pages' descriptions rather than silently skipped.
