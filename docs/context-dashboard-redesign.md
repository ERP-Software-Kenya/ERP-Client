# Dashboard Redesign — Session Context

**Date:** 2026-08-09  
**Branch:** `worktree-feat-dashboard-redesign`  
**PR:** #18 → `main`  
**Files changed:**
- `renderer/src/pages/Dashboard/index.tsx` (full rewrite, +1133 lines)
- `renderer/src/context/SessionContext.tsx` (new)
- `renderer/src/main.tsx` (SessionProvider wired in)

---

## What Was Built

The main ERP dashboard (`/`) was a stub — 4 static stat cards and a placeholder message. This session replaced it with a fully data-driven, animated, 3-tab dashboard designed for org admins to understand the state of their entire organization at a glance.

---

## Architecture

### 3 Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | Day-to-day operational snapshot — KPIs, notifications, pending approvals, low-stock alerts |
| **Analytics** | Deep-dive charts — sales funnel, inventory by location, product performance, procurement breakdown |
| **Operations** | Fleet management, stock transfers, location-level performance |

### SessionContext (`renderer/src/context/SessionContext.tsx`)

Sits between `AuthProvider` and the app. Derives a clean, typed shape from the raw `/me` response so components don't drill into nested auth fields.

```
AuthProvider (AuthContext)
  └── SessionProvider (SessionContext)   ← NEW
        └── QueryClientProvider
              └── App
```

**Exposes:**

| Field | Type | Description |
|-------|------|-------------|
| `user` | `SessionUser \| null` | Flat user: `id`, `email`, `firstName`, `lastName`, `fullName`, `avatarUrl`, `roles` |
| `organization` | `SessionOrg \| null` | Flat org: `id`, `name`, `slug`, `logoUrl` |
| `raw` | `MeResponse \| null` | Original `/me` payload |
| `isLoading` | `boolean` | Auth still resolving |
| `isSuperAdmin` | `boolean` | role `super_admin` |
| `isOrgAdmin` | `boolean` | `super_admin` OR `org_admin` |
| `isStoreManager` | `boolean` | any of above OR `store_manager` |
| `isStoreStaff` | `boolean` | any of above OR `store_staff` |
| `isAdmin` | `boolean` | alias for `isOrgAdmin` (used for page-level guards) |
| `logout` | `() => Promise<void>` | Delegates to AuthContext |
| `refresh` | `() => Promise<void>` | Delegates to AuthContext |

**Usage:**
```tsx
const { user, organization, isAdmin } = useSession();
```

---

## Data Sources

### Real data (live API calls)

| Data | Endpoint | Used in |
|------|----------|---------|
| Product count | `GET /api/v1/products?$page=1&$perPage=1` | Overview KPI, Analytics |
| Supplier count | `GET /api/v1/suppliers?$page=1&$perPage=1` | Overview KPI |
| Customer count | `GET /api/v1/customers` (omitPagination) | Overview KPI |
| Purchase Order count | `GET /api/v1/purchase-orders?$page=1&$perPage=1` | Overview KPI |
| PO count by status | Same endpoint × 5 (draft/ordered/partially_received/received/cancelled) | Analytics pie + progress bars |
| Bill count | `GET /api/v1/bills` (omitPagination) | Overview KPI |
| Bill count by status | Same endpoint × 4 (COMPLETED/DRAFT/INITIATED/CANCELLED) | Analytics pie |
| Payment count | `GET /api/v1/payment-transactions?$page=1&$perPage=1` | Analytics |
| Inventory record count | `GET /api/v1/inventory?$page=1&$perPage=1` | Analytics KPI |
| Low-stock items | `GET /api/v1/inventory/low-stock` | Alert banner, Overview table, Analytics health chart |
| Inventory valuation | `GET /api/v1/inventory/valuation` | Inventory value KPI, by-location chart, product performance charts |
| Products list | `GET /api/v1/products/list` | Join for product names in charts |
| Locations list | `GET /api/v1/locations/list` | Join for location names in charts |
| Notifications | `GET /api/v1/notifications?$page=1&$perPage=8` | Overview notifications panel |
| Pending POs (draft) | `GET /api/v1/purchase-orders?status=draft&$page=1&$perPage=6` | Overview pending approvals panel |
| Stock transfers | `GET /api/v1/stock-transfers?$page=1&$perPage=8` | Operations tab |

### Computed from real data (client-side aggregation)

| Metric | How computed |
|--------|-------------|
| Inventory value by location | Group `valuation[]` by `locationId`, sum `qty × avgCost`, join with `locationsList` for names |
| Top products by stock value | Group `valuation[]` by `productId`, sum `qty × avgCost`, join with `productsList` for names, sort desc |
| Top products by quantity | Group `valuation[]` by `productId`, sum `quantityOnHand`, join with `productsList`, sort desc |
| Location performance cards | Same grouping as above, joined with `locationsList` for name/type |
| Stock health (healthy vs low) | `totalInventory - lowCount` = healthy; `lowCount` = low |
| Total inventory value (KPI) | Sum all `valuation[]` items: `qty × avgCost` |

### Demo data (no server-side reporting endpoint yet)

| Chart | Why demo | What to replace with |
|-------|----------|---------------------|
| Revenue vs Cost trend (area) | Orders/Invoices are create-only; no date-bucketed list endpoint | Server-side `GET /api/v1/reports/revenue?groupBy=month` |
| Vehicle trip trend (area) | Vehicle module is disabled; no trip list endpoint | `GET /api/v1/vehicles/trips` once vehicle module is enabled |
| Vehicle fleet status (donut) | No vehicle data endpoint | `GET /api/v1/vehicles` with status filter |

All demo charts carry a subtitle: `"Demo data — [reason]"` so users and developers know they are not real.

---

