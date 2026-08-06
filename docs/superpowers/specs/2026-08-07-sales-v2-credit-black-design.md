# Sales v2 — Credit Sales & Black Sales/Inventory — design

**Date:** 2026-08-07
**Status:** Approved
**Scope:** ERP-Client (`renderer/`) + core-apis backend changes needed to support them
**Source:** Three handwritten sketches (`WhatsApp Image 2026-08-05 at *.jpeg`) + a prior requirements-gathering transcript (`detail`), both in repo root at design time.

## Background

The sketches describe a Sales screen with a Normal/Credit/Black sale-type toggle, inline customer capture, payment method + timing, hold/draft, and printable Debtor Note/Statement/Delivery Note documents — plus a separate "Boxes Tracker" transfer screen. The `detail` transcript is a full prior requirements-gathering session that expanded this into org-wide scope: multi-location stock transfers, per-customer credit, and a fully parallel "black" (off-books) sales/inventory system with commission tracking.

That combined scope spans roughly seven largely independent subsystems. This spec covers **only the first phase**: the Sales screen itself, Credit sales, and Black sales/inventory. Stock transfer redesign ("Boxes Tracker"), the wider reporting suite, real-time notifications, and downloadable PDF generation are deliberately deferred to later phases (see **Out of scope**).

## Goal

Ship a redesigned Sales/POS screen supporting Normal, Credit, and Black sale types end-to-end, backed by real per-customer credit enforcement and a genuinely separate black stock pool — built by extending the existing `Bill`-based checkout flow rather than introducing a parallel domain model.

## Decisions (locked)

| Choice | Value |
|---|---|
| Sale data model | Extend `BillEntity` — no new `Sale` aggregate. Reuses existing checkout flow (`checkout.ts`), `POSTerminal.tsx`, `Bills` list/detail, print pattern. |
| Hold/Draft ("Rakhone") | Reuses existing `EBillStatus.DRAFT` — no new status. A bill left in `DRAFT` *is* the held-sale list. |
| Black inventory base | Repurpose the existing `UnpublishedStock` module/entities (`UnpublishedStockEntity`, `UnpublishedStockMovementEntity`, add/publish commands) rather than building a new parallel module. |
| Black stock visibility | Store Manager/Store Staff **can** view and add black stock for their own location. Not admin-only for stock operations — this reverses the original `detail` transcript's "admin/manager only" rule; confirmed explicitly with the user. |
| Black **sale** creation | Restricted to OrgAdmin/OrgManager/SuperAdmin only, even though stock handling is store-level. |
| Black ledger / commission report visibility | OrgAdmin/OrgManager/SuperAdmin only — store staff never see aggregated black revenue or commission payouts, even though they can operate the stock pool day to day. |
| Org Manager role | New `ERole.OrgManager` added, equal permissions to `OrgAdmin` everywhere black/credit-approval logic checks role. |
| Credit limit behavior | Per-customer running balance (rises on credit sale, falls on payment). Over-limit blocks the sale and creates an approval request. |
| Credit approval delivery | In-app pending-approvals list only, no push/real-time notification this phase. |
| Documents (Debtor Note/Statement/Delivery Note) | `window.print`-based, same pattern as the existing `ReceiptDocument.tsx` — no PDF library added this phase. |
| Approval workflow shape | A specific `CreditApprovalRequest` table, not a generic reusable approval engine — YAGNI until a second use case actually needs one. |

## Out of scope (separate future cycles)

- Stock transfer / "Boxes Tracker" redesign (broadcast-to-all-locations, multi-responder, driver tracking) — will **replace** the simpler in-progress transfer redesign (`docs/superpowers/plans/2026-08-04-stock-transfer-redesign.md`) when that cycle starts; not touched here.
- Wider reporting suite (store-wise, salesperson-wise, payment-method-wise, true-total report).
- Real-time/push notifications.
- Downloadable/shareable PDF file generation (stays `window.print` this phase).
- Customer returns/credit notes, stock adjustments (damage/expiry/loss) — explicitly deferred in the original transcript too.

## Data model

### `BillEntity` — new columns
- `saleType`: enum `normal | credit | black`, default `normal`.
- `customerType`: enum `regular | new | shop | big_customer`, nullable — independent of `saleType`.
- `paymentTiming`: enum `before_delivery | after_delivery | half | cod`, nullable.
- `partialAmount`: decimal, nullable — used when `paymentTiming = half`; a staff-entered custom amount, not a fixed 50/50 split.
- `blackAmount`: decimal, default 0 — `charged total − official total` for black-type bills.
- `facilitatorUserId`: uuid, nullable — FK to `User`, when the facilitator has a system login.
- `facilitatorName`: varchar, nullable — free-text facilitator name when they have no system login. Exactly one of `facilitatorUserId`/`facilitatorName` should be set, never both.
- `commissionAmount`: decimal, default 0.

For black bills: line items are still recorded, but at the *charged* price (not official price); `blackAmount` is the derived markup; stock for every line on a black bill deducts from the black pool (`UnpublishedStock`), never from official `Inventory` — official on-hand count never moves for a black sale.

### `CustomerEntity` — new columns
- `creditLimit`: decimal, nullable (no limit set = credit sales blocked until one is set).
- `creditBalance`: decimal, default 0 — running balance, rises on credit sale completion, falls on payment.

### `CustomerCreditTransaction` — new table
Mirrors the existing `StockMovement` audit pattern: `id, customerId, billId?, type (credit_sale | payment | adjustment), amount, balanceBefore, balanceAfter, performedById, createdAt`.

