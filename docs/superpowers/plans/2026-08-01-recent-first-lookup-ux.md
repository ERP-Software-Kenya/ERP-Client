# Recent-First Lookup UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make get-by-id pages lead with browser-local Recent lists (human labels) and demote UUID paste to Advanced; use name pickers / Recent for form FKs when possible; close leftover polish from the prior UX plan without Core API changes.

**Architecture:** Extend `useRecentIds` / `RECENT_NS` and extract a small shared Recent + Advanced-ID UI from Stock Transfers. Apply Wave 1 (Orders, Invoices, Purchase Items, Stock Transfers, Unpublished Stock), then Wave 2 (other get-by-id pages), then a leftover-polish sweep. No new npm dependencies. No fake directories.

**Tech Stack:** React 19, TanStack Query (`useQueries`), existing `FormSection` / `SimpleTable` / `ResourceSelect` / `formatEntityLabel` / `useRecentIds`, Tailwind + shadcn Button/Input, Sonner toasts.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-recent-first-lookup-ux-design.md`
- ERP-Client `renderer` only — no Core API schema / list / search endpoints
- Recent is browser-local (`localStorage`); say so once per page empty state or section subtitle
- Form FK rule: list/search picker → else Recent for that type → else honest API-gap note — never invent a directory
- UUID load may remain as secondary “Advanced: load by ID”; detail may still show full ID + Copy
- No test runner in repo — verify with `npx tsc -p renderer/tsconfig.json --noEmit` + manual UI steps
- Do not commit unless the user explicitly asks (skip every Commit step until asked)
- Do not stage unrelated dirty WIP (e.g. billing) — never `git add -A`

---

## File map

| Path | Responsibility |
|------|----------------|
| `renderer/src/lib/recentIds.ts` | Expand `RECENT_NS` keys for all touched get-by-id modules |
| `renderer/src/components/RecentRecords.tsx` | Shared Recent section (empty state, table slot, Clear) |
| `renderer/src/components/AdvancedIdLookup.tsx` | Collapsed secondary UUID load control |
| `renderer/src/components/RecentIdPicker.tsx` | Form helper: pick from a Recent namespace (chips/buttons) when no list API |
| `renderer/src/pages/StockTransfers.tsx` | Refactor to shared components; demote UUID |
| `renderer/src/pages/UnpublishedStock.tsx` | Recent-first; demote Paste UUID step |
| `renderer/src/pages/Orders.tsx` | Recent + Advanced; push on create/load |
| `renderer/src/pages/Invoices.tsx` | Recent + Advanced; order FK via Recent orders / gap |
| `renderer/src/pages/PurchaseItems.tsx` | Recent + Advanced; product labels via Products list |
| `renderer/src/pages/Expenses.tsx` | Recent + Advanced; keep org/store ResourceSelect |
| `renderer/src/pages/Users.tsx` | Recent + Advanced; role FK via Recent roles / gap |
| `renderer/src/pages/Roles.tsx` | Recent + Advanced |
| `renderer/src/pages/UserRoles.tsx` | Recent + Advanced; user/role FKs via Recent pickers / gap |
| `renderer/src/pages/ProductLogs.tsx` | Recent + Advanced where get-by-id; soften UUID copy |
| `renderer/src/pages/PlatformConfigurations.tsx` | Recent + Advanced |
| `renderer/src/pages/ActivityLogs.tsx` / `AuditLog.tsx` | Recent + Advanced |
| `renderer/src/pages/ItemReturns.tsx` | Order FK → Recent orders picker / gap (not bare UUID hero) |

---

### Task 1: Shared Recent primitives

**Files:**
- Modify: `renderer/src/lib/recentIds.ts`
- Create: `renderer/src/components/RecentRecords.tsx`
- Create: `renderer/src/components/AdvancedIdLookup.tsx`
- Create: `renderer/src/components/RecentIdPicker.tsx`

**Interfaces:**
- Consumes: `SimpleColumn` / `SimpleTable` from `../components/SimpleTable`; `FormSection` from `../components/FormDrawer`; `Button`, `Input`; `useRecentIds` / `RecentIdEntry` from `../lib/recentIds`
- Produces:
  - `RECENT_NS` keys: existing plus `orders`, `invoices`, `purchaseItems`, `expenses`, `users`, `roles`, `userRoles`, `productLogs`, `platformConfigurations`, `activityLogs`
  - `RecentRecords<T>({ title?, subtitle?, emptyHint, rows, columns, rowKey, onClear })`
  - `AdvancedIdLookup({ entityLabel, value, onChange, onLoad, hint? })`
  - `RecentIdPicker({ namespace, value, onSelect, emptyHint })` — lists `useRecentIds(namespace).entries` as selectable buttons; selected id stored in parent form state

- [ ] **Step 1: Expand `RECENT_NS`**

In `renderer/src/lib/recentIds.ts`, replace the `RECENT_NS` export with:

```ts
export const RECENT_NS = {
  stockTransfers: 'stock-transfers',
  unpublishedStock: 'unpublished-stock',
  stockMovementsInventory: 'stock-movements-inventory',
  orders: 'orders',
  invoices: 'invoices',
  purchaseItems: 'purchase-items',
  expenses: 'expenses',
  users: 'users',
  roles: 'roles',
  userRoles: 'user-roles',
  productLogs: 'product-logs',
  platformConfigurations: 'platform-configurations',
  activityLogs: 'activity-logs',
} as const;
```

Do not change `pushRecentId` / `useRecentIds` behavior.

- [ ] **Step 2: Add `RecentRecords.tsx`**

```tsx
import { FormSection } from './FormDrawer';
import { SimpleTable, type SimpleColumn } from './SimpleTable';
import { Button } from './ui/button';

