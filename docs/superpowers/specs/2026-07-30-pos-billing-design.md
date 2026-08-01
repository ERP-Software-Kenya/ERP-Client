# POS / Billing — design

**Date:** 2026-07-30  
**Status:** Approved — **revised: ERP-Client only (no core-apis changes)**  
**Scope:** Port ERP System POS / Billing UI into ERP-Client; wire existing APIs; surface step errors

## Goal

Ship a **POS / Billing** terminal in ERP-Client that matches ERP System layout (sales + purchase modes), using **existing** core-apis only. Client orchestrates creates and shows clear step results (ok / failed / skipped) so gaps are visible.

## Decisions (locked)

| Choice | Value |
|--------|--------|
| Scope | POS terminal only |
| Approach | **Client-only** — no new core-apis modules/endpoints |
| Modes | Sales + Purchase |
| Purchase persistence | Best-effort with existing APIs (e.g. Bill + stock add); **no GRN** until backend exists — failed/skipped steps shown |
| Checkout failures | Attempt creates that can run; show errors for failures; keep cart on hard fail; no silent fake success |
| Walk-in / customer | Optional free-text note; Order create needs `customerId` — if missing/unusable, that step fails visibly |
| UI placement | Sales nav → **POS / Billing** → `/pos` |
| Currency | Client convention (not hard-coded KES) |

## Non-goals

- Any core-apis schema or new POS/GRN endpoints
- Quotations, dispatch, sales/purchase list redesign
- Hardware scanners / print templates (`window.print` only)
- Unify-Stores work

## Architecture

```
ERP-Client POS UI (/pos)
  ├── Products / Stores / Suppliers (existing search/list)
  └── Client checkout orchestrator
        ├── Sales: Order.create → Invoice.create → Payment.create? → stock remove?
        └── Purchase: Bill.create? → stock add?
        └── UI shows steps[] for each attempt
```

## Frontend

- Port `ERP System` `POSTerminal` into `renderer/src/pages/pos/POSTerminal.tsx` (layout/behavior)
- `modules.ts` + `App.tsx` route `/pos`
- Live selectors: stores, products search, suppliers (purchase)
- Checkout runs sequenced API calls; results panel lists each step
- Success modal only when required steps for that mode succeed enough to have a ref; otherwise keep cart + errors

## Verification

- Nav: POS / Billing opens `/pos`
- Both modes: add lines, totals, void
- Checkout shows step ok/fail for real API responses
- No changes under `core-apis/`