### `CreditApprovalRequest` — new table
`id, organizationId, customerId, billId, requestedAmount, requestedById, status (pending | approved | rejected), decidedById?, decidedAt?, createdAt`.

### `UnpublishedStock` / `UnpublishedStockMovement` — role tightening only
No schema change. Controller `@Roles(...)` updated:
- `list`/`getById`/`listMovements`/`addStock`: `OrgAdmin, OrgManager, SuperAdmin, StoreManager, StoreStaff` (scoped to the caller's own location for Store roles — needs a location-scope check in the query/handler, since today's `list` returns all org records regardless of role).
- `publishStock`: unchanged — stays `OrgAdmin, OrgManager, SuperAdmin, StoreManager` (publish-to-live is a bigger action than staging).
- New: black-sale creation path (inside the Bill checkout, not this controller) checks `OrgAdmin, OrgManager, SuperAdmin` only.
- New: a black ledger/commission read endpoint checks `OrgAdmin, OrgManager, SuperAdmin` only.

### `CommissionPayable` — new table
`id, organizationId, billId, facilitatorUserId?, facilitatorName?, amount, status (owed | paid), paidAt?, createdAt`.

### `ERole`
Add `OrgManager = 'org_manager'`. Seed alongside existing roles. Every place currently checking `ERole.OrgAdmin` for black/credit-approval purposes must also check `ERole.OrgManager`.

## Sales screen (`POSTerminal.tsx` v2)

- **Sale-type toggle**: Normal / Credit / Black. Black only rendered for OrgAdmin/OrgManager/SuperAdmin sessions.
- **Customer type row**: Regular / New / Shop / Big Customer — display/reporting tag only, no behavior tied to it, independent of sale type.
- **Customer block**: existing inline capture + edit; when Credit is selected, shows credit limit and current balance live.
- **Product line table**: existing columns plus per-line ability to override unit price when `saleType = black` (charged price vs. official price).
- **Totals**: existing subtotal/tax/discount/total, plus a (staff-visible-only-if-black-mode) black markup line when applicable.
- **Payment method**: existing (cash/card, extendable to mpesa/till/bank per the sketch's terms if needed later) + new **payment timing** field (before/after delivery, half, COD). Half prompts for a free-entry partial amount.
- **Hold ("Rakhone")**: saves current cart as a `DRAFT` bill; a "Held Sales" list (bills filtered `status = DRAFT`, scoped to location) lets staff resume.
- **Black extras**: when Black is selected — charged price entry per line, optional facilitator (system-user picker or free-text name), commission % or amount, auto-computed `blackAmount`/`commissionAmount`.
- **Documents**: Debtor Note, Statement, Delivery Note rendered as `window.print`-able documents alongside the existing receipt, using bill + customer + (for delivery note) driver/transport fields already partially present in the sketch.

## Credit flow

1. Staff builds a Credit-mode sale; on submit, backend computes `wouldBeBalance = customer.creditBalance + bill.totalAmount`.
2. If `wouldBeBalance <= customer.creditLimit`: bill completes normally, `creditBalance` updates, a `CustomerCreditTransaction` row is logged.
3. If `wouldBeBalance > customer.creditLimit`: bill is held (stays `DRAFT`/pending-approval state) and a `CreditApprovalRequest` is created.
4. OrgAdmin/OrgManager sees it in a Pending Approvals list; approve → bill completes and balance updates as in step 2; reject → bill stays uncompleted, staff notified in-app (list-based, not push).
5. Recording a payment against a customer creates a `CustomerCreditTransaction` (`type = payment`) and reduces `creditBalance`.

## Black sale flow

1. OrgAdmin/OrgManager selects Black mode, builds the cart with charged (not official) prices.
2. On submit: for each line, stock is deducted from that product/location's `UnpublishedStock` row (not `Inventory`) — insufficient black stock fails the line the same way insufficient official stock fails a normal sale today.
3. `blackAmount` = sum of (charged − official) per line; if a facilitator + commission is set, `commissionAmount` is computed and a `CommissionPayable` row created (`status = owed`).
4. The bill itself is flagged `saleType = black`; default Bills/reporting views exclude black bills unless the viewer is OrgAdmin/OrgManager/SuperAdmin explicitly viewing the black ledger.
5. Marking a `CommissionPayable` row `paid` is a simple status flip, admin/manager only.

## Permissions summary

| Action | StoreStaff | StoreManager | OrgAdmin/OrgManager | SuperAdmin |
|---|---|---|---|---|
| Normal/Credit sale | ✅ (own location) | ✅ | ✅ | ✅ |
| View/create own credit approval request | ✅ | ✅ | ✅ | ✅ |
| Approve/reject credit request | ❌ | ❌ | ✅ | ✅ |
| View/add black stock (own location) | ✅ | ✅ | ✅ | ✅ |
| Publish black stock → official | ❌ | ✅ | ✅ | ✅ |
| Create a black sale | ❌ | ❌ | ✅ | ✅ |
| View black ledger / commission report | ❌ | ❌ | ✅ | ✅ |

## Testing/verification

- Normal sale flow unaffected (regression check on existing `runSalesCheckout` path).
- Credit sale under limit completes and updates balance; over limit blocks and creates an approval request; approval/rejection both exercised.
- Black sale deducts only from `UnpublishedStock`, never `Inventory`; official stock count verified unchanged after a black sale.
- Store Staff can see/add black stock for their own location but cannot see the sale-type toggle's Black option or the black ledger.
- Held ("Rakhone") sale round-trips: hold → appears in Held Sales → resume → complete.
- Documents print correctly via `window.print` for Debtor Note, Statement, Delivery Note.
