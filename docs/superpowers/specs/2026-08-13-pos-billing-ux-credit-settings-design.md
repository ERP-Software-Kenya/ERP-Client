# POS billing UX, credit flow, settings, and split screens — design

**Date:** 2026-08-13
**Status:** Approved
**Repos:** `ERP-Client` (`renderer/`) + `core-apis` (search filter, settings, credit-rule enforcement)
**Approach:** Phased (user chose Approach 1). Each phase is shippable on its own.

## Background

Cashiers use one POS screen (`POSTerminal.tsx`) that mixes Sales and Purchase via a toggle. Quantity can be set in two places. Line price is hidden behind a pencil. Credit search shows all customers. Quick Charges are hardcoded. Bills list “View Bill” is a raw field dump (`ViewDrawer`). Customer type (Regular / New / Shop / Big Customer) is a label only.

This spec covers the eight requests gathered 2026-08-13, implemented in four phases.

## Goal

Make sales billing faster and clearer: one qty control, inline rate edit, receipt-style bill view with print/download; restrict Credit to creditors with an explicit Send-for-Approval path; configure Quick Charges and type-level price/credit rules in settings; split Sales billing and Purchase billing into separate routes.

## Decisions (locked)

| Choice | Value |
|---|---|
| Qty control | Table only (Current Sale). Add Product always inserts qty 1. Remove left-panel qty. |
| Rate edit | Always-visible number input on the Rate column. Remove the pencil and its override popover. |
| Tax after pencil removal | Line keeps the product’s existing tax %. No tax editor on the line in this work. Black charged-price input is unchanged. |
| Creditor | Customer with `creditLimit != null` and `creditLimit > 0`. |
| Credit search | Credit sale type: customer search returns creditors only. Walk-in not allowed. |
| Big Customer vs Regular (pricing) | Org settings: discount % per customer type. Per-customer override wins. Cashier Rate edit on a line wins over discount for that line. |
| Special rate lists | Not this cycle. Discount % only. |
| Big Customer vs Regular (credit) | Per type: default credit limit + skip over-limit approval (yes/no). Per-customer override wins. |
| Over-limit UI | Separate **Send for Approval** button. Hide **Complete Sale** when over limit and approval is required. |
| After Send for Approval | Bill stays `DRAFT`; `CreditApprovalRequest` created (existing backend). POS shows bill number + Waiting for approval. Cashier can start a new sale. |
| After Approve | Approver’s Pending Credit Sales: complete bill, update balance, open receipt-style bill view, trigger print. |
| After Reject | Bill stays incomplete. Cashier POS shows dismissible in-app notice with bill number (poll; no push). Cashier can resume that draft or discard it. |
| Quick Charges | Org settings CRUD: name, signed amount, enabled. POS shows enabled rows only. No hardcoded tiles. |
| View Bill | Replace Bills list `ViewDrawer` dump with receipt layout + Print + Download. Keep “Open full page” for `/bills/:id`. |
| Print / Download | Reuse `buildSaleDocHtml` / `window.print`. Download = same HTML file (Electron `printToPDF` if already wired). No new PDF library. |
| Sales vs Purchase | Separate routes, no toggle. Shared presentational components; separate page state. |
| Implementation order | Phase 1 → 2 → 3 → 4. Do not start a later phase until the previous one is shipped. |

## Out of scope

- Per-product special price lists.
- Push / realtime notifications.
- New PDF libraries.
- Redesign of purchase-order receive / warehouse beyond splitting the POS screen.
- Changing Black sale stock rules, facilitator, or commission.
- Customer returns / credit notes.

---

## Phase 1 — POS UX (qty, rate, View Bill)

**Repos:** `ERP-Client` only.

### Qty

- Remove qty `-` / input / `+` from `ProductSearchPanel` (Add Product).
- `onAddProduct` / add button always uses qty **1**.
- Change qty only in `CartTable` Qty column (`−` / value / `+`), min 1.

### Rate

- Remove pencil (`overrideLine` popover: price + tax Apply/Cancel) for normal/credit lines.
- Rate column: number input bound to `line.rate`. On change, recompute line tax and line total with the same formulas as today (`lineTax` / `lineTotal` in `POSTerminal.tsx`).
- Rate must be ≥ 0. Empty/invalid while typing does not add the line to checkout until it parses as ≥ 0.
- Black mode: keep official rate + charged-price input as today.

### View Bill

Today `/bills` view action opens `ViewDrawer` with raw keys (`billNumber`, `organizationId`, UUIDs). That is the second screenshot.

Replace that drawer body with:

1. Header: bill number, status, warehouse/location name, customer or walk-in name, billed/created date. No raw org UUID as a primary field.
2. Line table: SKU, description, qty, rate, tax, line total (load items if the list payload omits them).
3. Footer: subtotal, tax, grand total, payment method when present.
4. Actions: **Print**, **Download**, existing **Open full page**.

