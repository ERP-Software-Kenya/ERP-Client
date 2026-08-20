# POS Phase 1 — Qty, inline rate, View Bill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One qty control (cart table only), always-visible Rate input (no pencil), receipt-style View Bill with Print and Download.

**Architecture:** Smallest diffs in existing POS components. Map `Bill` → existing `PosReceipt` and reuse `ReceiptDocument` + `buildSaleDocHtml` for on-screen view, print, and download. No new PDF library.

**Tech Stack:** React + TypeScript, Tailwind, lucide-react, sonner, existing Electron `savePdf` when present.

## Global Constraints

- Frontend only in `ERP-Client/renderer` — no core-apis changes this plan.
- No new npm dependencies.
- Print via `window.print` or a print window fed by `buildSaleDocHtml`. Download = Electron `savePdf` if wired, else HTML file.
- Tax stays on the line as the product’s existing `%`. No tax editor. Black charged-price input unchanged.
- Add Product always inserts qty 1. Qty changes only in the cart table (min 1).
- No frontend unit-test harness — verify with `npx tsc --noEmit` + manual UI checks.
- Do not commit unless the user asks.
- Phases 2–4 are out of this plan.

---

## File map

| Path | Intent |
|---|---|
| `renderer/src/pages/pos/components/ProductSearchPanel.tsx` | Remove qty stepper and `qty` / `onQtyChange` props. Keep Add button. |
| `renderer/src/pages/pos/POSTerminal.tsx` | Drop `qty` / override state. `addProduct` always qty 1. Wire `onRateChange`. |
| `renderer/src/pages/pos/components/CartTable.tsx` | Remove pencil + override popover. Rate column is a number input. |
| `renderer/src/pages/pos/billReceipt.ts` | `billToPosReceipt`, `printSaleDoc`, `downloadSaleDoc`. |
| `renderer/src/pages/pos/buildSaleDocHtml.ts` | Line table includes qty, rate, tax, amount. |
| `renderer/src/pages/Bills/BillViewDrawer.tsx` | Receipt-style drawer: fetch full bill, Print / Download / Open full page. |
| `renderer/src/pages/Bills/index.tsx` | Use `BillViewDrawer` instead of generic `ViewDrawer` dump. |
| `renderer/src/pages/BillDetail/index.tsx` | Print / Download on the header. |

---

### Task 1: One qty control

**Files:**
- Modify: `renderer/src/pages/pos/components/ProductSearchPanel.tsx`
- Modify: `renderer/src/pages/pos/POSTerminal.tsx`

**Interfaces:**
- Consumes: `addProduct(p: Product)` already in `POSTerminal`
- Produces: `ProductSearchPanel` no longer has `qty` or `onQtyChange`

- [x] **Step 1: Strip qty from ProductSearchPanel**

Remove `qty`, `onQtyChange` from `ProductSearchPanelProps` and the destructure.

Delete the stepper block (the `flex items-center gap-2 mt-3` div that contains Minus / number input / Plus). Keep the **Add** button in that row (full width).

Remove unused `Minus` / `Plus` imports if nothing else uses them.

- [x] **Step 2: POSTerminal always adds qty 1**

Delete `const [qty, setQty] = useState(1);`.

In `addProduct`, set `let addQty = 1;` (stock-room clamp still applies). Remove `setQty(1)` at the end of `addProduct`.

Stop passing `qty` / `onQtyChange` into `<ProductSearchPanel>`.

- [x] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p renderer` (or the tsconfig this package uses)

Expected: no errors from removed props.

---

### Task 2: Inline Rate, remove pencil

**Files:**
- Modify: `renderer/src/pages/pos/components/CartTable.tsx`
- Modify: `renderer/src/pages/pos/POSTerminal.tsx`

**Interfaces:**
- Consumes: `handleBlackRateChange(lineId: number, rate: number)` — reuse as `onRateChange` for normal/credit too
- Produces: `CartTableProps.onRateChange: (lineId: number, rate: number) => void`. Override props gone.

- [ ] **Step 1: CartTable — drop override UI**

Remove from props: `overrideLine`, `overridePrice`, `overrideTax`, `onStartOverride`, `onOverridePriceChange`, `onOverrideTaxChange`, `onApplyOverride`, `onCancelOverride`.

Remove `TAXES_LIST`, `Pencil` import.

In the Description cell, render only `line.name` (no pencil, no override popover).

Replace the static Rate cell (`fmt(line.rate)`) with the same number input black mode already uses for charged price:

```tsx
<input
  type="number"
  min={0}
  step="0.01"
  value={line.rate}
  onChange={(e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
  }}
  className="w-24 text-sm px-2 py-1 border border-border rounded-lg outline-none focus:border-primary tabular-nums"
