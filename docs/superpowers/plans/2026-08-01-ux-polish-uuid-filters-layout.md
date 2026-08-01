# UX Polish — UUID Labels, Filters, POS Layout, Chrome

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ERP-Client human-readable and consistent: edge-to-edge POS, names instead of raw UUIDs, honest API-backed filters, vertical row actions, styled collapsed-sidebar tooltips, and unified scrollbars.

**Architecture:** Ship shared primitives first (`formatEntityLabel`, DataTable filter slot, CSS tooltip, scrollbar class adoption, `MoreVertical`), then apply in waves A → B → C → D. Resolve FK labels via existing list hooks / id→name maps; never invent client-only filters on paginated data. No Core API changes.

**Tech Stack:** React 19, react-router-dom, TanStack Query, Tailwind + existing shadcn/Radix UI (`dialog`, `dropdown-menu`, `select`), lucide-react. Prefer **no new npm deps** (CSS tooltip instead of adding `@radix-ui/react-tooltip`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-ux-polish-uuid-filters-layout-design.md`
- ERP-Client `renderer` only — no Core API schema/join changes
- Delivery order: Wave A → B → C → D
- Filters only when the API accepts the param; no fake client-side page filtering
- UUID truncated fallback only when related name cannot be resolved
- Keep Topbar + Sidebar on POS (edge-to-edge content only)
- Do not commit unless the user explicitly asks
- No test runner in repo — verify with TypeScript check + manual UI steps below

---

## File map

| Path | Responsibility |
|------|----------------|
| `renderer/src/lib/entityLabel.ts` | `formatEntityLabel` + tiny helpers for name/sku/code → UUID fallback |
| `renderer/src/components/ui/tooltip.tsx` | Lightweight CSS/hover tooltip (no new dependency) |
| `renderer/src/components/DataTable.tsx` | Optional `toolbar` / `hideSearch` + `custom-scrollbar` on table scroll |
| `renderer/src/components/RowActionsMenu.tsx` | `MoreVertical` icon |
| `renderer/src/components/layout/AppLayout.tsx` | Route-aware padding (`/pos` → flush) + main scrollbar class |
| `renderer/src/components/layout/Sidebar.tsx` | Styled tooltips when collapsed |
| `renderer/src/components/FormDrawer.tsx` | `custom-scrollbar` on body |
| `renderer/src/components/ui/dialog.tsx` | `custom-scrollbar` on overflow |
| `renderer/src/components/ui/select.tsx` | `custom-scrollbar` on menu |
| `renderer/src/pages/pos/POSTerminal.tsx` | Remove outer card chrome; fill parent height |
| `renderer/src/pages/Bills.tsx` | Location filter + name labels; move status chips into DataTable toolbar |
| `renderer/src/pages/BillDetail.tsx` | Product/customer/location names |
| `renderer/src/pages/Inventory.tsx` | Ensure product/location names; type/location filters if API allows |
| `renderer/src/pages/Products.tsx` | Category names already partial — finish + category filter if API allows |
| `renderer/src/pages/Customers.tsx` | Keep name search; add status filter if API supports |
| `renderer/src/pages/Orders.tsx` / `PurchaseOrders.tsx` | Labels + honest filters / API-gap notes |
| Other UUID-heavy pages (listed in Task 5) | Replace display UUIDs with names via maps |
| `renderer/src/index.css` | Keep `.custom-scrollbar`; optional `scrollbar-width: thin` for Firefox |

---

### Task 1: Shared label helper + vertical actions + tooltip primitive

**Files:**
- Create: `renderer/src/lib/entityLabel.ts`
- Create: `renderer/src/components/ui/tooltip.tsx`
- Modify: `renderer/src/components/RowActionsMenu.tsx`

**Interfaces:**
- Consumes: `lucide-react` (`MoreVertical`), existing `Button` / dropdown menu
- Produces:
  - `export function formatEntityLabel(parts: { name?: string | null; sku?: string | null; code?: string | null; phone?: string | null; id?: string | null }, fallback?: string): string`
  - `export function truncateId(id: string, len?: number): string`
  - `export function Tooltip({ content, children, side?: 'right' | 'top' }: { content: string; children: React.ReactNode; side?: 'right' | 'top' }): JSX.Element`

- [ ] **Step 1: Add `entityLabel.ts`**

```ts
export function truncateId(id: string, len = 8): string {
  if (!id) return '—';
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}

export function formatEntityLabel(
  parts: {
    name?: string | null;
    sku?: string | null;
    code?: string | null;
    phone?: string | null;
    id?: string | null;
  },
  fallback = '—',
): string {
  const primary = parts.name?.trim() || parts.sku?.trim() || parts.code?.trim() || parts.phone?.trim();
  if (primary) return primary;
  if (parts.id) return truncateId(parts.id);
  return fallback;
}
```

- [ ] **Step 2: Add CSS tooltip (no new package)**

```tsx
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Tooltip({
  content,
  children,
  side = 'right',
}: {
  content: string;
  children: ReactNode;
  side?: 'right' | 'top';
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
        )}
      >
        {content}
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Switch row actions to vertical dots**

In `RowActionsMenu.tsx`, replace `MoreHorizontal` import/usage with `MoreVertical`.

- [ ] **Step 4: Verify**

Run from `ERP-Client`:

```bash
npx tsc --noEmit -p renderer 2>&1 | head -40
```

Expected: no new errors from these files. Manually open any DataTable → actions icon is `⋮`.

- [ ] **Step 5: Commit only if user asks** (skip otherwise)

---

### Task 2: Wave A — POS full-bleed layout

**Files:**
- Modify: `renderer/src/components/layout/AppLayout.tsx`
- Modify: `renderer/src/pages/pos/POSTerminal.tsx` (outer shell ~line 453)

**Interfaces:**
- Consumes: `useLocation` from `react-router-dom`
- Produces: `/pos` content flush to main pane; other routes keep `px-3 py-3`

- [ ] **Step 1: Route-aware padding in `AppLayout`**

```tsx
import { Outlet, useLocation } from 'react-router-dom';
// ...
const location = useLocation();
const isPos = location.pathname === '/pos' || location.pathname.endsWith('/pos');
// HashRouter may use paths without leading issues — match with:
// const isPos = /\/pos\/?$/.test(location.pathname);

<main className="flex-1 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
  <div className={isPos ? 'h-full w-full' : 'w-full px-3 py-3'}>
    <Outlet />
  </div>
</main>
```

- [ ] **Step 2: Remove POS outer card chrome**

Replace the outer wrapper classes on the POS root (currently similar to `flex flex-col h-[calc(100vh-5.5rem)] min-h-[520px] rounded-lg border border-border bg-muted overflow-hidden`) with:

```tsx
<div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted">
```

Keep internal panels, header bar, and dialogs unchanged.

- [ ] **Step 3: Manual verify**

- Navigate to POS: no side/top gutter inside main; no rounded outer border.
- Navigate to Customers: padding unchanged.
- Sidebar + Topbar still visible on POS.

- [ ] **Step 4: Commit only if user asks**

---

### Task 3: DataTable filter toolbar + scrollbar on table body

**Files:**
- Modify: `renderer/src/components/DataTable.tsx`

**Interfaces:**
- Consumes: existing props
- Produces: extended props:
  - `toolbar?: React.ReactNode` — rendered between title row and table (or beside search)
  - `hideSearch?: boolean` — omit search input when API has no text search
  - `onSearchChange` becomes optional when `hideSearch` is true

- [ ] **Step 1: Extend props**

```tsx
interface DataTableProps<T extends { id: string }> {
  // ...existing...
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  toolbar?: React.ReactNode;
}
```

- [ ] **Step 2: Render toolbar + conditional search**

In the header actions area:

```tsx
{!hideSearch && (
  <div className="relative">
    {/* existing Search + Input wired to onSearchChange! */}
  </div>
)}
```

Below the title/actions row (before the table):

```tsx
{toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
```

Add `custom-scrollbar` to the table scroll container:

```tsx
<div className="flex-1 overflow-auto rounded-lg border border-border bg-card custom-scrollbar">
```

- [ ] **Step 3: Fix call sites that pass no-op search**

Any page with `onSearchChange={() => {}}` and a “API has no text search” placeholder should switch to `hideSearch` and move real filters into `toolbar` (done in Task 4 for Bills).

- [ ] **Step 4: Verify** — `tsc` + open a list page; search still works where present.

- [ ] **Step 5: Commit only if user asks**

---

### Task 4: Wave C (priority) — Bills / Inventory / Products / Customers filters + names

**Files:**
- Modify: `renderer/src/pages/Bills.tsx`
- Modify: `renderer/src/pages/Inventory.tsx`
- Modify: `renderer/src/pages/Products.tsx`
- Modify: `renderer/src/pages/Customers.tsx`
- Modify: `renderer/src/pages/BillDetail.tsx` (names — overlaps Wave B)

**Interfaces:**
- Consumes: `formatEntityLabel`, `DataTable` `toolbar` / `hideSearch`, `Locations.useList`, `Customers.useSearch`, `Categories.useList`
- Bills API search filters (Core): `status`, `locationId`, `customerId`, `organizationId` — **no free-text search**

- [ ] **Step 1: Bills — honest filters + party/location labels**

1. Build location name map from `Locations.useList()`.
2. Optional location filter `<select>` + existing status chips → pass as `toolbar`; set `hideSearch`.
3. Wire `Bills.useSearch({ page, filters: { status?, locationId? } })` (omit empty keys); `setPage(1)` on change.
4. Replace `partyLabel` UUID slice with customer name from a small id→name map when possible (batch from loaded customer search / list if available; else walk-in name; else `Customer` + truncateId as last resort).
5. Location column / view fields: show location name via map.

Example filter object builder:

```ts
const filters: Record<string, string> = {};
if (statusFilter !== 'ALL') filters.status = statusFilter;
if (locationFilter) filters.locationId = locationFilter;
```

- [ ] **Step 2: Inventory — labels + filters**

- Keep product/location name maps; use `formatEntityLabel` instead of raw `slice`.
- If Inventory search API accepts `locationId` or similar (check `createResource` / Core inventory search request), add a location select in `toolbar` and reset page. If not supported, do **not** add a fake filter — leave search-only.

- [ ] **Step 3: Products — category filter if supported**

- Confirm category names use `formatEntityLabel`.
- If products search accepts `categoryId`, add category `ResourceSelect` / select in toolbar. Else search-only.

- [ ] **Step 4: Customers**

- Keep name search.
- If customers search/list accepts `status` (or equivalent), add status chips in toolbar; else leave search-only.

- [ ] **Step 5: BillDetail names**

- Location: already partially mapped — ensure name via `Locations.useList`.
- Customer: resolve via `Customers.useGet(bill.customerId)` when present, or walk-in fields.
- Line items: map `productId` → product name/sku via `Products.useList` or search; display `formatEntityLabel`, not UUID.

- [ ] **Step 6: Manual verify**

- Bills: status + location filters refetch; no fake text search.
- Bill detail: product names on lines.
- Inventory/Products/Customers: no truncated UUID in primary columns when names load.

- [ ] **Step 7: Commit only if user asks**

---

### Task 5: Wave B — remaining UUID display cleanup

**Files (modify each to use `formatEntityLabel` + list maps; keep get-by-id UUID lookup where no list API):**
- `renderer/src/pages/pos/POSTerminal.tsx` — customer linked label; product suggestion fallback
- `renderer/src/pages/StockTransfers.tsx` — org/store/product/location display
- `renderer/src/pages/StockMovements.tsx` — product/location labels
- `renderer/src/pages/ProductLogs.tsx` — product/inventory labels
- `renderer/src/pages/UnpublishedStock.tsx` — product/location labels
- `renderer/src/pages/ItemReturns.tsx` — id column may stay short id for return identity; resolve store/supplier/product labels in forms
- `renderer/src/pages/Categories.tsx` — parent name (already partial)
- `renderer/src/pages/InventoryDetail.tsx` — location name
- `renderer/src/pages/dashboards/InventoryDashboard.tsx` — product/location names
- `renderer/src/pages/PurchaseOrders.tsx` — prefer business number/status over raw id if available
- `renderer/src/pages/Orders.tsx` — form already uses ResourceSelect for store; customer should be ResourceSelect/Customers if list exists; **keep UUID lookup** if Orders remain create+get-only for directory (document as API gap)

**API gaps to leave + comment in UI (one-line muted note):**
- Users / Roles / UserRoles — no list directory
- Orders (if still get-by-id only for browsing)
- Bills — no free-text search

- [ ] **Step 1: For each file above, replace user-visible `id.slice(0, 8)` in labels/columns with `formatEntityLabel` + maps**

Pattern:

```ts
const { data: products = [] } = Products.useList();
const productName = useMemo(() => {
  const m = new Map<string, string>();
  for (const p of products) m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
  return m;
}, [products]);

// column render:
render: (row) => productName.get(row.productId) ?? formatEntityLabel({ id: row.productId }),
```

- [ ] **Step 2: Do not remove legitimate UUID lookup inputs** on create-only modules; ensure labels say “Lookup by ID” clearly.

- [ ] **Step 3: Spot-check** Stock Transfers view drawer, Product Logs, Unpublished Stock — names visible.

- [ ] **Step 4: Commit only if user asks**

---

### Task 6: Wave C (remainder) — Orders / POs / other list pages

**Files:**
- Modify: `renderer/src/pages/PurchaseOrders.tsx`
- Modify: `renderer/src/pages/Orders.tsx` (only if list/search exists; else skip toolbar)
- Modify: other DataTable pages that have enum/status fields already supported by API (e.g. Locations type already filtered by route; Suppliers/Stores status if API supports)

- [ ] **Step 1: PurchaseOrders** — if search supports status (or similar), add toolbar chips; else keep search. Prefer displaying PO number / supplier name over truncated id.

- [ ] **Step 2: Scan remaining `DataTable` pages** — add toolbar filters only when `filters` keys match backend. Prefer reading the module’s Core `Search*Request` or existing `filters:` usages in the page.

- [ ] **Step 3: Verify** each new filter changes network query params and resets to page 1.

- [ ] **Step 4: Commit only if user asks**

---

### Task 7: Wave D — sidebar tooltips + global scrollbars

**Files:**
- Modify: `renderer/src/components/layout/Sidebar.tsx`
- Modify: `renderer/src/components/FormDrawer.tsx`
- Modify: `renderer/src/components/ui/dialog.tsx`
- Modify: `renderer/src/components/ui/select.tsx`
- Modify: `renderer/src/index.css` (Firefox thin scrollbar companion if missing)
- Confirm: `AppLayout` main already has `custom-scrollbar` from Task 2

**Interfaces:**
- Consumes: `Tooltip` from `../ui/tooltip` (path adjust from layout)

- [ ] **Step 1: Collapsed sidebar tooltips**

When `collapsed`, wrap each `NavLink` / disabled item icon in:

```tsx
<Tooltip content={item.disabled ? `${item.title} (coming soon)` : item.title} side="right">
  {/* NavLink / div — remove native title= to avoid double tooltip */}
</Tooltip>
```

Only when `collapsed`; when expanded, render as today without Tooltip.

- [ ] **Step 2: Apply `custom-scrollbar`**

- FormDrawer body: `flex-1 overflow-y-auto px-4 py-4 custom-scrollbar`
- Dialog content overflow class: append `custom-scrollbar`
- Select content: append `custom-scrollbar`

- [ ] **Step 3: Optional Firefox support in `index.css`**

```css
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
```

Keep existing webkit rules.

- [ ] **Step 4: Manual verify**

- Collapse sidebar → hover icons → styled tooltip (not only browser title).
- Scroll main, open a FormDrawer with long form, open a Select — thin styled scrollbars.

- [ ] **Step 5: Commit only if user asks**

---

### Task 8: Final verification pass

- [ ] **Step 1: Typecheck**

```bash
cd /home/hitarth/ERP/ERP-Client && npx tsc --noEmit -p renderer
```

Expected: clean (or only pre-existing unrelated errors — note them).

- [ ] **Step 2: Checklist against spec**

| Spec item | Pass? |
|-----------|-------|
| POS edge-to-edge, chrome kept | |
| UUID → names on priority + remaining pages | |
| API gaps documented in UI or PR notes | |
| Filters honest + page reset | |
| Vertical `⋮` | |
| Collapsed sidebar styled tooltip | |
| custom-scrollbar on main surfaces | |

- [ ] **Step 3: List remaining API gaps** in the PR/summary (Users, Roles, UserRoles, Bills text search, any Orders directory gap).

- [ ] **Step 4: Stop — ask user before commit/push

---

## Spec coverage (self-review)

| Spec section | Task(s) |
|--------------|---------|
| Wave A POS full-bleed | Task 2 |
| Wave B UUID → names | Tasks 1, 4, 5 |
| Wave C filters | Tasks 3, 4, 6 |
| Wave D actions / tooltip / scroll | Tasks 1, 3, 7 |
| Shared primitives | Tasks 1, 3 |
| Non-goals (no immersive POS, no backend joins, no fake filters) | Global constraints + Tasks 4–6 |
| Verification | Task 8 |

## Placeholder / consistency check

- No TBD steps.
- `formatEntityLabel` / `Tooltip` / DataTable `toolbar`+`hideSearch` names used consistently across tasks.
- Commit steps gated on explicit user request.
