# Context: Purchase Order Flow

**Session date:** 2026-08-02
**Branch:** `feat/purchase-order-flow` (branched from `feat/locations-stores-completion`)

This document is the complete implementation record for the purchase order flow —
POS terminal refactor, purchase order detail page, receipt verification page, and
all status-transition actions. Read this before touching any of these modules in
a future session.

---

## 1. POS Terminal Refactor (`renderer/src/pages/pos/POSTerminal.tsx`)

### 1a. What was requested
- Remove the Store dropdown entirely; keep only a Location picker
- Replace both the Location `<select>` and Supplier `<select>` with the reusable
  Radix `DropdownMenu` component already used in the rest of the app
- Remove the +/− quantity editor from the bill table (bill shows read-only qty)
- Fix `orgId` derivation after the store was removed

### 1b. Imports removed
```typescript
// Removed
import { Store as StoreIcon } from 'lucide-react';
import { Stores } from '../../api';
import type { Store } from '../../types';
```

```typescript
// Added
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
```

### 1c. State and hooks removed
```typescript
// Removed entirely
const [storeId, setStoreId] = useState<string>('');
const { data: stores = [], isLoading: storesLoading } = Stores.useList();
// store auto-select useEffect
// storeOrgId() helper function
// store useMemo
// updateQty() function (bill table +/- buttons)
```

### 1d. orgId derivation
Previously: `const orgId = storeOrgId(store)` where `storeOrgId` read
`store?.organizationId`.

After removal: `LocationEntity` has its own `organizationId` field, so:
```typescript
const orgId = stockLocation?.organizationId;
```
This is placed directly after the `stockLocation` useMemo.

### 1e. Location auto-select simplified
```typescript
// Before (had to handle both storeId and locationId)
useEffect(() => {
  if (locations.length === 0 || locationId) return;
  setLocationId(locations[0].id);
}, [locations, locationId]);
```

