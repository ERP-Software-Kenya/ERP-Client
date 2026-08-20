# Sales v2 — Simple UI (POS + Documents + Approvals + Black Ledger)

**Date:** 2026-08-09  
**Status:** Approved (design dialogue)  
**Parent spec:** `docs/superpowers/specs/2026-08-07-sales-v2-credit-black-design.md`  
**Scope:** Frontend UI/UX only in `ERP-Client/renderer` — Sales POS, print documents, Pending Approvals, Black Ledger  
**Out of scope:** Backend Tasks 1–10, Boxes Tracker / Branch Transfer, STK Push API, PDF libraries, purchase redesign

## Goal

Make the existing Sales v2 Credit/Black surface **easy and fast for counter staff**: one screen, progressive disclosure, no wizards. Keep every capability from the approved parent spec and handwritten sketches, but hide fields until the current sale type/payment method needs them.

## Design principle

**Show only what this sale needs.** Default Normal cash sale = search products, edit lines, optional customer, pay method, Complete / Hold. Credit, Black, Half timing, M-Pesa/Till ref, delivery, and post-sale documents appear only when relevant.

## Approach

**Simple one-screen dense canvas** (sketch-faithful layout, simplified):

- Center: product search + line table (primary work area)
- Right rail: customer, totals, payment, primary actions
- Top bar: store, sale ref, salesman, sale-type toggle, Held entry
- Delivery: collapsed panel by default
- Documents: post-success action strip

Rejected alternatives: multi-step wizard (too slow), catalog-left / bill-right split (weaker fit for credit/black + delivery on one sheet).

## Screen layout — POS (`POSTerminal.tsx`)

### Top bar (always)
- Store name, Sales reference, Salesman
- Sale type toggle: **Normal | Credit | Black** (Black only if OrgAdmin / OrgManager / SuperAdmin)
- Held sales entry

### Main (center)
- Product search → add line
- Editable table defaults: Product, Code, Qty, Price, Tax, Line total, remove
- **Black mode adds:** Official | Charged (side by side); live markup feeds the rail
- Weight / company columns only if product data already has them — no empty columns

### Right rail (sticky)
1. Customer type chips: Regular / New / Shop / Big Customer
2. Customer search / inline details (walk-in allowed on Normal)
3. Totals: subtotal, tax, discount, **total**
4. Payment method + payment timing
5. **Hold** + **Complete** (primary)

### Progressive disclosure

| When | Extra UI |
|---|---|
| Credit | Limit · balance · remaining; Complete label becomes **Request approval** if over limit |
| Black (admin) | Official vs charged; markup total; facilitator; commission |
| Half timing | Single partial-amount field |
| M-Pesa / Till | Single reference / till field |
| Delivery needed | Collapsible “Delivery info” (driver, companion, vehicle, license, GPS, distance, note) |
| After successful sale | Print: Receipt · Debtor Note · Statement · Delivery Note |

### Mode chrome
- Credit: soft amber header tint
- Black: soft slate header tint
- Reuse existing theme tokens; no purple glow, no decorative card stacks

## Credit behavior

1. Selecting Credit requires a customer.
2. Show credit limit, balance, and remaining immediately when customer is selected.
3. If `creditBalance + saleTotal > creditLimit`: primary action label = **Request approval** (same control, clearer label); sale stays draft / pending approval.
4. OrgAdmin / OrgManager decide on **Pending Approvals** page.
5. Under-limit credit sales Complete normally.

## Black behavior

1. Black toggle only for allowed roles.
2. Per line: Official (read baseline) + Charged (editable); markup = Σ (charged − official) × qty.
3. Facilitator optional: pick system user **or** free-text name (simple two-way choice).
4. Commission: staff enters % **or** amount; UI shows the derived counterpart.
5. Customer-facing Receipt never shows black markup; admin-only surfaces may show it.

## Payments

- Methods: **Cash · M-Pesa · Till · Bank · Other** (replace Cash/Card-only UI).
- Timing: Before delivery · After delivery · Half · COD.
- Half → one staff-entered partial amount (not fixed 50/50).
- M-Pesa / Till → one manual reference field this phase (STK Push deferred).

## Documents (Task 15 UI)

Post-sale success (and optionally from bill detail later):

| Document | Contents (minimum) |
|---|---|
| Receipt | Existing `ReceiptDocument` pattern; no black markup for customers |
| Debtor Note | Credit sale: customer, amounts owed, bill ref |
| Statement | Customer balance summary for this sale context |
| Delivery Note | Lines + delivery panel fields when present |

All use `window.print` (same pattern as `ReceiptDocument.tsx`). No PDF library this phase.

## Held sales (“Rakhone”)

Unchanged model: `DRAFT` bill = held sale. Top-bar Held list to resume. Keep `HeldSalesPanel` behavior; restyle only if needed for clarity.

## Pending Approvals page

Table columns: Date · Bill · **Customer name** · Requested by · Amount · Limit impact · Approve / Reject  
Empty state: “No pending credit approvals.”  
After action: row removed + toast. Role gate unchanged.

## Black Ledger page

Two panels:

1. **Black sales** — Ref · Date · Markup · open bill  
2. **Commissions** — Facilitator · Amount · Owed/Paid chip · Mark paid  

OrgAdmin / OrgManager / SuperAdmin only. Clearer empty states and status chips.

## Responsive

Desktop POS width first. On narrower viewports, right rail stacks below the line table. Touch targets remain usable for Complete / Hold / payment chips.

## Improvements included (research + sketches)

- Kenya-oriented payment methods (Cash / M-Pesa / Till / Bank / Other)
- Dual price visibility in Black mode before checkout
- Credit meter before submit (not only on failure)
- Keyboard-friendly add-line path retained / improved where easy
- Post-sale document strip
- Mode color cue without clutter
- Approvals / Ledger clarity (names, chips, empty states)
- Delivery as collapsed optional block

## Explicitly deferred

- Safaricom STK Push / Daraja live confirm
- KRA eTIMS QR
- Boxes Tracker / Branch Transfer UI
- Shareable PDF file generation
- Backend credit-approvals / bill-completion work (separate from this UI pass)

## Files likely touched

- `renderer/src/pages/pos/POSTerminal.tsx` — layout + progressive disclosure + payment methods
- `renderer/src/pages/pos/HeldSalesPanel.tsx` — light polish if needed
- `renderer/src/pages/pos/ReceiptDocument.tsx` — keep; ensure no customer-facing black markup
- `renderer/src/pages/pos/DebtorNoteDocument.tsx` — new
- `renderer/src/pages/pos/StatementDocument.tsx` — new
- `renderer/src/pages/pos/DeliveryNoteDocument.tsx` — new
- `renderer/src/pages/PendingApprovals/index.tsx` — table/UX polish
- `renderer/src/pages/BlackLedger/index.tsx` — table/UX polish
- `renderer/src/types.ts` / `checkout.ts` — payment method widen if needed

## Verification

- Normal walk-in cash sale: no credit/black/delivery chrome required
- Credit under limit completes; over limit shows Request approval
- Black (admin): dual prices + markup; non-admin never sees Black toggle
- M-Pesa/Till shows ref field; Half shows amount field
- Post-sale print actions open print preview for each document type
- Pending Approvals Approve/Reject UX clear with customer name
- Black Ledger Mark paid chip/state clear
- Existing theme tokens; amber/slate mode tints only