`/bills/:id` (`BillDetail`) keeps INITIATED/DRAFT edit actions. Add Print / Download there using the same receipt HTML helper so approve-to-print (Phase 2) can reuse it.

### Files (intent)

| Path | Intent |
|---|---|
| `renderer/src/pages/pos/components/ProductSearchPanel.tsx` | Remove qty UI and qty props. |
| `renderer/src/pages/pos/POSTerminal.tsx` | Always add at qty 1; drop qty state used only for the left panel. |
| `renderer/src/pages/pos/components/CartTable.tsx` | Inline Rate input; remove pencil/override UI for non-black. |
| `renderer/src/pages/Bills/index.tsx` | Receipt-style view instead of generic `ViewDrawer` dump. |
| `renderer/src/pages/BillDetail/index.tsx` | Print / Download using shared receipt HTML. |
| `renderer/src/pages/pos/buildSaleDocHtml.ts` | Extend if bill-detail fields are missing (rate column, tax). |

### Verification

- Add a product: line appears at qty 1; left panel has no qty control.
- Change qty only in the table; totals update.
- Type a new rate in the table; line total updates; no pencil.
- Bills list View shows receipt layout, not UUID dump; Print opens print dialog; Download saves the HTML.

---

## Phase 2 — Credit cashier flow

**Repos:** `ERP-Client` + `core-apis` (creditor search filter).

### Credit search

- Add `hasCreditLimit?: boolean` to `SearchCustomersRequest` / query / handler: when true, `credit_limit IS NOT NULL AND credit_limit > 0`.
- POS Credit mode passes that flag. Normal/Black search unchanged.
- Credit with no customer: cannot Complete or Send for Approval (message already exists).

### Distinguish Regular vs Big Customer (UI only this phase)

- Show the selected customer’s type next to the name (and in the credit limit box).
- Type-level discount and skip-approval are **not** applied until Phase 3.

### Send for Approval

Today over-limit relabels the single checkout button to “Request approval”.

- Under limit (or skip-approval in Phase 3): **Complete Sale** only.
- Over limit and approval required: hide Complete Sale; show **Send for Approval**.
- Click: same checkout path that creates DRAFT + `CreditApprovalRequest`.
- Success: clear cart for a new sale; show “Waiting for approval — {billNumber}”.

### After Approve

On Pending Credit Sales, approve success:

1. Existing approve handler completes the bill and updates `creditBalance`.
2. Navigate to receipt-style bill view (`/bills/:id` or a print-focused view).
3. Trigger print (same helper as Phase 1).

### After Reject

- Bill remains not COMPLETED (existing reject).
- POS polls credit-approval requests **requested by the current user** with status `rejected`.
- Dismissible banner: `Credit sale {billNumber} was rejected.`
- Actions on the banner: **Resume** (load that DRAFT into the sales cart, same as Held Sales resume) or **Dismiss**.
- No push notifications.

### Files (intent)

| Path | Intent |
|---|---|
| `core-apis` search-customers request/handler | `hasCreditLimit` filter. |
| `ERP-Client` `api.ts` / POS customer search | Pass flag when `saleType === credit`. |
| `CheckoutPanel.tsx` | Separate Send for Approval vs Complete Sale. |
| `PendingApprovals.tsx` | On approve: open bill + print. |
| POS terminal | Waiting state; poll rejected requests; resume/dismiss. |

### Verification

- Credit search: customer with no limit does not appear; customer with limit does.
- Under limit: Complete Sale works; no Send for Approval.
- Over limit: only Send for Approval; request appears on Pending Credit Sales.
- Approve: bill COMPLETED, print dialog, balance increased.
- Reject: cashier sees banner with bill number; Resume loads the draft.

---

## Phase 3 — Settings: Quick Charges + type pricing/credit

**Repos:** `core-apis` + `ERP-Client`.

### Quick Charges

New org-scoped table (name example: `quick_charges`):

- `id`, `organizationId`, `label`, `amount` (signed decimal; + add, − subtract), `enabled`, `sortOrder`, timestamps.
- CRUD for OrgAdmin / OrgManager / SuperAdmin.
- POS loads enabled charges for the current org, ordered by `sortOrder`. Empty list: hide the Quick Charges section.

### Customer-type defaults

New org-scoped table (name example: `customer_type_rules`), unique `(organizationId, customerType)`:

| Field | Meaning |
|---|---|
| `discountPercent` | 0–100. Applied to list/retail rate when the bill’s customer type is this value. |
| `defaultCreditLimit` | Prefill on create-customer when that type is chosen and the cashier leaves limit empty. |
| `skipOverLimitApproval` | If true, over-limit credit sales complete without an approval request. |

