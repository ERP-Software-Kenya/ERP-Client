# Phase 3 — Sales Module

**Depends on:** Phase 1 (foundation), benefits from Phase 2 patterns (line-item and linkage workarounds are the same shape here).
**Spec sections referenced:** §5 (Sales Module).

## 1. Goal

Spec's §5.1 flow: Retail = Direct Invoice → Payment → (optional) Sales Return. Wholesale = Sales Order → Sales Invoice → Payment (full/partial/credit) → (optional) Sales Return.

## 2. Current state — this is the most backend-constrained phase

**Orders, Invoices, and Customers all have create + get-by-id only — no list endpoint on any of the three.** This is more severe than Purchase (which at least has PurchaseOrders with full CRUD). Practically: there is no API call that returns "all customers," "all orders," or "all invoices." The nav already has screens for all three (`Sales` group in `config/modules.ts`) but they render empty tables today and structurally cannot be filled in without a backend change.

## 3. What to actually build now vs. what's blocked

**Blocked, needs backend work (recommend requesting before this phase's UI has real value):**
- `GET /api/v1/customers` (list) — needed for literally any "pick a customer" dropdown anywhere in Sales, not just a Customers screen.
- `GET /api/v1/orders` (list) — needed for a Sales Order queue.
- `GET /api/v1/invoices` (list) — needed for an Invoice register.

Without these, the Sales module cannot reach parity with Purchase, no matter how much client code is written — this isn't a "build it anyway and it'll be a bit awkward" situation, it's a hard wall. **Recommend surfacing this to whoever owns the backend as the single highest-priority ask from this whole implementation effort**, since Sales is presumably the module that matters most to a retail+wholesale business.

**Buildable now, without any backend change:**
- **Create Customer** form (no list needed to create one).
- **Direct Invoice (Retail) create flow**: create an Order shell (`storeId`, `customerId`, `status`, computed `subtotal/taxAmount/totalAmount`, `paymentStatus`) then an Invoice referencing it (`orderId`, `totalAmount`, `status`). Since there's no line-item resource visible in the OpenAPI for Order/Invoice (unlike Purchase, which at least has `PurchaseItems`), **items on a sale currently have nowhere to be stored via this API at all** — confirm this isn't a gap in `types.ts`/OpenAPI documentation before concluding it's a real backend gap (same caveat as Phase 2 §3: the thin OpenAPI schemas are not fully trustworthy — check a real payload).
- **Payment Receipt**: same PaymentTransaction resource as Phase 2, `referenceType`/`referenceId` presumably pointing at an Invoice this time — same open question as Phase 2 about confirming those field names.
- **Sales Return**: ItemReturns with `returnType: 'sales'`, same mechanism as Phase 2's Purchase Return.

## 4. Screens & interactions (scoped to what's buildable)

**Customer create** — simple form (name, email, phone, gstin, status). Since there's no list, the only way to reach an existing customer afterward is via an Order/Invoice detail screen that references a `customerId` you already have (or "Walk-in" for retail per spec §5.2) — there is no customer directory screen possible yet.

**New Sale (Direct Invoice)** — a wizard-style single screen (not a table, since there's nothing to list):
1. Pick or create Customer (or "Walk-in" — spec §5.2 default for retail).
2. Pick Store.
3. Add line items — **blocked pending the line-item question above**; until resolved, this screen cannot actually record what was sold, only a total amount, which isn't useful for inventory deduction. This is the phase's critical path item.
4. Discounts (item-level then invoice-level, spec's calculation order in §5.2: `(Qty×Rate) − ItemDiscount`, sum, `− InvoiceDiscount`, then tax) — **tax step is blocked** (no Tax Group engine), so this can only go as far as computing a pre-tax total client-side.
5. Payment or mark as Credit with due date.

**Sales Order (Wholesale)** — same structural blockers as above (no list, likely no line items) — deprioritize until the Direct Invoice path proves out the line-item question, since it's the more complex of the two flows for less immediate payoff.

**Sales Return** — buildable now, same pattern as Phase 2 Purchase Return.

## 5. Business rules from spec §5.3 — status

| Rule | Status |
|---|---|
| Retail defaults to Direct Invoice; credit possible if flagged | Implementable once line items are resolved. |
| Wholesale: Order → Invoice, partial invoicing allowed | Blocked — no list endpoint to manage an order queue, and unclear if invoice line items can reference partial order quantities at all given the current schema. |
| Receivable Outstanding = Σ(Invoices) − Σ(Payments) − Σ(Returns), per customer | Blocked — can't sum "all invoices for customer X" without a list/filter endpoint. |
| Stock check at invoice time (stock-out rule precedence) | Blocked — depends on line items existing, and on Inventory's stock-out toggle fields which don't exist yet either (spec §3.3, not modeled anywhere in the backend). |

## 6. Recommendation

Given how much of this phase is structurally blocked, **the highest-value action here is writing up the specific backend asks** (list endpoints for Customers/Orders/Invoices, confirming whether line items exist for Order/Invoice) **and getting them prioritized**, rather than building UI that can't do the module's actual job. The Customer-create and Sales-Return pieces are safe to build now in the meantime since they don't depend on the blockers.

## 7. Open questions for this phase

- Do Orders/Invoices have a line-items concept at all server-side (unlike Purchase's separate `PurchaseItems` resource, nothing analogous like `OrderItems`/`InvoiceItems` appears in the OpenAPI paths list)? This needs a real authenticated call to check, or a direct question to whoever owns the backend — it's the single most important unknown in this entire implementation effort.
- If no line items exist server-side for Orders/Invoices, is adding that resource (and its list endpoint) something that can be prioritized, given it blocks the module's core purpose?
- Same `referenceType`/`referenceId` confirmation as Phase 2, for linking Payments to Invoices.

## 7b. Open questions — resolved 2026-07-26 by reading `core-apis` source directly

- **Do Orders/Invoices have line items server-side?** Orders do (`OrderItemEntity`, real relation from `OrderEntity.items`) — Invoices don't (an invoice just references its parent Order). But exactly like Phase 4's `StockTransferItemEntity`, `OrderItemEntity` is schema-only — no application module/controller/command/query exists for it. See `docs/core-apis-fixes.md` #9.
- **Is adding that resource prioritizable?** Not this client's call — flagged in the fix list as the resolution to what the spec called "the single most important unknown in this entire implementation effort."
- **`referenceType`/`referenceId` for linking Payments to Invoices?** Same confirmed pattern as Phase 2 (`docs/core-apis-fixes.md` #0d) — `referenceType: 'invoice'`, `referenceId: <invoice.id>`. Not built into a screen this round since Invoice creation itself is unverified.
- **New finding beyond the spec's questions**: `Customer`/`Order` create both 500 for a different, more precise reason than expected — not a wholesale DTO mismatch like Phase 2's `PurchaseOrder`/`Bills`, but one specific missing field: the entity's NOT-NULL `organizationId` is never set by either command. `Invoice` create looks like the cleanest DTO/entity match found in this whole investigation (no `organizationId` needed at all) — not live-tested, shipped disabled anyway per the established caution (see `docs/core-apis-fixes.md` #8).

## 8. Done when

- [x] **UI built 2026-07-26**: Customer create form (`Customers.tsx`), Order create form (`Orders.tsx`), Invoice create form (`Invoices.tsx`) — all create-only per the confirmed capability matrix (no list/update/delete on any of the three). Sales Return already works structurally via the existing `ItemReturns.tsx` (returnType toggle, orderId field shown only for `returnType: 'sales'`).
- [ ] **Nothing in this phase is functionally verified** — Customer and Order create are confirmed to 500 live (`docs/core-apis-fixes.md` #8); Invoice create is unverified and shipped disabled out of caution; Sales Return inherits Phase 2's confirmed-broken `ItemReturns` create (#0e). Every submit button in this phase is disabled pending backend fixes.
- [x] Gated correctly, not silently skipped — every screen states its specific blocker inline and points at the relevant `core-apis-fixes.md` entry.