### 1f. Location DropdownMenu pattern
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button type="button" disabled={locationsLoading}
      className="flex items-center gap-2 ...">
      <Package size={15} className="text-muted-foreground flex-shrink-0" />
      <span className="truncate">
        {locationsLoading ? "Loading…"
          : stockLocation
            ? `${stockLocation.name} (${stockLocation.type.charAt(0).toUpperCase() + stockLocation.type.slice(1)})`
            : locations.length === 0 ? "No locations" : "Select location"}
      </span>
      <ChevronDown size={13} className="text-muted-foreground flex-shrink-0 ml-1" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
    <DropdownMenuRadioGroup value={locationId} onValueChange={setLocationId}>
      {locations.map((l) => (
        <DropdownMenuRadioItem key={l.id} value={l.id}>
          {l.name} ({l.type.charAt(0).toUpperCase() + l.type.slice(1)})
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

The Supplier dropdown uses the same pattern (replace `locations` with `suppliers`,
`locationId`/`setLocationId` with `supplierId`/`setSupplierId`, `Package` icon
with `Truck` icon).

### 1g. Bill table qty — read-only
The +/− stepper buttons and `updateQty` function were removed entirely.
Bill table now renders:
```tsx
<span className="font-semibold text-foreground">{line.qty}</span>
```
Quantity is set via the sidebar stepper before adding the product.

### 1h. Summary panel fix
After removing `StoreIcon` from imports, a reference remained at line 1166 in the
bill summary panel. Fixed:
```tsx
// Before (runtime crash: StoreIcon is not defined)
<StoreIcon size={12} />
{store?.name ?? "Select a store from the top bar"}

// After
<Package size={12} />
{stockLocation?.name ?? "Select a location from the top bar"}
```

---

## 2. Purchase Checkout (`renderer/src/pages/pos/checkout.ts`)

### 2a. Interface change
```typescript
// Before
export interface PurchaseCheckoutInput {
  storeId: string;
  locationId?: string;   // optional
  ...
}

// After
export interface PurchaseCheckoutInput {
  locationId: string;    // required, storeId removed entirely
  ...
}
```

### 2b. Validation and POST body
```typescript
if (!input.locationId) {
  steps.push({ name: 'Validate location', status: 'failed',
    message: 'Select a location from the top bar' });
  return { receipt, steps, primaryOk: false };
}
// ...
post('/api/v1/purchase-orders', {
  locationId: input.locationId,
  supplierId: input.supplierId,
  // ...
})
```

The `SalesCheckoutInput` interface also had its unused `storeId` field removed.

---

## 3. Critical Bug — PurchaseOrderStatus Enum Case Mismatch

### 3a. Root cause
The frontend type was PascalCase:
```typescript
// WRONG — was
export type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'PartiallyReceived' | 'Received' | 'Cancelled';
```

The backend enum (`e-purchase-order-status.ts`) uses **lowercase snake_case**:
```typescript
export enum EPurchaseOrderStatus {
  Draft             = 'draft',
  Ordered           = 'ordered',
  PartiallyReceived = 'partially_received',
  Received          = 'received',
  Cancelled         = 'cancelled',
}
```

### 3b. Symptoms
- Status badges showed the wrong colour (fell through to `bg-muted text-foreground` fallback)
- "Verify Receipt" never appeared in row actions because
  `row.status === 'Draft'` never matched the actual value `'draft'`

### 3c. Fix
```typescript
// CORRECT — now
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
```

All STATUS_CONFIG/STATUS_STYLES record keys, `canVerify()` conditions, and status
comparisons were updated across all four files that reference this type.

---

## 4. Purchase Orders List Page (`renderer/src/pages/PurchaseOrders.tsx`)

### 4a. STATUS_STYLES — updated keys
```typescript
const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  draft:             'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  ordered:           'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  partially_received:'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  received:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  cancelled:         'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
};
```

### 4b. STATUS_LABELS — display-friendly names
Since the raw values are lowercase snake_case, a labels map is needed for display:
```typescript
const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft:             'Draft',
  ordered:           'Ordered',
  partially_received:'Partially Received',
  received:          'Received',
  cancelled:         'Cancelled',
};
// StatusBadge uses: {STATUS_LABELS[status] ?? status}
```

### 4c. Row actions — "Mark as Ordered" + "Verify Receipt"
```typescript
const updateMutation = PurchaseOrders.useUpdate();  // at component level

extraRowActions={(row) => {
  const actions: ExtraAction[] = [];
  if (row.status === 'draft') {
    actions.push({
      label: 'Mark as Ordered',
      icon: <ShoppingCart size={14} />,
      onSelect: () => updateMutation.mutate({
        id: row.id,
        body: { status: 'ordered' } as Partial<PurchaseOrder>,
      }),
    });
  }
  if (row.status === 'draft' || row.status === 'ordered' || row.status === 'partially_received') {
    actions.push({
      label: 'Verify Receipt',
      icon: <ClipboardCheck size={14} />,
      onSelect: () => navigate(`/purchase-orders/${row.id}/receive`),
    });
  }
  return actions;
}}
```

`PurchaseOrders.useUpdate()` comes from `purchaseOrdersBase` (spread from
`createResource`), which does `PUT /api/v1/purchase-orders/:id` with the body.
The backend `UpdatePurchaseOrderRequest` accepts `status?: EPurchaseOrderStatus`,
so `{ status: 'ordered' }` is a valid payload.

---

## 5. Purchase Order Detail Page (`renderer/src/pages/PurchaseOrderDetail.tsx`)

New page at route `/purchase-orders/:id`.

### 5a. Data fetching
```typescript
const { data: po }    = PurchaseOrders.useGet(id);
const { data: items } = PurchaseOrders.useGetItems(id);  // GET /api/v1/purchase-items/by-order/:id
const { data: products }  = Products.useList();
const { data: suppliers } = Suppliers.useList();
const { data: locations } = Locations.useList();
const updateMutation = PurchaseOrders.useUpdate();
```

Name resolution uses Maps / `.find()` against the flat lists — no per-item queries.

### 5b. Status helpers
```typescript
function canVerify(status?: PurchaseOrderStatus): boolean {
  return status === 'draft' || status === 'ordered' || status === 'partially_received';
}
function canMarkOrdered(status?: PurchaseOrderStatus): boolean {
  return status === 'draft';
}
const showActions = canVerify(po.status) || canMarkOrdered(po.status);
```

### 5c. Actions dropdown logic
```tsx
{showActions && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
        Actions <ChevronDown size={14} />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {canMarkOrdered(po.status) && (
        <DropdownMenuItem
          onSelect={() => updateMutation.mutate({ id: po.id, body: { status: 'ordered' } as Partial<PurchaseOrder> })}
          disabled={updateMutation.isPending}
        >
          <ShoppingCart size={14} /> Mark as Ordered
        </DropdownMenuItem>
      )}
      {canMarkOrdered(po.status) && canVerify(po.status) && <DropdownMenuSeparator />}
      {canVerify(po.status) && (
        <DropdownMenuItem onSelect={() => navigate(`/purchase-orders/${po.id}/receive`)}>
          <ClipboardCheck size={14} /> Verify Receipt
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

When status is `draft`: both items appear with separator.
When status is `ordered` or `partially_received`: only "Verify Receipt" appears.
When status is `received` or `cancelled`: Actions button is hidden entirely.

### 5d. Per-item progress bar
```tsx
function ItemProgress({ pct, fullyReceived, hasAny }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          fullyReceived ? 'bg-emerald-500' : hasAny ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
// pct = Math.min(100, Math.round((received / ordered) * 100))
// fullyReceived = ordered > 0 && received >= ordered
// hasAny = received > 0
```

### 5e. Status banners
```tsx
{po.status === 'received' && (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50
                  dark:bg-emerald-950/30 px-4 py-4 flex items-center gap-3">
    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
    ...
  </div>
)}
{po.status === 'cancelled' && (
  <div className="rounded-xl border border-red-200 bg-red-50 ...">
    <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
    ...
  </div>
)}
```

---

## 6. Purchase Order Receive Page (`renderer/src/pages/PurchaseOrderReceive.tsx`)

New page at route `/purchase-orders/:id/receive`.

### 6a. Guard screen
If `!canVerify(po.status)` (i.e. `received` or `cancelled`), renders a "No further
action needed" screen with a `CheckCircle2` icon instead of the receive form:
```tsx
if (!canVerify(po.status)) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-14 text-center ...">
      <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
      <p>No further action needed</p>
      <p>This purchase order is <span>{po.status}</span> and cannot be modified.</p>
      <button onClick={() => navigate(`/purchase-orders/${id}`)}>View Details</button>
    </div>
  );
}
```

### 6b. Receive quantities — pre-fill logic
Each row pre-fills "Receive Now" with the remaining quantity (ordered − received).
The user can adjust down to 0. Fully-received rows are dimmed (`opacity-40`) and
show a "Done" checkmark instead of an input.

```typescript
const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

const getReceiveQty = (itemId: string, remaining: number) =>
  itemId in receiveQtys ? receiveQtys[itemId] : remaining;
```

`receiveQtys` starts empty, so the default is always the remaining qty. Once the
user edits an input, the item's id enters `receiveQtys` and subsequent renders
use the stored value.

### 6c. Submit — receive mutation
```typescript
const receiveMutation = PurchaseOrders.useReceive();
// POST /api/v1/purchase-orders/:id/receive

receiveMutation.mutate({
  id,
  body: {
    locationId: po.locationId,
    items: items
      .map((item) => ({
        purchaseItemId: item.id,
        quantityReceived: getReceiveQty(item.id, remaining),
      }))
      .filter((i) => i.quantityReceived > 0),
    notes: notes.trim() || undefined,
  },
}, { onSuccess: () => navigate(`/purchase-orders/${id}`) });
```

---

## 7. App.tsx Routes Added
```typescript
const PurchaseOrderDetail  = lazy(() => import('./pages/PurchaseOrderDetail'));
const PurchaseOrderReceive = lazy(() => import('./pages/PurchaseOrderReceive'));

// Inside the ProtectedRoute layout:
<Route path="purchase-orders/:id"         element={<PurchaseOrderDetail />} />
<Route path="purchase-orders/:id/receive" element={<PurchaseOrderReceive />} />
```

---

## 8. Bugs Encountered and Fixed

### Bug 1: `StoreIcon is not defined` runtime crash
**Symptom:** App crashed at POSTerminal line 1166 with `ReferenceError: StoreIcon is not defined`.

**Root cause:** `Store as StoreIcon` was removed from imports, but a reference
remained in the bill summary panel block far below where the import was.

**Fix:** Replaced `<StoreIcon size={12} />` with `<Package size={12} />` and
`store?.name` with `stockLocation?.name` in the same block.

**Lesson:** When removing an import, search the entire file for all usage sites —
IDEs may not highlight runtime-only references in JSX expressions.

### Bug 2: "Verify Receipt" never appeared in table row actions
**Symptom:** The 3-dot menu showed "View" and "Delete" but never "Verify Receipt",
even for Draft purchase orders.

**Root cause:** `row.status === 'Draft'` was compared against the API value `'draft'`.
The backend enum uses lowercase (`EPurchaseOrderStatus.Draft = 'draft'`), but the
frontend type declared `'Draft'`. String comparison fails silently — TypeScript
did not flag it because `'Draft'` was a valid member of the (wrong) type.

**Fix:** Changed `PurchaseOrderStatus` type and all downstream comparisons to
match the backend values (`'draft'`, `'ordered'`, `'partially_received'`, etc.).

### Bug 3: Status badge colours not applying
**Same root cause as Bug 2.** `STATUS_STYLES['Draft']` was `undefined` because
the record key `'Draft'` never matched the API value `'draft'`, so the fallback
class `bg-muted text-foreground` always rendered.

---

## 9. Key Patterns for Future Reference

### Adding a status transition action
1. Use `PurchaseOrders.useUpdate()` (available from `purchaseOrdersBase` spread)
2. Call `mutate({ id, body: { status: 'new_status' } as Partial<PurchaseOrder> })`
3. The backend `UpdatePurchaseOrderRequest` accepts `status?: EPurchaseOrderStatus`
4. Gate the action with a helper like `canMarkOrdered(status)` to prevent invalid transitions

### PurchaseOrders API surface
| Hook | Method | Endpoint |
|---|---|---|
| `PurchaseOrders.useList()` | GET | `/api/v1/purchase-orders/list` |
| `PurchaseOrders.useSearch()` | GET | `/api/v1/purchase-orders?$page=...` |
| `PurchaseOrders.useGet(id)` | GET | `/api/v1/purchase-orders/:id` |
| `PurchaseOrders.useUpdate()` | PUT | `/api/v1/purchase-orders/:id` |
| `PurchaseOrders.useDelete()` | DELETE | `/api/v1/purchase-orders/:id` |
| `PurchaseOrders.useGetItems(id)` | GET | `/api/v1/purchase-items/by-order/:id` |
| `PurchaseOrders.useReceive()` | POST | `/api/v1/purchase-orders/:id/receive` |

### Status flow
```
draft → ordered → partially_received ⟶ received
         ↓                ↓
      cancelled        cancelled
```
- `draft`: can "Mark as Ordered" or "Verify Receipt"
- `ordered`: can "Verify Receipt" (triggers partial or full receive)
- `partially_received`: can "Verify Receipt" again
- `received` / `cancelled`: no further actions — Actions button hidden

### Decimal columns from PostgreSQL
`totalAmount`, `unitCost`, `totalCost`, `quantityOrdered`, `quantityReceived`
are TypeORM decimal columns. At runtime the API returns them as **strings**, not
numbers. Always coerce: `Number(item.quantityOrdered ?? 0)`.

### Radix DropdownMenu for select-style pickers
Use `DropdownMenuRadioGroup` + `DropdownMenuRadioItem` (not `DropdownMenuItem`)
when the user picks one value from a list. The `value`/`onValueChange` API mirrors
a controlled input.

---

## 10. File Index

### `ERP-Client` (frontend — all files in `renderer/src/`)
```
types.ts                          ← PurchaseOrderStatus type fixed (lowercase)
App.tsx                           ← Added lazy routes for detail + receive pages
pages/pos/POSTerminal.tsx         ← Store removed, Radix dropdowns, read-only bill qty
pages/pos/checkout.ts             ← locationId required, storeId removed
pages/PurchaseOrders.tsx          ← STATUS keys fixed, STATUS_LABELS added,
                                     Mark as Ordered + Verify Receipt row actions
pages/PurchaseOrderDetail.tsx     ← NEW: full detail page
pages/PurchaseOrderReceive.tsx    ← NEW: receipt verification page
pages/CreatePurchaseOrder.tsx     ← DELETED (orphaned, never routed or imported)
```