Seed four rows per org (regular, new, shop, big_customer) at 0% discount, skip-approval false, default credit limit null.

Settings UI: one row per type, editable. Admin-only.

### Per-customer override

On `Customer`:

- `discountPercent` nullable — if set, beats type default.
- `skipOverLimitApproval` nullable — if set, beats type default.
- `creditLimit` already exists — still the live limit used at checkout.

Effective values for a bill:

1. Customer override field if not null (`discountPercent` / `skipOverLimitApproval`).
2. Else the type-rule row for **this bill’s selected customer type**.
3. Else discount 0, skip-approval false.

Cashier changing Rate on a line (Phase 1) stores that unit price on the line and does **not** re-apply discount to that line.

### Backend credit enforcement

`enforceCreditLimit` in `bill-completion.service.ts`:

- If effective skip-approval is true, do not create `CreditApprovalRequest`; complete and apply credit even when `wouldBeBalance > creditLimit`.
- If skip-approval is false, keep today’s over-limit → pending approval behavior.

POS uses the same effective skip-approval flag to choose Complete Sale vs Send for Approval.

### Discount application on POS

When a customer (or type) is selected, new lines get `rate = productRate * (1 - effectiveDiscount/100)`. Lines already in the cart keep their current rates unless the cashier changes Rate.

### Files (intent)

| Path | Intent |
|---|---|
| New entities + migrations | `quick_charges`, `customer_type_rules`; customer override columns. |
| New module or org-settings endpoints | CRUD for both. |
| `bill-completion.service.ts` | Honor skip-approval. |
| Customer create/update DTOs | Override fields; default limit from type rule when omitted. |
| ERP-Client settings pages | Quick Charges list editor; type-rules table. |
| `ProductSearchPanel.tsx` | Load charges from API. |
| `POSTerminal.tsx` | Apply discount to new lines; wire skip-approval into checkout buttons. |

### Verification

- Settings: add/edit/remove a charge; only enabled ones show on Sales POS.
- Set Big Customer 10% discount: new lines on a Big Customer bill use 90% of list rate; editing Rate sticks.
- Set Big Customer skip-approval: over-limit Completes without a request.
- Regular skip-approval false: over-limit still requires Send for Approval.
- Customer override discount/skip beats the type row.

---

## Phase 4 — Separate Sales and Purchase billing

**Repos:** `ERP-Client` (routing/nav). Checkout functions stay `runSalesCheckout` / `runPurchaseCheckout`.

### Routes

- Sales billing: `/pos/sales` (redirect `/pos` and `/pos?mode=purchase` appropriately).
- Purchase billing: `/pos/purchase`.

Nav:

- Sales group: **Sales Billing** → `/pos/sales` (replace “POS / Billing”).
- Purchase group: **Purchase Billing** → `/pos/purchase`.
- Purchase Orders “create from POS” goes to `/pos/purchase`.

### Split

- Two page entrypoints (thin wrappers) sharing components: product search, cart table, stock badge, checkout panel, receipt helpers.
- Each page owns its own state. No shared cart across routes. No Sales/Purchase toggle in `PosToolbar`.
- Sales page: Normal / Credit / Black, customer, credit, Quick Charges.
- Purchase page: supplier, receive qty, create PO. No credit, customer, Quick Charges, or sale-type toggle.

### Verification

- Sidebar has two entries; toggle is gone.
- A sale cart does not appear on Purchase Billing after navigating.
- Sales checkout still creates a bill; purchase checkout still creates a PO.

---

## Error handling

- Credit search API missing `hasCreditLimit`: fail closed in Credit mode (show no customers) until the backend ships with Phase 2.
- Over-limit without skip-approval: never complete the bill; only create approval request.
- Print/download with no line items: still print header + zeros; do not crash.
- Settings empty Quick Charges: hide the section, do not show stale hardcoded tiles.

## Testing

- Phase 1: manual POS + Bills view (no POS unit harness today).
- Phase 2: backend unit/handler test for `hasCreditLimit`; manual Credit search + approve/reject path.
- Phase 3: handler tests for skip-approval and discount override precedence; settings CRUD round-trip.
- Phase 4: manual route/nav + cart isolation.

## Risks / assumptions

- Bills list GET may omit `items`; View Bill may need `GET /bills/:id` when opening the drawer.
- Reject notice uses polling, so the cashier sees it on the next POS poll (seconds), not instantly.
- Type dropdown on a bill can differ from `customer.customerType`; effective discount/skip follow the **bill’s selected type**, then customer overrides for discount/skip fields on the customer record.
- `core-apis-sync-email-link` is a parallel tree; ship schema/API changes in `core-apis` (the live API for ERP-Client) unless that tree has already replaced it.
