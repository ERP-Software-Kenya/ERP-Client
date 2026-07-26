# Phase 2 — Purchase Module

**Depends on:** Phase 1 (Dialog/Select/ResourceForm components, `api.ts` mutation helpers, PurchaseOrder basic CRUD).
**Spec sections referenced:** §4 (Purchase Module), §3.3 (stock-out rules), §9 row 4 (doc numbering).

## 1. Goal

Deliver the real workflow from the spec's §4.1 flow diagram, as far as the live API supports it:
`Purchase Order (optional) → Goods Receipt/Direct Purchase Entry → Bill → Payment (full/partial) → Purchase Return (optional)`.

## 2. Current state

- PurchaseOrders: full CRUD available (Phase 1 covers list/create/edit/delete of the PO shell itself: supplier_id, store_id, total_amount, status, ordered_at).
- PurchaseItems (line items): **create + get-by-id only** — no list, no update, no delete on `/api/v1/purchase-items`.
- Bills: full CRUD, already linked via `purchase_order_id`.
- PaymentTransactions: full CRUD, generic (not purchase-specific — `reference`/`type`/`amount`/`status`, needs a `referenceType`/`referenceId` pattern per the richer OpenAPI shape noted in Phase 1 §3 to actually link a payment to a specific Bill).
- ItemReturns: full CRUD, `returnType` field (from OpenAPI request schema, not yet in `types.ts`) is what distinguishes a Purchase Return from a Sales Return.
- No screen currently shows a PO's line items, a Bill's linked PO, or a Payment's linked Bill — none of this relational structure is surfaced in the UI at all today.

## 3. The core blocker: no way to list Purchase Items for a PO

`/api/v1/purchase-items` supports `POST` (create) and `GET /{id}` (fetch one) — **there is no `GET /api/v1/purchase-items` or `/purchase-items/list`, and no `?purchaseOrderId=` filter**. This means: after creating line items for a PO and navigating away, **there is no API call that returns "all items belonging to PO X."**

Three options, in order of preference:

1. **Best — backend fix.** Add `GET /api/v1/purchase-items?purchaseOrderId=X` (or a `/list` endpoint with that filter), matching the pattern every other list-capable resource already uses. This is a one-line addition on a backend that already has the `/list` convention everywhere else. Recommend requesting this before building the PO detail screen, since every workaround below is strictly worse.
2. **Fallback — check if `PurchaseOrderResponse` embeds items server-side.** The OpenAPI schema for `PurchaseOrderResponse` only shows `id`/`name`, which is almost certainly under-annotated (same pattern seen on Product, Inventory, Store, Supplier, Category responses — none of which match `types.ts`'s real fields either). It's plausible the real JSON payload from `GET /purchase-orders/{id}` already includes a nested `items` array that the Swagger decorators just never declared. **This needs one real authenticated `GET /api/v1/purchase-orders/{id}` call to check before deciding anything** — don't build against an assumption either way.
3. **Worst — client-side cache.** If neither of the above pans out, track created `PurchaseItem` IDs locally (the existing `better-sqlite3` `api_cache` table in the Electron main process could hold `{purchase_order_id → [purchase_item_id...]}`) so the detail screen can at least reconstruct the list from this session's own writes. This is fragile (breaks across devices/reinstalls, doesn't show items created before this feature existed) and should be treated as a stopgap, not a real solution.

**This phase should not proceed past the PO-detail-with-line-items screen until this is resolved one way or another** — everything else in the module (Bills, Payments, Returns) is independently buildable regardless of how this resolves.

## 4. Screens & interactions

**Purchase Order List** — exists (Phase 1). Add a row action "View / Add Items" navigating to a PO detail screen.

**Purchase Order Detail** (new screen, `/purchase-orders/:id`)
- Header: supplier, store, status, total_amount, ordered_at (editable via the Phase 1 edit form, reused here).
- Line items table: item_id → resolve to Product name (fetch via `Products.getById`, or batch — no batch-get endpoint exists, so N individual lookups unless embedded per §3), quantity, unit_price, total_price (computed client-side: qty × unit_price).
- "Add Item" opens a form: Product select (searchable — reuse the Phase 1 Select component with an async-search pattern against `Products.search()`), Quantity, Unit Price. Submits `PurchaseItems.create({ purchaseOrderId, productId, quantity, unitPrice })`.
- **No edit/delete for line items** — the API doesn't support it. If a user needs to fix a mis-entered item, the only path is deleting the whole draft PO and recreating (annoying, but it's what the API allows; flag this to the user as a workflow limitation worth raising with backend, not something the client can paper over).
- Linked Bills section: list Bills where `purchase_order_id === this PO's id` — since Bills *does* have a list endpoint, filter client-side (`Bills.list()` then `.filter()`) unless/until a server-side filter param is confirmed.
- "Create Bill from this PO" — pre-fills `purchase_order_id`, opens the Bill create form (Phase 1).

