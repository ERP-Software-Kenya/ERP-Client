# UX Polish — UUID Labels, Filters, POS Layout, Chrome

**Date:** 2026-08-01  
**Scope:** ERP-Client (`renderer`) only — no Core API schema changes in this pass  
**Status:** Approved in brainstorming; awaiting implementation plan  
**Approach:** Shared primitives first, then page waves (A → B → C → D)

## Goal

Make the ERP Client feel professional and human-readable: names instead of raw UUIDs, consistent filters where the API supports them, edge-to-edge POS, vertical row-action menus, styled collapsed-sidebar tooltips, and unified scrollbars.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Delivery order | A → B → C → D |
| Architecture | Shared primitives first, then page application waves |
| POS layout | Edge-to-edge in main content; keep Topbar + Sidebar |
| UUID → names | Display names everywhere possible; replace UUID lookups with name pickers when list/search APIs exist; flag API gaps |
| Filters | Consistent toolbar; only filters the API can honor; no fake client-only filters on paginated lists |
| Filter priority | Bills, Inventory, Products, Customers, Orders/POs first; then other list pages |
| Collapsed sidebar hover | Styled tooltip with item name (and “coming soon” when disabled) |
| Row actions | Vertical three-dot (`MoreVertical`) |
| Scrollbars | Reuse existing `custom-scrollbar` across main scroll surfaces |
| Backend joins | Out of scope — resolve labels via existing list/get maps on the client |

## Wave A — POS full-bleed

### Problem
`POSTerminal` sits in a rounded bordered “card” (`rounded-lg border … h-[calc(100vh-5.5rem)]`), and `AppLayout` wraps all routes in `px-3 py-3`, so POS never fills the content area.

### Design
1. **`AppLayout`**: when route is `/pos`, omit the content padding wrapper (or use `p-0`) so POS can flush to the main pane edges. Other routes keep current padding.
2. **`POSTerminal`**: remove outer card chrome (rounded corners, outer border, artificial height calc tied to padded layout). Use `h-full min-h-0` to fill the main pane.
3. Keep internal structure: mode header, product pane, cart/checkout panes, dialogs/modals.
4. Do not hide Topbar or Sidebar.

### Acceptance
- On `/pos`, no gutter padding around the terminal; no outer card frame.
- Other pages still have normal padding.
- Sidebar + Topbar remain visible and usable.

## Wave B — UUID → human labels

### Problem
Many tables, drawers, and details show truncated UUIDs (`id.slice(0, 8)`). Some forms/lookups ask users to paste IDs. Selects that already use `ResourceSelect` are the preferred pattern; gaps remain on Bills party labels, BillDetail product lines, StockTransfers, Inventory dashboards, etc.

### Design

**Display**
- Resolve FK IDs to names via existing list hooks / id→name maps (same pattern as Products category map, Inventory product/location maps).
- Label priority: `name` → `sku` / `code` / `phone` (entity-appropriate) → truncated UUID fallback only if unresolved.
- Detail headers and ViewDrawer fields show names, not raw org/category/location/customer/store/product IDs.

**Forms / lookups**
- Prefer `ResourceSelect` or typeahead (e.g. customer search on Bills) over free-text UUID inputs when search/list endpoints exist.
- Keep get-by-id UUID lookup UI only where there is no list/search API (known gaps: some Users / Roles / UserRoles directory flows). Document these as **API gaps** — do not invent fake directories.

**Out of scope**
- Changing Core API responses to embed joined names.
- Inventing client-only search against full datasets that are not loaded.

### Acceptance
- No primary user-facing column or form label shows a bare UUID when a related name can be loaded with existing endpoints.
- Pages that still require UUID lookup are explicitly listed as API gaps in the implementation notes.

### Known API gaps (flag, don’t fake)
- Users / Roles / UserRoles: create + get-by-id only; no list/search directory.
- Bills list text search: API has status / location / customerId filters only (no free-text bill search).
- Any other module discovered during implementation that lacks list/search — add to the gap list; leave UUID lookup with a clear label.

## Wave C — Professional filters

### Problem
Filter UX is inconsistent: Bills has status chips; many DataTables only have a search box; some placeholders claim search when the API cannot honor it.

### Design
1. Introduce a small shared **filter toolbar** pattern (props or slot on `DataTable` / adjacent bar): search (optional) + discrete filters (status, type, location, etc.).
2. Wire filters only to query params the API already accepts (`filters` / documented search fields in `resource.ts` / module hooks).
3. Changing any filter resets pagination to page 1.
4. If text search is unsupported, do not pretend: disable or omit search, show real discrete filters instead.
5. Never filter only the current page client-side for server-paginated lists.

### Priority application order
1. Bills, Inventory, Products, Customers, Orders / Purchase Orders  
2. Remaining DataTable list pages with enum/status/type or existing filter params  
3. Get-by-id-only pages: no fake list filter bar

### Acceptance
- Priority pages expose professional, honest filters.
- No filter control exists whose selection is ignored by the API.

## Wave D — Chrome polish

### Row actions
- `RowActionsMenu`: swap `MoreHorizontal` → `MoreVertical`. One-file change covers all tables using the shared menu.

### Collapsed sidebar tooltips
- Today: native `title` attribute when collapsed.
- Target: styled tooltip component (Radix or lightweight custom) showing item title; disabled items include “Coming soon”.
- Expanded sidebar: no tooltip needed (label already visible).
- Do not auto-expand the sidebar on hover.

### Scrollbars
- Apply existing `.custom-scrollbar` (thin thumb, transparent track) to: main content (`AppLayout` main), `FormDrawer` body, dialog overflow, select menus where practical, and other high-traffic `overflow-y-auto` panels.
- Do not invent a second scrollbar visual language.

### Acceptance
- All shared row menus show vertical `⋮`.
- Collapsed nav icons show a styled name tooltip on hover.
- Primary scroll surfaces share the same scrollbar styling.

## Shared primitives (build once)

| Primitive | Intent |
|-----------|--------|
| Layout POS padding gate | `AppLayout` route-aware padding |
| `formatEntityLabel` / maps helpers | Consistent name resolution + UUID fallback |
| DataTable filter slot / toolbar | Search + discrete filters without per-page reinvention |
| Tooltip UI | Sidebar (and reusable elsewhere if needed) |
| `MoreVertical` in `RowActionsMenu` | Global action affordance |
| `custom-scrollbar` adoption | Consistent overflow chrome |

## Non-goals

- Hiding app chrome for immersive POS fullscreen
- Core API redesign or new join endpoints (can be a follow-up)
- Client-side fake filtering of paginated data
- Sidebar flyout / hover-expand width behavior
- Visual redesign of POS internals beyond outer shell removal

## Risks / assumptions

1. Some list endpoints may not return enough related fields — name resolution may require extra list fetches (cache via React Query).
2. Filter param names must match backend contracts; wrong keys must not be shipped.
3. POS height depends on `AppLayout` flex chain (`main` + outlet); verify no double scrollbars after padding removal.
4. Tooltip library: prefer existing Radix stack if already a dependency; otherwise minimal CSS tooltip to avoid new deps unless necessary.
5. Wave B/C touch many pages — land shared helpers first to keep diffs reviewable.

## Verification

- Manual: `/pos` edge-to-edge; other routes still padded
- Spot-check: Bills, Inventory, Products, Customers — names in tables/forms; filters work and reset page
- Collapsed sidebar: styled tooltip; expanded: unchanged
- Tables: vertical `⋮` menu
- Scroll: main + drawer use `custom-scrollbar`
- Note any remaining UUID lookup pages in PR description as API gaps
