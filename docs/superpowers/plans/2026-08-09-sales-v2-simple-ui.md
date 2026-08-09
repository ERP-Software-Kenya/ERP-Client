# Sales v2 Simple UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the easy one-screen Sales UI from `2026-08-09-sales-v2-simple-ui-design.md`: progressive disclosure on POS, Kenya-style payments, print docs, Approvals + Black Ledger polish.

**Architecture:** Extend existing `POSTerminal.tsx` / `checkout.ts` / `ReceiptDocument.tsx` patterns. No new libraries. Documents are sibling print components using the same `.pos-print-root` + `window.print` path. Progressive disclosure via saleType / payMethod / paymentTiming conditionals only.

**Tech Stack:** React + TypeScript, Tailwind, lucide-react, sonner, existing Electron renderer.

## Global Constraints

- Frontend only in `ERP-Client/renderer` — no core-apis changes this plan.
- No new npm dependencies.
- Documents use `window.print` only (no PDF lib).
- Boxes Tracker / STK Push / PDF download out of scope.
- Keep Normal cash path visually minimal; Credit/Black/delivery only when needed.
- Mode chrome: Credit = soft amber tint, Black = soft slate tint; no purple glow.
- Prefer smallest diffs in existing large `POSTerminal.tsx` over a full rewrite.
- No frontend unit-test harness exists — verify with `npx tsc --noEmit -p renderer` (or project tsconfig) + manual UI checks.
- Do not commit unless the user asks.

---

## File map

| Path | Intent |
|---|---|
| `renderer/src/pages/pos/checkout.ts` | Widen `paymentMethod`; optional `paymentReference` into notes; extend `PosReceipt` for docs |
| `renderer/src/pages/pos/POSTerminal.tsx` | Layout/chrome, payments, credit meter, black dual price, delivery collapse, success doc actions |
| `renderer/src/pages/pos/DebtorNoteDocument.tsx` | New print doc |
| `renderer/src/pages/pos/StatementDocument.tsx` | New print doc |
| `renderer/src/pages/pos/DeliveryNoteDocument.tsx` | New print doc |
| `renderer/src/pages/PendingApprovals/index.tsx` | Customer name, clearer columns/actions |
| `renderer/src/pages/BlackLedger/index.tsx` | org_manager gate, chips, empty states |
| `renderer/src/types.ts` | Only if PaymentMethod enum needs a comment/alias — prefer string mapping in checkout |

---

### Task 1: Payment methods + checkout receipt fields

**Files:**
- Modify: `renderer/src/pages/pos/checkout.ts`
- Modify: `renderer/src/pages/pos/POSTerminal.tsx` (PayMethod type + wiring only)

**Interfaces:**
- Consumes: existing `SalesCheckoutInput`, `toBillPaymentMethod`, `PosReceipt`
- Produces:
  - `export type PosPayMethod = 'cash' | 'mpesa' | 'till' | 'bank' | 'other'`
  - `SalesCheckoutInput.paymentMethod: PosPayMethod`
  - `SalesCheckoutInput.paymentReference?: string`
  - `PosReceipt` gains optional `saleType?`, `paymentTiming?`, `paymentReference?`, `creditLimit?`, `creditBalance?`, `delivery?: DeliveryInfo`
  - `export interface DeliveryInfo { driverName?: string; companionName?: string; vehicleNumber?: string; license?: string; location?: string; distance?: string; gps?: string; note?: string; rating?: string }`
  - `toBillPaymentMethod`: cash→`CASH`, mpesa|till→`UPI`, bank→`NET_BANKING`, other→`CHEQUE` (backend enum today; ref goes in notes)

- [ ] **Step 1: Extend checkout types and mapper**

In `checkout.ts`, replace payment method typing and add helpers:

