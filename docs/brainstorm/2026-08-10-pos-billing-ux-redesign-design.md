# POS / Billing UX redesign — design

**Date:** 2026-08-10
**Status:** Approved
**Scope:** `renderer/src/pages/pos/POSTerminal.tsx` and new sibling components under `renderer/src/pages/pos/components/`

## Goal

Fix specific daily-use friction in the POS/billing screen and split the 1918-line, 26-`useState` `POSTerminal.tsx` into focused components — without touching checkout logic, calculations, or any core-apis code. Improve, don't rebuild: every calculation (`lineTax`, `lineTotal`, black-market markup, credit-limit/approval logic, checkout step sequencing) is already correct and exercised in production; a from-scratch rewrite would risk regressing money-affecting paths for no user-facing gain beyond what this design delivers.

## Context

Usage is desktop, mouse + keyboard (not touchscreen). All current features are in active business use and must be preserved exactly — sales/purchase modes, sale type (normal/credit/black), payment method + timing, customer type + inline customer creation, credit-limit check + approval, facilitator & commission (black sales), delivery info, held sales, quick charges, price/tax override, purchase-mode supplier picker.

## Friction points being fixed

1. Cart lines have no qty +/− — reducing quantity requires deleting the line and re-adding it.
2. Header bar packs 6 controls (mode toggle, sale-type toggle, location, payment method, payment timing, customer type) into one `flex-wrap` row that wraps awkwardly.
3. "Override price / tax" is a `group-hover`-only affordance — invisible until the row is hovered, no discoverability.
4. Facilitator/commission (black sales) and delivery info sit in one long scrolling right-hand column, easy to miss.

## Non-goals

- No changes to `checkout.ts`, calculation functions, or any core-apis endpoint.
- No new state-management approach (context/reducer) — parent `useState` stays, matching the rest of the codebase.
- No feature removal — full parity required.
- No touch/mobile optimization (desktop mouse+keyboard confirmed as the actual usage).

## Architecture

Extract from `POSTerminal.tsx` into `renderer/src/pages/pos/components/`:

- `PosToolbar.tsx` — mode/sale-type toggle, location, payment method, payment timing, customer type. Wraps the existing `ModeToggle`, `SaleTypeToggle`, `CustomerTypeRow`, `PaymentTimingRow` helpers (moved here from the top of `POSTerminal.tsx`).
- `ProductSearchPanel.tsx` — search/scan input + suggestions, qty stepper, add button, quick charges, purchase-mode supplier picker.
- `CartTable.tsx` — line items table, extra charges rows, inline qty +/− editing, price/tax override editing.
- `CheckoutPanel.tsx` — totals, payment fields (cash tendered / reference / partial amount), customer search + `CustomerFormDrawer` wiring, credit-limit box, delivery info (collapsible), facilitator & commission (collapsible), action buttons (Complete Sale / Print / E-Receipt).

`BillSuccessModal` and `StepList` stay as-is (already reasonably self-contained); they can stay in `POSTerminal.tsx` or move to `components/` at implementation time — not load-bearing either way.

Each extracted component receives its slice of state and setters as props from `POSTerminal.tsx`, which remains the single source of truth for all state and the checkout orchestration (`generateBill`, `holdSale`, `resumeSale`, etc.). No prop-drilling concerns expected at this depth (one level).

## Layout changes

- **Toolbar**: two visual clusters instead of one wrapping row — transaction context (mode, sale type, location) left-aligned; payment context (payment method, payment timing, customer type) right-aligned behind a divider, sales-mode only as today.
- **Cart table**: add a compact qty +/− stepper per row, using the same `setLines` update pattern already used for black-sale rate editing. Replace the hover-only override text button with an always-visible, low-emphasis icon button (pencil icon) that opens the same existing override UI.
- **Checkout panel**: delivery info (already collapsible) and the new facilitator/commission block both become matching collapsed-by-default sections, so the default view shows only totals/payment/customer. Credit box, black-markup line, and action buttons stay in their current prominent positions.

## Data flow

No new data flow. State ownership, API calls, and checkout step sequencing are unchanged — this is a presentational extraction plus two small interaction additions (qty stepper, override button visibility) that reuse existing update functions (`setLines`, `applyOverride`).

## Error handling

Unchanged — existing checkout step failure handling (`checkoutResult`, `StepList`) and credit-approval messaging carry over untouched.

## Testing / verification

No new business logic, so no new unit tests needed — this is UI extraction plus two interaction additions on top of existing, already-correct calculation functions. Verification is manual, run via `ERP-Client:verification-before-completion` before calling the work done:

- Sales mode: add products, adjust qty via new stepper, override price/tax via new button, add/remove quick charges and extra charges, complete a sale, confirm receipt/print.
- Purchase mode: select supplier, add products, create purchase order.
- Sale types: normal, credit (customer + credit-limit box + approval flow), black (facilitator/commission collapsible section, markup calculation).
- Hold sale → Held Sales panel → resume.
- Collapse/expand delivery info and facilitator sections.
- Toolbar layout at typical window widths — no unwanted wrapping.
