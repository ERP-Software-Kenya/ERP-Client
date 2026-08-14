# POS Phase 2 — Credit cashier flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Credit mode shows only creditors; separate Send for Approval; approve opens bill + print; reject notifies cashier on POS with Resume/Dismiss.

**Architecture:** Extend customer search with `hasCreditLimit` (category `hasParent` pattern). Add `GET /credit-approvals/mine` for the cashier’s rejected requests. POS wires separate checkout button + poll banner. Pending Approvals navigates to bill and prints after approve.

**Tech Stack:** NestJS/TypeORM (`core-apis`), React + TanStack Query (`ERP-Client`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-13-pos-billing-ux-credit-settings-design.md` Phase 2 only.
- Creditor = `creditLimit != null && creditLimit > 0`.
- Type-level discount / skip-approval = Phase 3 (UI label only this phase).
- No push notifications — poll rejected mine list.
- No new npm deps. Do not commit unless asked.
- Ship API changes in `core-apis` (not `core-apis-sync-email-link`).

---

## File map

| Path | Intent |
|---|---|
| `core-apis/.../search-customers.request.ts` (+ query, filter) | `hasCreditLimit?: boolean` |
| `core-apis/.../customer.repo.ts` | Filter `creditLimit > 0` when flag set |
| `core-apis/.../credit-approvals.controller.ts` | `GET mine` for requester |
| `core-apis/.../list-my-credit-approvals/*` | Query by `requestedById` + status |
| `ERP-Client/.../api.ts` | Pass `hasCreditLimit`; `useMyRejected` |
| `ERP-Client/.../CheckoutPanel.tsx` | Separate Send for Approval; show customer type |
| `ERP-Client/.../POSTerminal.tsx` | Credit search flag; waiting + reject banner |
| `ERP-Client/.../credit-approvals/PendingApprovals.tsx` | On approve → navigate + print |

---

### Task 1: Backend creditor search

**Files:**
- Modify: `core-apis/src/application/modules/customers/models/requests/search-customers.request.ts`
- Modify: `core-apis/src/application/modules/customers/queries/search-customers/search-customers.query.ts`
- Modify: `core-apis/src/application/modules/customers/domain/customer.filter.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/customer.repo.ts`

- [ ] **Step 1: Add `hasCreditLimit` to request/query/filter**

Same Transform as `list-products.request.ts` for query-string booleans:

```ts
@ApiPropertyOptional()
@IsOptional()
@Transform(({ value }) => { if (value === 'true') return true; if (value === 'false') return false; return undefined; })
@IsBoolean()
@AutoMap()
public hasCreditLimit?: boolean;
```

Mirror `@AutoMap() public hasCreditLimit?: boolean` on Query and CustomerFilter.

- [ ] **Step 2: CustomerRepo filter**

```ts
public override get specialFilterFields() {
  return [...super.specialFilterFields, 'hasCreditLimit'];
}
protected override modifyFindOption(findOpts, filterObj) {
  if (filterObj.hasCreditLimit === true) {
    (findOpts.where as Record<string, unknown>).creditLimit = MoreThan(0);
  }
}
```

---

### Task 2: Backend `GET /credit-approvals/mine`

**Files:**
- Modify: `i-credit-approval-request.repo.ts` — add `requestedById?: string` to filter
- Create: `queries/list-my-credit-approvals/*`
- Modify: `queries/index.ts` — register handler
- Modify: `credit-approvals.controller.ts` — `@Get('mine')` **before** param routes; roles include StoreStaff + StoreManager

- [ ] **Step 1: Query**

`ListMyCreditApprovalsQuery`: `organizationId`, `requestedById`, `status` (default `rejected`).

Handler: `repo.allAsync({ organizationId, requestedById, status })` (relations already load bill).

- [ ] **Step 2: Controller**

```ts
@Get('mine')
@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
async listMine(@CurrentUser() user, @Query('status') status?: string)
```

Use `user.dbUserId` + `user.organizationId`. Map to `CreditApprovalRequestResponse[]`.

---

### Task 3: Frontend credit search + Send for Approval + type label

**Files:**
- Modify: `renderer/src/api.ts` — Customers.useSearch accepts `hasCreditLimit`; CreditApprovals.useMyRejected
- Modify: `CheckoutPanel.tsx`, `POSTerminal.tsx`

- [ ] **Step 1: API**

`Customers.useSearch({ ..., hasCreditLimit?: boolean })` → filters `hasCreditLimit: 'true'`.

`CreditApprovals.useMyRejected()` → `GET /api/v1/credit-approvals/mine?status=rejected` with `refetchInterval: 15000`.

- [ ] **Step 2: POS search**

When `saleType === 'credit'`, pass `hasCreditLimit: true`. Placeholder: “Search creditor…”.

- [ ] **Step 3: Checkout buttons**

If `creditNeedsApproval`: hide Complete Sale; show **Send for Approval** (same `onGenerateBill`).
Else: Complete Sale only (no Request approval label).

Show customer type badge in credit box: `selectedCustomer.customerType` / bill `customerType`.

- [ ] **Step 4: Waiting banner**

On `pendingCreditApproval` success (existing modal OK). Also set a sticky POS banner string `Waiting for approval — {billNumber}` after close if desired — prefer keeping success modal copy clear: “Waiting for approval — {ref}”.

---

### Task 4: Approve → print; Reject → POS banner

**Files:**
- Modify: `renderer/src/pages/credit-approvals/PendingApprovals.tsx`
- Modify: `renderer/src/pages/pos/POSTerminal.tsx`
- Modify: `renderer/src/types.ts` — optional `bill?: { billNumber?: string }` on CreditApprovalRequest if missing

- [ ] **Step 1: Approve**

`approve.mutate(id, { onSuccess: (req) => { navigate(`/bills/${req.billId}`); /* fetch bill → billToPosReceipt → printSaleDoc */ } })`

- [ ] **Step 2: Reject banner on POS**

Poll `useMyRejected`. Filter out IDs in `sessionStorage` set `pos-dismissed-credit-rejections`.

Banner: `Credit sale {billNumber} was rejected.` Buttons: **Resume** (`resumeSale(billId)` + dismiss id), **Dismiss** (add id to session set).

---

## Spec coverage

| Spec item | Task |
|---|---|
| Creditor search filter | 1, 3 |
| Customer type UI only | 3 |
| Separate Send for Approval | 3 |
| Waiting after send | 3 |
| Approve → view + print | 4 |
| Reject → POS notice + Resume | 2, 4 |
