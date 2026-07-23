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

## 7. Open questions for this phase

- Does creating a StockMovement automatically adjust the linked InventoryItem's quantity server-side, or does the client need to do both writes?
- Does StockTransfer actually support line items (items+qty), or is the real resource just a header/status record as its thin schema suggests? If the latter, is a separate `TransferItem`-style resource planned, or does this need to be raised as a gap?
- Confirm PurchaseOrder-style status enum values for StockTransfer (Draft/In-Transit/Received assumed from spec, not verified).

## 8. Done when

- [ ] Stock Adjustment create form works, and it's confirmed whether/how InventoryItem.quantity gets updated alongside it.
- [ ] Stock Transfer create form works to whatever extent the API's real item-support allows.
- [ ] Low-stock flag (quantity < min_quantity) shown on the Inventory list — no backend dependency, do this regardless of the above.
- [ ] Stock Ledger view explicitly deferred with a note pointing at the backend list-endpoint ask, not silently skipped.
