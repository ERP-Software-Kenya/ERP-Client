# POS Phase 4 — Separate Sales and Purchase billing

**Goal:** `/pos/sales` and `/pos/purchase` with no mode toggle; carts do not leak across routes.

**Repos:** `ERP-Client` only.

## File map

| Path | Intent |
|---|---|
| `pages/pos/SalesBilling.tsx` | Thin wrapper, `mode="sales"` |
| `pages/pos/PurchaseBilling.tsx` | Thin wrapper, `mode="purchase"` |
| `POSTerminal.tsx` | `mode` prop; drop query-param toggle |
| `PosToolbar.tsx` | Remove Sales/Purchase toggle |
| `App.tsx` | Routes + `/pos` redirect (`?mode=purchase` → purchase) |
| `modules.ts` | Sales Billing / Purchase Billing nav |
| `AppLayout.tsx` | Full-bleed layout for both POS paths |
| `PurchaseOrders/index.tsx` | Create from POS → `/pos/purchase` |

## Verification

- Sidebar has two entries; toolbar has no Sales/Purchase toggle.
- Navigating Sales → Purchase starts an empty cart.
- `/pos` → sales; `/pos?mode=purchase` → purchase.
- Sales checkout still creates a bill; purchase still creates a PO.