**Bill Detail** — show linked PaymentTransactions (same client-side-filter approach as above, matched by whatever the confirmed `referenceId`/`referenceType` fields turn out to be — see Phase 1 §6 open question). "Record Payment" button pre-fills the link and opens Payment create form.

**Purchase Return** — reuse ItemReturns create form (Phase 1) with `returnType: 'purchase'` fixed, `supplierId` required, `orderId`/PO reference optional per spec §4.2. Confirm the exact request field names (OpenAPI shows `storeId, orderId, supplierId, returnType, status, totalAmount` on `CreateItemReturnRequest` — note it says `orderId` not `purchaseOrderId`, worth double-checking this actually accepts a PO id and isn't sales-order-only wording carried over from a shared DTO).

## 5. Business rules from spec §4.3 — implementable now vs. blocked

| Rule | Status |
|---|---|
| PO optional — direct purchase entry without a PO | **Implementable.** Bill/Payment flow doesn't require a `purchase_order_id`; just make it optional in the Bill create form. |
| Payable Outstanding = Σ(Invoices) − Σ(Payments) − Σ(Returns), per supplier | **Partially implementable.** Requires listing Bills/Payments/Returns filtered by supplier — Bills and ItemReturns support list+filter client-side; PaymentTransactions does too, but only once the actual link field to a Bill/Supplier is confirmed (Phase 1 §6). Compute the aggregate client-side; no backend endpoint does this math for you. |
| Multiple partial payments per invoice, running balance shown | **Implementable** once Payment→Bill linkage field is confirmed. |
| Batch/Serial captured at goods receipt | **Blocked** — no batch/serial fields exist anywhere in the backend. |

## 6. Open questions for this phase — resolved 2026-07-26 by reading `core-apis` source directly, then live-testing

- **Does `GET /purchase-orders/{id}` embed `items`?** No — worse than that: the entity has a real `items` relation, but `PurchaseOrderResponse` only ever exposes `id`/`name`. In fact the *entire* PurchaseOrder resource is broken this way — `storeId`/`supplierId`/`status`/`totalAmount`/etc. all exist on the entity but none are reachable through create/update/response DTOs. See `docs/core-apis-fixes.md` #0. Live-tested: even a `name`-only create 500s (consistent with the entity's NOT-NULL/unique `poNumber` never getting set).
- **`PaymentTransaction` linkage fields?** Confirmed: `referenceId` + `referenceType` (e.g. `referenceType: 'bill'`, `referenceId: <bill.id>`) — this part of the resource is correctly built. But create 500s anyway: domain model uses `orgId`, the entity's real column is `organizationId`. See `docs/core-apis-fixes.md` #0d.
- **Does `CreateItemReturnRequest.orderId` accept a PurchaseOrder ID?** No — confirmed `orderId` is a real FK constrained to the **Orders** (sales) table only. A Purchase Return can link to a `supplierId`, never to the originating PO. See `docs/core-apis-fixes.md` #0e.
- **Is missing PurchaseItem edit/delete a permanent limitation?** Moot for now — `POST /purchase-items` doesn't even work (field mismatch, `docs/core-apis-fixes.md` #0b), so there's nothing to edit/delete yet regardless.
- **New, more important finding than any of the above**: `POST /item-returns` — the one resource with a fully clean DTO/entity/domain-model chain — still returned a live `500 Internal server error` on a fully valid request (network response captured directly). This means the individual DTO mismatches found across this phase are not the whole story; something shared likely breaks most create calls for this session/org. See the callout at the top of `docs/core-apis-fixes.md`.

## 7. Done when

- [x] **UI built 2026-07-26** for the full module scope: PO list (name-only, honest about the limitation) + new `/purchase-orders/:id` detail screen (line items form, disabled), Bills list/detail (`/bills/:id`, disabled), Payment recording (disabled), Purchase Return via `ItemReturns.tsx` (returnType fixed to 'purchase' by default, orderId hidden for purchase returns since it can't reference a PO).
- [ ] **Nothing in this phase is functionally verified end-to-end** — PurchaseOrder create, PurchaseItem create, Bill create, Payment create, and (surprisingly) Item Return create all 500 live. Every write path in Phase 2 is disabled pending `core-apis` fixes (`docs/core-apis-fixes.md`).
- [ ] Payable Outstanding was not implemented — computing it requires Bills/Payments data that can't currently be created or correctly read (Bills' response DTO doesn't expose supplier/store either). Revisit once #0c/#0d are fixed.