export interface RecentRecordsProps<T> {
  title?: string;
  subtitle?: string;
  emptyHint: string;
  rows: T[];
  columns: SimpleColumn<T>[];
  rowKey: (row: T) => string;
  onClear: () => void;
}

export function RecentRecords<T>({
  title = 'Recent',
  subtitle = 'Saved in this browser only.',
  emptyHint,
  rows,
  columns,
  rowKey,
  onClear,
}: RecentRecordsProps<T>) {
  return (
    <FormSection title={title}>
      {subtitle ? <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <>
          <SimpleTable columns={columns} rows={rows} rowKey={rowKey} />
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onClear}>
            Clear recent list
          </Button>
        </>
      )}
    </FormSection>
  );
}
```

- [ ] **Step 3: Add `AdvancedIdLookup.tsx`**

Use the same toggle pattern as `ProductImageUploader` advanced section (button + conditional body). No new deps.

```tsx
import { useState } from 'react';
import { FormSection } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';

export interface AdvancedIdLookupProps {
  entityLabel: string;
  value: string;
  onChange: (value: string) => void;
  onLoad: () => void;
  hint?: string;
}

export function AdvancedIdLookup({
  entityLabel,
  value,
  onChange,
  onLoad,
  hint,
}: AdvancedIdLookupProps) {
  const [open, setOpen] = useState(false);
  return (
    <FormSection title="Advanced">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} load by ID
      </Button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            {hint ?? `No ${entityLabel} directory from the API — paste an ID only if you already have one.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-md flex-1"
              placeholder={`${entityLabel} ID`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <Button type="button" onClick={onLoad}>
              Load
            </Button>
          </div>
        </div>
      ) : null}
    </FormSection>
  );
}
```

Placeholder text must say “ID”, not “UUID”, so the control stays secondary and less jarring.

- [ ] **Step 4: Add `RecentIdPicker.tsx`**

```tsx
import { useRecentIds } from '../lib/recentIds';
import { Button } from './ui/button';

export interface RecentIdPickerProps {
  namespace: string;
  value: string;
  onSelect: (id: string, label?: string) => void;
  emptyHint: string;
}

export function RecentIdPicker({ namespace, value, onSelect, emptyHint }: RecentIdPickerProps) {
  const { entries } = useRecentIds(namespace);
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyHint}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entries.slice(0, 12).map((e) => (
        <Button
          key={e.id}
          type="button"
          size="sm"
          variant={value === e.id ? 'default' : 'outline'}
          onClick={() => onSelect(e.id, e.label)}
        >
          {e.label?.trim() || e.id.slice(0, 8)}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Expected: no errors in the new files (pre-existing SidebarNav-only errors may remain — do not “fix” unrelated files).

- [ ] **Step 6: Commit** (skip unless user asked)

```bash
git add renderer/src/lib/recentIds.ts \
  renderer/src/components/RecentRecords.tsx \
  renderer/src/components/AdvancedIdLookup.tsx \
  renderer/src/components/RecentIdPicker.tsx
git commit -m "$(cat <<'EOF'
Add shared Recent list, Advanced ID lookup, and Recent FK picker.

EOF
)"
```

---

### Task 2: Stock Transfers + Unpublished Stock — demote UUID

**Files:**
- Modify: `renderer/src/pages/StockTransfers.tsx`
- Modify: `renderer/src/pages/UnpublishedStock.tsx`

**Interfaces:**
- Consumes: `RecentRecords`, `AdvancedIdLookup`, existing `RECENT_NS.stockTransfers` / `unpublishedStock`, `useQueries` hydrate pattern already on these pages
- Produces: Same behavior; UUID section is Advanced; wizard step copy no longer leads with “Paste UUID”

- [ ] **Step 1: Refactor Stock Transfers Recent + lookup**

Replace the inline `FormSection title="Recent transfers"` + `FormSection title="Lookup by ID"` blocks with:

1. `RecentRecords` using existing `listRows` / columns (Open calls `loadById`, Remove calls `recent.remove`).
2. `AdvancedIdLookup` bound to `lookupId` / `loadById(lookupId)`.
3. Empty hint: `No recent transfers yet. Create one or use Advanced load by ID — it will appear here.`
4. Keep `recent.push` on create/load; prefer label `created.transferNumber`.

- [ ] **Step 2: Refactor Unpublished Stock**

1. Keep Recent table via `RecentRecords` (or wrap existing table).
2. Change stepper label from `Paste UUID` → `Load record` (or similar non-UUID wording).
3. Replace hero “2. Paste UUID to continue” / duplicate “Lookup by ID” with one `AdvancedIdLookup` (or keep publish flow fields but title them without “UUID”).
4. Empty / help copy must not instruct UUID as the only path when Recent exists.

- [ ] **Step 3: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: open Stock Transfers — Recent first, Advanced collapsed; create/load still populates Recent. Unpublished Stock — same.

- [ ] **Step 4: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/StockTransfers.tsx renderer/src/pages/UnpublishedStock.tsx
git commit -m "$(cat <<'EOF'
Demote UUID lookup on stock transfers and unpublished stock.

EOF
)"
```

---

### Task 3: Sales Orders — Recent-first

**Files:**
- Modify: `renderer/src/pages/Orders.tsx`

**Interfaces:**
- Consumes: `RECENT_NS.orders`, `useRecentIds`, `RecentRecords`, `AdvancedIdLookup`, `Orders.useGet`, `get` from `../api`, `useQueries`, existing customer search / store ResourceSelect
- Produces: Recent primary; push on create/load with label from `orderNumber` or customer label

- [ ] **Step 1: Wire Recent state**

```ts
const recent = useRecentIds(RECENT_NS.orders);
```

On successful create and on `loadOrder`, call:

```ts
recent.push(
  id,
  created.orderNumber /* or lookedUp.orderNumber */
    ?? customerLabelFor(customerId)
    ?? undefined,
);
```

Use the best label available at that moment (order number preferred).

- [ ] **Step 2: Hydrate Recent rows (optional but preferred)**

Mirror Stock Transfers:

```ts
const recentQueries = useQueries({
  queries: recent.entries.map((e) => ({
    queryKey: ['orders', e.id] as const,
    queryFn: () => get<Order>(`/api/v1/orders/${e.id}`),
    staleTime: 60_000,
    retry: false,
  })),
});
```

Build `listRows` with `orderNumber`, `status`, `paymentStatus`, `savedAt`, `loading`, `failed`. Columns: Number / Status / Payment / Saved / actions (Open, Remove).

- [ ] **Step 3: Swap page chrome**

1. Update page subtitle: create + Recent in this browser; no order directory from API.
2. Replace `FormSection title="Lookup by ID"` with `RecentRecords` + `AdvancedIdLookup`.
3. Remove or soften the “API gap: … UUID lookup only” line so it does not imply UUID is the main UX.
4. Keep store ResourceSelect + customer typeahead in the create drawer.

- [ ] **Step 4: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: create order → appears in Recent with order # when present; Open reloads; Advanced still loads by ID.

- [ ] **Step 5: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/Orders.tsx
git commit -m "$(cat <<'EOF'
Add Recent-first browsing on sales orders.

EOF
)"
```

---

### Task 4: Invoices — Recent + order FK

**Files:**
- Modify: `renderer/src/pages/Invoices.tsx`

**Interfaces:**
- Consumes: `RECENT_NS.invoices`, `RECENT_NS.orders`, `RecentRecords`, `AdvancedIdLookup`, `RecentIdPicker`, `Invoices` hooks, `get` / `useQueries`
- Produces: Recent invoices; create form order field uses `RecentIdPicker` for orders + gap note (no fake order directory)

- [ ] **Step 1: Recent invoices**

Same pattern as Orders: `useRecentIds(RECENT_NS.invoices)`, push on create/load with label `invoiceNumber` (fallback status/amount), `RecentRecords` + `AdvancedIdLookup`, hydrate via `get<Invoice>(\`/api/v1/invoices/${id}\`)`.

- [ ] **Step 2: Replace Order ID paste in create drawer**

```tsx
<Field label="Order" required>
  <RecentIdPicker
    namespace={RECENT_NS.orders}
    value={form.orderId}
    onSelect={(id) => setForm({ ...form, orderId: id })}
    emptyHint="No recent orders in this browser. Create or open a Sales Order first — there is no order directory API."
  />
  {/* Keep a single optional Advanced text input only if needed for support; prefer picker-only when Recent has entries */}
</Field>
```

If Recent orders is empty, show the gap note and a secondary “Paste order ID” input (not labeled UUID) so create is not completely blocked — but it must not be the hero control when Recent has entries.

- [ ] **Step 3: Detail labels**

In invoice detail, show order as truncated/fallback via `formatEntityLabel({ id: lookedUp.orderId })` unless a Recent orders label map exists; do not leave a raw unlabeled UUID as the only cue without Copy.

- [ ] **Step 4: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: with a Recent order, create invoice by picking it; invoice appears under Recent.

- [ ] **Step 5: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/Invoices.tsx
git commit -m "$(cat <<'EOF'
Add Recent invoices and order Recent picker on create.

EOF
)"
```

---

### Task 5: Purchase Items — Recent + product labels

**Files:**
- Modify: `renderer/src/pages/PurchaseItems.tsx`

**Interfaces:**
- Consumes: `RECENT_NS.purchaseItems`, `Products.useList`, `formatEntityLabel`, shared Recent/Advanced components
- Produces: Recent list with product name when resolvable; create stays disabled/blocked if Core still blocked

- [ ] **Step 1: Wire Recent + Advanced**

Replace “Look up purchase item” UUID hero with `RecentRecords` + `AdvancedIdLookup`. Push on successful load (and create if ever unblocked) with label from product name + qty when known.

- [ ] **Step 2: Resolve product names**

```ts
const { data: products } = Products.useList();
const productName = useMemo(() => {
  const m = new Map<string, string>();
  for (const p of products ?? []) {
    m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
  }
  return m;
}, [products]);
```

Detail + Recent columns: Product (mapped), Qty, PO id via `formatEntityLabel` fallback — not raw UUID as the only column.

- [ ] **Step 3: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: Advanced load → row in Recent; product name shows when Products list has it.

- [ ] **Step 4: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/PurchaseItems.tsx
git commit -m "$(cat <<'EOF'
Add Recent-first purchase items with product labels.

EOF
)"
```