```ts
export type PosPayMethod = 'cash' | 'mpesa' | 'till' | 'bank' | 'other';

export interface DeliveryInfo {
  driverName?: string;
  companionName?: string;
  vehicleNumber?: string;
  license?: string;
  location?: string;
  distance?: string;
  gps?: string;
  note?: string;
  rating?: string;
}

// on PosReceipt add:
// saleType?, paymentTiming?, paymentReference?, creditLimit?, creditBalance?, delivery?

// on SalesCheckoutInput:
// paymentMethod: PosPayMethod;
// paymentReference?: string;
// delivery?: DeliveryInfo;
// facilitator fields already may be partial — keep as-is if present

function toBillPaymentMethod(method: PosPayMethod): PaymentMethod {
  switch (method) {
    case 'mpesa':
    case 'till':
      return 'UPI';
    case 'bank':
      return 'NET_BANKING';
    case 'other':
      return 'CHEQUE';
    default:
      return 'CASH';
  }
}
```

When building `notesParts` in `runSalesCheckout`, if `paymentReference` set, push `Pay ref: ${paymentReference}`. Copy new fields onto the local `receipt` object when built.

- [ ] **Step 2: Wire POSTerminal PayMethod**

Change local `type PayMethod = PosPayMethod` (import from checkout). Default `'cash'`. Pass `paymentReference` into checkout/hold calls.

- [ ] **Step 3: Typecheck**

Run from `ERP-Client`: `npx tsc --noEmit -p renderer/tsconfig.json` (or root tsconfig that includes renderer).  
Expected: no errors from these files.

---

### Task 2: POS progressive UI (layout, credit meter, black columns, delivery)

**Files:**
- Modify: `renderer/src/pages/pos/POSTerminal.tsx`

**Interfaces:**
- Consumes: Task 1 `PosPayMethod`, `DeliveryInfo`, selected customer credit fields
- Produces: UI-only state `delivery: DeliveryInfo`, `paymentReference: string`, `showDelivery: boolean`

- [ ] **Step 1: Mode chrome on outer sales shell**

When `mode === 'sales'`, wrap main sales card with tint:
- `saleType === 'credit'` → `ring-1 ring-amber-300/60 bg-amber-50/30` (or dark-mode friendly `bg-amber-500/5`)
- `saleType === 'black'` → `ring-1 ring-slate-400/50 bg-slate-500/5`
- else none

Move **Sale Type** toggle next to header actions (top bar area already has Hold/Held) so rail is less crowded; keep a compact duplicate only if header space is tight — prefer single toggle in header.

- [ ] **Step 2: Payment method grid (5 options) + ref field**

Replace cash/card grid with:

```tsx
const PAY_METHODS: Array<{ value: PosPayMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'till', label: 'Till' },
  { value: 'bank', label: 'Bank' },
  { value: 'other', label: 'Other' },
];
```

Show cash tendered only for `cash`. Show one `paymentReference` input when `payMethod` is `mpesa` | `till` | `bank` | `other`.

- [ ] **Step 3: Credit meter + Request approval label**

When `saleType === 'credit' && selectedCustomer`:
```tsx
const limit = Number(selectedCustomer.creditLimit ?? 0);
const balance = Number(selectedCustomer.creditBalance ?? 0);
const remaining = limit - balance;
const wouldBe = balance + grandTotal;
const needsApproval = limit > 0 && wouldBe > limit;
```
Show Limit / Balance / Remaining. If `needsApproval`, primary Complete button text = `Request approval`. If credit and no customerId, disable Complete with short hint.

- [ ] **Step 4: Black dual price on lines**

When `saleType === 'black'`, table headers include Official + Charged. Official = `fmt(line.officialRate)` (read-only). Charged = editable number input bound to `line.rate` (update line on change). Show `blackMarkup` row in totals rail (already computed).

Simplify facilitator UI to two paths: None | User search | Name — keep existing three buttons if already working; do not rebuild.

- [ ] **Step 5: Collapsed Delivery panel**

Below payment timing (sales only):
```tsx
<button type="button" onClick={() => setShowDelivery((v) => !v)}>+ Delivery info</button>
{showDelivery && (/* compact inputs for DeliveryInfo fields */)}
```
Pass `delivery` into checkout receipt builder / success modal state.

- [ ] **Step 6: Typecheck + smoke**