/>
```

Rename `onBlackRateChange` to `onRateChange` and use it for **both** black charged price and normal/credit Rate. Black official column stays read-only.

- [ ] **Step 2: POSTerminal — drop override state**

Delete `overrideLine` / `overridePrice` / `overrideTax` state and `handleStartOverride` / `applyOverride`.

Pass `onRateChange={handleBlackRateChange}` (or rename the handler to `handleRateChange`).

Checkout already uses `line.rate`; invalid/NaN is never stored.

- [x] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p renderer`

Expected: PASS.

---

### Task 3: Bill → receipt helper + print/download

**Files:**
- Create: `renderer/src/pages/pos/billReceipt.ts`
- Modify: `renderer/src/pages/pos/buildSaleDocHtml.ts`

**Interfaces:**
- Consumes: `Bill`, `PosReceipt`, `buildSaleDocHtml`, `defaultPdfFileName`
- Produces:

```ts
export function billToPosReceipt(
  bill: Bill,
  opts: {
    locationName?: string;
    partyLabel?: string;
    productLabel?: (productId: string) => string;
  },
): PosReceipt;

export function printSaleDoc(receipt: PosReceipt, kind?: SaleDocKind): void;
export function downloadSaleDoc(receipt: PosReceipt, kind?: SaleDocKind): Promise<void>;
```

- [ ] **Step 1: `billToPosReceipt`**

Map:

- `ref` = `bill.billNumber || bill.id`
- `mode` = `'sales'`
- `storeName` = `opts.locationName`
- `partyLabel` = `opts.partyLabel`
- `paymentMethod` = `bill.paymentMethod ?? undefined`
- `saleType` = `bill.saleType ?? undefined`
- `lines` from `bill.items ?? []`: sku/name via `productLabel(productId)` falling back to truncated id; `qty` = quantity; `rate` = unitPrice; `taxPct` = taxRate; `lineTotal` = lineTotal
- `extraCharges` = `[]`
- `subtotal` / `taxAmount` / `totalAmount` from bill
- `createdAt` = `bill.billedAt || bill.createdAt || new Date().toISOString()`
- `synced` = `true`

- [ ] **Step 2: print + download**

`printSaleDoc`: open a blob URL of `buildSaleDocHtml(receipt, kind ?? 'receipt')` in a new window and `print()`. If popup blocked, toast error.

`downloadSaleDoc`: if `window.electronAPI?.savePdf` exists, use it (same as `downloadSalePdf` in POSTerminal). Else download an `.html` file via `<a download>`.

- [ ] **Step 3: Extend `linesTable` in `buildSaleDocHtml.ts`**

Columns: Item, Qty, Rate, Tax, Amt. Empty `receipt.lines` still renders the table (no crash).

---

### Task 4: Receipt-style View Bill + BillDetail print/download

**Files:**
- Create: `renderer/src/pages/Bills/BillViewDrawer.tsx`
- Modify: `renderer/src/pages/Bills/index.tsx`
- Modify: `renderer/src/pages/BillDetail/index.tsx`

**Interfaces:**
- Consumes: `billToPosReceipt`, `printSaleDoc`, `downloadSaleDoc`, `ReceiptDocument`, `Bills.useGet`, `FormDrawer`
- Produces: View action shows receipt, not UUID dump

- [ ] **Step 1: BillViewDrawer**

Props: `billId: string | null`, `onClose`, `locationName`, `partyLabel`.

When `billId` set, `Bills.useGet(billId)` so `items` load.

Render `FormDrawer` title `View Bill`. Body: status + `ReceiptDocument`. Footer: Print, Download, Open full page (`navigate(/bills/:id)`), Close.

Do not pass the bill through generic `ViewDrawer` (`data={...viewRow}` dump).

- [ ] **Step 2: Bills/index.tsx**

Replace `ViewDrawer` + `viewData` with `<BillViewDrawer billId={viewRow?.id ?? null} ... />`. Keep `setViewRow` from `onView`.

- [ ] **Step 3: BillDetail header actions**

Add Print and Download next to existing status buttons. Build receipt with `billToPosReceipt` using the same location/party labels already computed on that page.

Keep INITIATED/DRAFT edit UI.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p renderer`

Expected: PASS.

---

## Spec coverage (Phase 1 only)

| Spec item | Task |
|---|---|
| Remove left-panel qty; add at qty 1 | Task 1 |
| Qty only in cart table | unchanged table stepper (Task 1) |
| Inline Rate; remove pencil | Task 2 |
| No tax editor; black charged input stays | Task 2 |
| View Bill receipt layout | Task 4 |
| Print + Download | Tasks 3–4 |
| BillDetail Print/Download | Task 4 |
| Phases 2–4 | not this plan |