---

### Task 6: Expenses — Recent-first

**Files:**
- Modify: `renderer/src/pages/Expenses.tsx`

**Interfaces:**
- Consumes: `RECENT_NS.expenses`, shared Recent/Advanced; existing org/store `ResourceSelect` in drawer
- Produces: Recent by category/amount/date label; UUID demoted

- [ ] **Step 1: Implement Recent pattern**

Push label like `` `${category} · ${amount}` `` or description snippet on create/load. `RecentRecords` columns: Category / Amount / Date / actions. `AdvancedIdLookup` for secondary load. Keep ResourceSelect for organization/store on create.

- [ ] **Step 2: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: create expense → Recent; Open works.

- [ ] **Step 3: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/Expenses.tsx
git commit -m "$(cat <<'EOF'
Add Recent-first expenses browsing.

EOF
)"
```

---

### Task 7: Users, Roles, UserRoles — Recent + FK pickers

**Files:**
- Modify: `renderer/src/pages/Users.tsx`
- Modify: `renderer/src/pages/Roles.tsx`
- Modify: `renderer/src/pages/UserRoles.tsx`

**Interfaces:**
- Consumes: `RECENT_NS.users` / `roles` / `userRoles`, `RecentIdPicker`, shared Recent/Advanced
- Produces: Recent on all three; UserRoles create uses Recent pickers for userId/roleId with gap notes (no fake user/role directories)

- [ ] **Step 1: Users page**

Recent with label from email/name when present. Advanced ID secondary. On create, `recent.push(created.id, created.email ?? created.name)`. If invite form still has Role ID paste, switch to `RecentIdPicker` namespace `RECENT_NS.roles` + gap note when empty (secondary paste allowed).

- [ ] **Step 2: Roles page**

Recent with label `name` (enum role name). Advanced secondary. Push on create/load.

- [ ] **Step 3: UserRoles page**

1. Recent assignments (label can be short id slice until hydrated).
2. Create drawer: `RecentIdPicker` for User (`RECENT_NS.users`) and Role (`RECENT_NS.roles`) with empty hints pointing users to create/open those pages first.
3. Secondary paste inputs only when needed, not labeled as the primary path.
4. Detail: prefer showing Recent labels for user/role ids when entries exist.

- [ ] **Step 4: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: create role → Recent; create user with role picker; assign via UserRoles Recent pickers.

- [ ] **Step 5: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/Users.tsx renderer/src/pages/Roles.tsx renderer/src/pages/UserRoles.tsx
git commit -m "$(cat <<'EOF'
Add Recent browsing and Recent FK pickers for users and roles.

EOF
)"
```