`npx tsc --noEmit -p renderer/tsconfig.json`  
Manual: Normal sale shows no credit/black/delivery chrome until opened/toggled.

---

### Task 3: Print documents + success actions

**Files:**
- Create: `renderer/src/pages/pos/DebtorNoteDocument.tsx`
- Create: `renderer/src/pages/pos/StatementDocument.tsx`
- Create: `renderer/src/pages/pos/DeliveryNoteDocument.tsx`
- Modify: `renderer/src/pages/pos/POSTerminal.tsx` (`BillSuccessModal`)
- Modify: `renderer/src/index.css` only if a second print root class is required — prefer one `.pos-print-root` swapping content

**Interfaces:**
- Consumes: extended `PosReceipt` from Task 1
- Produces: three components `DebtorNoteDocument`, `StatementDocument`, `DeliveryNoteDocument` each `{ receipt: PosReceipt }`

- [ ] **Step 1: Add three print components** mirroring `ReceiptDocument` structure (narrow sheet, dashed headers, tabular lines).  
  - Debtor Note: title “Debtor Note”, customer, total owed, sale ref, timing  
  - Statement: customer, previous balance (creditBalance), this sale, would-be balance  
  - Delivery Note: lines + delivery block fields if present  

- [ ] **Step 2: Success modal doc strip**

State `printDoc: 'receipt' | 'debtor' | 'statement' | 'delivery'`.  
Render chosen doc inside existing `.pos-print-root` (find current mount in POSTerminal). Buttons call `setPrintDoc` then `window.print()`.

Hide Debtor/Statement unless `receipt.saleType === 'credit'` (or always show but debtor/statement still useful — **show all four**; Debtor/Statement simply omit credit rows if not credit).

- [ ] **Step 3: Verify print CSS** still isolates `.pos-print-root` only.

---

### Task 4: Pending Approvals polish

**Files:**
- Modify: `renderer/src/pages/PendingApprovals/index.tsx`
- Check: `renderer/src/types.ts` `CreditApprovalRequest` shape for customer name fields

**Interfaces:**
- Consumes: `CreditApprovals.useListPending`
- Produces: display helper `customerLabel(item)` → bill.customer name / walkIn / fallback

- [ ] **Step 1: Improve columns** — Date, Bill, Customer (name not id slice), Requested by (short id ok), Amount, Actions. Empty state copy: `No pending credit approvals.` Toasts on approve/reject if mutations expose onSuccess (add if missing via sonner).

- [ ] **Step 2: Typecheck**

---

### Task 5: Black Ledger polish

**Files:**
- Modify: `renderer/src/pages/BlackLedger/index.tsx`

- [ ] **Step 1: Gate roles** include `org_manager` alongside `org_admin` / `super_admin` (match parent spec).

- [ ] **Step 2: Status chips** for commission Owed/Paid; clearer empty states; keep Mark paid button.

- [ ] **Step 3: Typecheck**

---

### Task 6: End-to-end verification

- [ ] **Step 1:** `npx tsc --noEmit -p renderer/tsconfig.json`
- [ ] **Step 2:** Manual checklist from spec Verification section (Normal minimal chrome; Credit meter; Black dual price; M-Pesa ref; print four docs; Approvals; Ledger).
- [ ] **Step 3:** Commit only if user asks.

---

## Spec coverage check

| Spec item | Task |
|---|---|
| Simple one-screen + progressive disclosure | 2 |
| Payment Cash/M-Pesa/Till/Bank/Other + ref | 1, 2 |
| Credit meter + Request approval label | 2 |
| Black dual price + markup rail | 2 |
| Delivery collapsed | 2 |
| Documents window.print | 3 |
| Approvals polish | 4 |
| Black Ledger polish + org_manager | 5 |
| No backend / no STK / no Boxes Tracker | global |

## Risks

- Backend may reject unknown bill fields / payment enums — mapper stays on existing `PaymentMethod` values; ref in notes.
- `POSTerminal.tsx` is large — edit surgically; avoid full rewrite.
- Credit approval still won’t complete server-side until core-apis Tasks 1–10 land; UI labels still ship.