## Animation System

### Count-up numbers (`useCountUp` hook)
- Runs `requestAnimationFrame` loop from 0 → target value
- Easing: `easeOutExpo` (`1 - 2^(-10t)`)
- Duration: 1400ms
- Restarts if the target value changes (e.g. after data loads)

### Card entry (`useFadeIn` hook + `AnimFade` wrapper)
- Mounts invisible (`opacity-0 translate-y-3`)
- After `delay` ms, transitions to visible (`opacity-100 translate-y-0`)
- Duration: 600ms CSS transition
- Cards in a grid use 80ms stagger offsets: 0, 80, 160, 240, 320, 400ms

### Chart animations (Recharts built-in)
- `animationBegin={0}`, `animationDuration={1200–1600}`, `animationEasing="ease-out"`
- Applied to: `Bar`, `Area`, `Pie`, `RadialBar`
- Sequential charts offset their `animationDuration` slightly to stagger visual entry

---

## Chart Inventory

| Chart | Type | Data | Tab |
|-------|------|------|-----|
| Bills by Status | `PieChart` (donut) | Real | Analytics |
| Revenue vs Cost Trend | `AreaChart` (stacked) | Demo | Analytics |
| Inventory Value by Location | `BarChart` (vertical) | Real computed | Analytics |
| Stock Health | `RadialBarChart` | Real | Analytics |
| Top Products by Stock Value | `BarChart` (horizontal) | Real computed | Analytics |
| Top Products by Quantity | `BarChart` (horizontal) | Real computed | Analytics |
| PO Status Breakdown | `PieChart` (donut) | Real | Analytics |
| PO Status Progress Bars | Custom HTML bars | Real | Analytics |
| Vehicle Fleet Status | `PieChart` (donut) | Demo | Operations |
| Monthly Trip Volume | `AreaChart` | Demo | Operations |
| Stock Value by Location | `BarChart` (vertical) | Real computed | Operations |

All charts use `recharts` v3 (already a project dependency).

---

## Known Gaps / Future Work

### Backend endpoints needed for full real data

1. **Revenue trend over time** — `GET /api/v1/reports/bills/trend?groupBy=month`  
   Currently: demo area chart.

2. **Product-level sales breakdown** — `GET /api/v1/bills/:id/items` returns items for a single bill, but there is no aggregate "sold quantity per product" endpoint. The product performance charts use stock-on-hand as a proxy, not actual sales volume.

3. **Vehicle analytics** — The vehicle module (`VehiclesPage`) exists in the frontend but is commented out of the sidebar. No vehicle API hooks are defined in `api.ts`. Once `GET /api/v1/vehicles` and `GET /api/v1/vehicles/trips` are wired up, the Operations tab demo charts can be replaced.

4. **Activity log feed** — `ActivityLogs` is `createCreateOnlyResource` (no list endpoint). The Overview tab shows Notifications instead. A real recent-activity feed needs `GET /api/v1/activity-logs` with pagination.

5. **Revenue / bill total amounts** — The Bills search returns `total` (count) but not sum of `totalAmount`. To show actual revenue (not bill count), need either: (a) a reporting endpoint, or (b) fetching all completed bills client-side and summing `totalAmount`.

### Frontend improvements (deferred)

- **Product names in low-stock table** — Currently shows truncated `productId`. The Overview low-stock table would be more useful joined with product names. `Products.useList()` is already fetched in AnalyticsTab — could be shared via context or prop-drilled into Overview.
- **Date range filter** — All analytics are all-time. A date picker to filter by last 7/30/90 days would require backend filter support on most endpoints.
- **Export** — A "Download CSV" button on tables (low-stock, transfers, location performance) is a common admin need.

---

## File Structure

```
renderer/src/
  context/
    AuthContext.tsx          — Clerk session + /me sync (existing)
    SessionContext.tsx       — NEW: derived session shape (user, org, role booleans)
    PageAccessContext.tsx    — Page-level access control (existing)
    ThemeContext.tsx          — Light/dark theme (existing)
  pages/
    Dashboard/
      index.tsx              — Full 3-tab dashboard (rewritten this session)
  main.tsx                   — SessionProvider added
```

---

## Component Map (Dashboard/index.tsx)

```
Dashboard (root)
  ├── useSession()              ← org name, user first name
  ├── Tab switcher (Overview | Analytics | Operations)
  │
  ├── <OverviewTab>
  │     ├── KpiCard × 6        ← count-up animation, real data
  │     ├── AnimFade alert banner (low stock)
  │     ├── Notifications panel
  │     ├── Pending POs panel
  │     └── Low-stock table
  │
  ├── <AnalyticsTab>
  │     ├── [Sales & Revenue]
  │     │     ├── BillsStatusChart (PieChart)
  │     │     ├── Revenue trend (AreaChart, demo)
  │     │     └── Sales KPI row × 4
  │     ├── [Inventory Intelligence]
  │     │     ├── KpiCard × 4
  │     │     ├── Inventory by location (BarChart)
  │     │     └── Stock health (RadialBarChart)
  │     ├── [Product Performance]
  │     │     ├── Top by value (BarChart horizontal)
  │     │     └── Top by quantity (BarChart horizontal)
  │     └── [Procurement]
  │           ├── PO status (PieChart)
  │           └── PO progress bars
  │
  └── <OperationsTab>
        ├── [Vehicle Fleet]
        │     ├── Fleet status (PieChart, demo)
        │     ├── Trip trend (AreaChart, demo)
        │     ├── KpiCard × 4 (demo)
        │     └── Module enable CTA
        ├── [Stock Transfers]
        │     └── Recent transfers list (real)
        └── [Location Performance]
              ├── Stock value bar chart (real computed)
              └── Location KPI cards × N (real computed)
```