---

### Task 8: Wave 2 get-by-id pages + ItemReturns order FK

**Files:**
- Modify: `renderer/src/pages/ProductLogs.tsx`
- Modify: `renderer/src/pages/PlatformConfigurations.tsx`
- Modify: `renderer/src/pages/ActivityLogs.tsx`
- Modify: `renderer/src/pages/AuditLog.tsx` (if still a separate UUID lookup page)
- Modify: `renderer/src/pages/ItemReturns.tsx`

**Interfaces:**
- Consumes: matching `RECENT_NS.*`, shared Recent/Advanced/RecentIdPicker
- Produces: Same Recent-first pattern; ItemReturns sales-return `orderId` uses Recent orders picker

- [ ] **Step 1: PlatformConfigurations + ActivityLogs + AuditLog**

Apply Recent + Advanced. Push meaningful labels when available (`key`/name for config; `action` + date for activity). Soften page copy that says UUID is the only browse path.

- [ ] **Step 2: ProductLogs**

Where single-log get-by-id exists, add Recent + Advanced. Prefer inventory/product names via existing maps/`formatEntityLabel` over `truncateId` as the primary readable column when a name map exists. Keep truncate as fallback only.

- [ ] **Step 3: ItemReturns order field**

Replace placeholder `Lookup by ID — paste order UUID` with:

```tsx
<Field label="Order">
  <RecentIdPicker
    namespace={RECENT_NS.orders}
    value={form.orderId}
    onSelect={(id) => setForm({ ...form, orderId: id })}
    emptyHint="No recent sales orders. Open Sales Orders first — no order directory API."
  />
</Field>
```

Keep a secondary ID input only if returns must work without Recent; do not title it UUID.

- [ ] **Step 4: Typecheck + manual**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Manual: ActivityLogs Recent; ItemReturns can pick a Recent order.

- [ ] **Step 5: Commit** (skip unless user asked)

```bash
git add renderer/src/pages/ProductLogs.tsx \
  renderer/src/pages/PlatformConfigurations.tsx \
  renderer/src/pages/ActivityLogs.tsx \
  renderer/src/pages/AuditLog.tsx \
  renderer/src/pages/ItemReturns.tsx
git commit -m "$(cat <<'EOF'
Extend Recent-first lookup to remaining get-by-id pages.

EOF
)"
```

---

### Task 9: Polish leftovers sweep

**Files:**
- Modify only pages/components that still show raw UUID as the **primary** user-facing label where an existing list/get map can resolve a name (spot-check from prior SDD minors: ItemReturns ViewDrawer fields, ProductLogs inventory label, any leftover “Paste UUID” copy)
- Do **not** rework POS layout, DataTable filters, `MoreVertical`, sidebar tooltips, or scrollbars unless clearly broken

**Interfaces:**
- Consumes: `formatEntityLabel`, existing `*useList` maps
- Produces: leftover list in task notes — fixed vs deferred-with-reason

- [ ] **Step 1: Grep for remaining UUID-hero UX**

Run:

```bash
rg -n "UUID|Lookup by ID|paste.*uuid|Paste UUID" renderer/src/pages --glob '*.tsx'
```

For each hit: either convert to Recent/Advanced/picker pattern, or leave with an explicit comment/gap note if API-forced and already Advanced.

- [ ] **Step 2: Fix primary-label leftovers**

Where a related entity list is already loaded on the page, replace primary display of raw/`truncateId` FK with `formatEntityLabel` / name map. Keep ID + Copy as secondary on detail only.

- [ ] **Step 3: Document deferred**

Append a short “Deferred” bullet list to the end of this plan file or the SDD progress note: anything that still needs Core list/search.

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`

- [ ] **Step 5: Commit** (skip unless user asked)

```bash
git add renderer/src/pages
git commit -m "$(cat <<'EOF'
Close leftover UUID-primary labels where maps already exist.

EOF
)"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`  
Expected: no new errors from this workstream.

- [ ] **Step 2: Manual checklist**

- [ ] Sales Orders — Recent first; Advanced collapsed; create populates Recent with order # when present  
- [ ] Invoices — Recent; create picks Recent order when available  
- [ ] Purchase Items — Recent + product name when Products list has it  
- [ ] Stock Transfers / Unpublished Stock — UUID not the hero  
- [ ] Expenses / Users / Roles / UserRoles — Recent; UserRoles uses Recent FK pickers  
- [ ] ItemReturns — order field not “paste UUID” hero  
- [ ] Empty Recent states explain how to populate (create or Advanced)  
- [ ] No fake list/search invented for create-only resources  

- [ ] **Step 3: Handoff note**

List remaining API gaps (Orders/Invoices/Users/Roles directories, Unpublished Stock add-without-id, Purchase Items create column mismatch) for a future Core pass.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Client-only / no Core list endpoints | Global Constraints + all tasks |
| Recent primary find UX | Tasks 2–8 |
| Form FK: picker → Recent → gap | Tasks 4, 7, 8 |
| Shared RecentRecords + NS expansion | Task 1 |
| Wave 1 named pages | Tasks 2–5 |
| Wave 2 pages | Tasks 6–8 |
| Soften Stock Transfers / Unpublished UUID | Task 2 |
| Polish leftovers only | Task 9 |
| Acceptance / verification | Task 10 |
| Non-goals (no fake dirs, no POS rebuild) | Global Constraints + Task 9 |

## Placeholder / consistency check

- Component names stable: `RecentRecords`, `AdvancedIdLookup`, `RecentIdPicker`, `RECENT_NS.*`
- Query keys for hydrate: `['orders', id]`, `['invoices', id]`, etc., matching resource queryKey strings in `api.ts` where applicable
- No TBD / “implement later” steps remain
