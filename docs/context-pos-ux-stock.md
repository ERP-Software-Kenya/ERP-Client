# Context: Full Session Record — 2026-08-12

**Date:** 2026-08-12  
**Repos:** `core-apis` (NestJS backend), `ERP-Client` (Electron renderer)  
**Web-ERP:** No changes today

Complete implementation record — **committed and uncommitted** — for RBAC/roles, POS UX refactor,
stock awareness, error handling, page access, dashboard, and credit approvals. Read this before
touching any of these modules in a future session.

---

## Executive summary

| Repo | Branch | Committed today | Uncommitted |
|---|---|---|---|
| **core-apis** | `develop` (**ahead of origin by 10**) | RBAC guard enforcement (10 commits, 15:38–16:59) | Exception filter, org scoping, inventory API field, controller hardening |
| **ERP-Client** | `dev` (synced with origin) | None on `dev` | 34 modified + 4 new files (+705 / −283 lines) |

---

## Complete file manifest

### core-apis — committed (10 commits, already in git)

```
src/application/modules/roles/roles.controller.ts
src/application/modules/user-roles/user-roles.controller.ts
src/application/modules/organizations/organizations.controller.ts
src/application/modules/payment-transactions/payment-transactions.controller.ts
src/application/modules/activity-logs/activity-logs.controller.ts
src/application/modules/expenses/expenses.controller.ts
src/application/modules/item-returns/item-returns.controller.ts
src/application/modules/orders/orders.controller.ts
src/application/modules/platform-configurations/platform-configurations.controller.ts
src/application/modules/purchase-items/purchase-items.controller.ts
src/application/modules/report-generation-logs/report-generation-logs.controller.ts
src/application/modules/customers/customers.controller.ts
src/application/modules/drivers/drivers.controller.ts
src/application/modules/trips/trips.controller.ts
src/application/modules/vehicle-expenses/vehicle-expenses.controller.ts
src/application/modules/vehicles/vehicles.controller.ts
src/application/modules/invoices/invoices.controller.ts
src/application/modules/common-utility/common-utility.controller.ts
src/common/auth/rbac-guard-coverage.spec.ts          (NEW)
src/common/auth/strategies/clerk-jwt.strategy.ts
docs/superpowers/plans/2026-08-12-rbac-guard-enforcement.md (NEW)
```

### core-apis — uncommitted (working tree)

```
src/application/modules/analytics/analytics.controller.ts
src/application/modules/auth/auth.controller.ts
src/application/modules/customers/customers.controller.ts
src/application/modules/drivers/drivers.controller.ts
src/application/modules/expenses/expenses.controller.ts
src/application/modules/expenses/queries/list-expenses/list-expenses.query-handler.ts
src/application/modules/inventory/models/responses/inventory.response.ts
src/application/modules/mail-templates/mail.controller.ts
src/application/modules/maintenance/maintenance.controller.ts
src/application/modules/notifications/helpers/notification-filter.normalizer.ts
src/application/modules/notifications/notifications.controller.ts
src/application/modules/payment-transactions/helpers/payment-transaction-filter.normalizer.ts
src/application/modules/payment-transactions/payment-transactions.controller.ts
src/application/modules/trips/trips.controller.ts
src/application/modules/users/users.controller.ts
src/application/modules/vehicle-expenses/vehicle-expenses.controller.ts
src/application/modules/vehicles/vehicles.controller.ts
src/common/auth/index.ts
src/common/auth/rbac-guard-coverage.spec.ts
src/common/auth/require-organization-id.ts              (NEW, untracked)
src/common/auth/require-organization-id.spec.ts         (NEW, untracked)
src/common/filters/extract-error-message.ts             (NEW, untracked)
src/common/filters/extract-error-message.spec.ts        (NEW, untracked)
src/common/filters/global-exception.filter.ts           (NEW, untracked)
src/common/filters/index.ts                             (NEW, untracked)
src/common/index.ts
src/main.ts
yarn.lock
role.txt                                                (session log — DO NOT COMMIT)
```

### ERP-Client — uncommitted (all of today's frontend work)

**Modified (34):**

```
renderer/src/api.ts
renderer/src/components/DataTable.tsx
renderer/src/components/PageAccessRoute.tsx
renderer/src/components/layout/AppLayout.tsx
renderer/src/config/modules.ts
renderer/src/context/AuthContext.tsx
renderer/src/context/PageAccessContext.tsx
renderer/src/features/core/api/index.ts
renderer/src/features/inventory/api/index.ts
renderer/src/lib/http.ts
renderer/src/pages/AuditLog/index.tsx
renderer/src/pages/Bills/index.tsx
renderer/src/pages/Customers/index.tsx
renderer/src/pages/Dashboard/index.tsx
renderer/src/pages/Expenses/index.tsx
renderer/src/pages/Fleet/Drivers/index.tsx
renderer/src/pages/Fleet/Trips/index.tsx
renderer/src/pages/Fleet/Vehicles/index.tsx
renderer/src/pages/PaymentTransactions/index.tsx
renderer/src/pages/PurchaseOrderDetail/index.tsx
renderer/src/pages/PurchaseOrderReceive/index.tsx
renderer/src/pages/PurchaseOrders/index.tsx
renderer/src/pages/Roles/index.tsx
renderer/src/pages/StockTransfers/index.tsx
renderer/src/pages/UserRoles/index.tsx
renderer/src/pages/credit-approvals/BlackLedger.tsx
renderer/src/pages/credit-approvals/PendingApprovals.tsx
renderer/src/pages/pos/HeldSalesPanel.tsx
renderer/src/pages/pos/POSTerminal.tsx
renderer/src/pages/pos/checkout.ts
renderer/src/pages/pos/components/CartTable.tsx
renderer/src/pages/pos/components/CheckoutPanel.tsx
renderer/src/pages/pos/components/ProductSearchPanel.tsx
renderer/src/types.ts
```

**New (4):**

```
docs/context-pos-ux-stock.md                            (this file)
renderer/src/lib/api-error.ts
renderer/src/pages/pos/components/StockBadge.tsx
renderer/src/pages/pos/posStock.ts
```

---

## Part A — Roles & RBAC (core-apis)

### A.1 System roles (`ERole` enum — unchanged, 5 values)

```typescript
// core-apis/src/infrastructure/persistence/entities/role.entity.ts
export enum ERole {
  SuperAdmin   = 'super_admin',
  OrgAdmin     = 'org_admin',
  OrgManager   = 'org_manager',
  StoreManager = 'store_manager',
  StoreStaff   = 'store_staff',
}
```

No new roles were created today. All work adds **guards** to existing endpoints.

### A.2 Role tiers applied in guards

| Tier | `@Roles(...)` values | Used for |
|---|---|---|
| **Platform** | `ERole.SuperAdmin` | Create role definitions, platform config, organizations |
| **Org-admin** | `ERole.OrgAdmin, ERole.SuperAdmin` | Assign user roles, retroactive financial edits |
| **Manager** | `ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin` | Deletes, expense approval, destructive fleet/customer ops |
| **Any authenticated** | *(no `@Roles` — ClerkAuthGuard only)* | Read/list endpoints |

### A.3 Commits (chronological)

| Time | Commit | Summary |
|---|---|---|
| 15:38 | `02bba81` | Source-level RBAC guard coverage checker |
| 15:45 | `edb27a3` | Refactor coverage checker; note regex limitation |
| 15:48 | `c9c8f8d` | **Roles + User-Roles privilege escalation fix** |
| 16:00 | `e2b5aa0` | Guard organizations + payment-transactions |
| 16:08 | `372b5b8` | Guard 7 fully-open controllers |
| 16:13 | `a2b1306` | Style: lazy `source()` closure in coverage spec |
| 16:18 | `dc38537` | Destructive endpoints → manager tier |
| 16:35 | `0e48360` | Guard invoices; Clerk email resolution fix |
| 16:41 | `1629b13` | Docs: RBAC follow-ups plan |
| 16:59 | `e776f39` | Guard common-utility; all controllers must have ClerkAuthGuard |

### A.4 Key fix — roles & user-roles controllers (committed `c9c8f8d`)

Both controllers were **fully open** (no auth). Fix pattern:

```typescript
// roles.controller.ts
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  // GET list/getById — any authenticated user

  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)          // POST create — SuperAdmin only
  @Post()
  public async create(...) { ... }
}

// user-roles.controller.ts
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'user-roles', version: '1' })
export class UserRolesController {
  // GET list/getById — any authenticated user

  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)   // POST assign role
  @Post()
  public async create(...) { ... }
}
```

### A.5 Guard pattern (reuse only — no new auth mechanism)

```typescript
// Class level — every route requires valid Clerk session
@UseGuards(ClerkAuthGuard)

// Method level — specific routes need role elevation
@UseGuards(RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin)
```

Precedents: `bills.controller.ts`, `auth.controller.ts` (`POST /auth/invite`).

### A.6 RBAC coverage test

`src/common/auth/rbac-guard-coverage.spec.ts` reads controller **source as text** (not runtime
import) because Jest cannot import `@automapper/core` ESM modules. Static regression check —
fails if a decorator line is deleted. Not a request-level e2e test.

**Plan:** `core-apis/docs/superpowers/plans/2026-08-12-rbac-guard-enforcement.md`

### A.7 Uncommitted backend hardening

#### Global exception filter (NEW)

```typescript
// src/common/filters/global-exception.filter.ts
// Registered in main.ts: app.useGlobalFilters(new GlobalExceptionFilter());
// Normalizes all errors to: { statusCode, message, errors? }
```

#### Organization scoping helper (NEW)

```typescript
// src/common/auth/require-organization-id.ts
export function requireOrganizationId(user?: { organizationId?: string }): string {
  if (!user?.organizationId) {
    throw new ForbiddenException('Organization is required. Complete onboarding first.');
  }
  return user.organizationId;
}

export function requireDbUserId(user?: { dbUserId?: string }): string {
  if (!user?.dbUserId) {
    throw new ForbiddenException('User is not onboarded. Call POST /auth/sync first.');
  }
  return user.dbUserId;
}
```

Replaces hardcoded fallback in analytics:

```typescript
// BEFORE (removed)
const FALLBACK_ORG_ID = '00000000-0000-4000-8000-000000000001';
query.organizationId = user?.organizationId ?? FALLBACK_ORG_ID;

// AFTER
query.organizationId = requireOrganizationId(user);
```

All 9 analytics endpoints updated: sales-summary, revenue-trend, top-products, top-customers,
purchase-summary, purchase-trend, top-suppliers, inventory-summary, stock-by-location.

#### Inventory API — black pool field

```typescript
// inventory.response.ts (uncommitted)
@ApiProperty({ description: 'Black / unpublished pool quantity at this location' })
public quantityUnpublished: number;
```

---

## Part B — Roles & page access (ERP-Client)

### B.1 Frontend role gates

**Sidebar — admin-only pages** (`config/modules.ts`):

```typescript
{ key: 'roles',      title: 'Roles & Permissions', path: '/roles',      adminOnly: true }
{ key: 'user-roles', title: 'User Roles',          path: '/user-roles', adminOnly: true }
```

**POS black sale toggle** (`POSTerminal.tsx`):

```typescript
const canCreateBlackSale = userRoles.some((r) =>
  ["super_admin", "org_admin", "org_manager"].includes(r),
);
```

**Page access DB configs** (`PageAccessContext.tsx`):

```typescript
// super_admin bypasses all checks
// Other roles: pageKey must exist in configs AND user's role must be in allowedRoles
const canAccess = (pageKey: string): boolean => {
  if (isSuperAdmin) return true;
  const allowed = accessMap.get(pageKey);
  if (!allowed) return false;
  return (user?.roles ?? []).some((r) => allowed.has(r));
};
```

### B.2 PageAccessGate — route-level enforcement (NEW)

Wired in `AppLayout.tsx` — replaces raw `<Outlet />`:

```typescript
// PageAccessRoute.tsx
export function PageAccessGate() {
  const location = useLocation();
  const { canAccess, isLoading, hasConfigs } = usePageAccess();
  const pageKey = pageKeyForPath(location.pathname);

  // Only enforce when DB has page-access configs (hasConfigs)
  if (hasConfigs && pageKey && !canAccess(pageKey)) {
    return (/* "You don't have access to this page" screen */);
  }
  return <Outlet />;
}
```

**Path → pageKey resolver** (`config/modules.ts`):

```typescript
export function pageKeyForPath(pathname: string): string | null {
  // Longest matching MODULES path wins
  // e.g. /purchase-orders/abc → 'purchase-orders'
}
```

**Two access mechanisms coexist:**

| Mechanism | Where | Behavior |
|---|---|---|
| `adminOnly` sidebar flag | Sidebar render | Hides nav item for non-admins |
| `PageAccessGate` | Route render | Blocks page content if DB config denies role |
| `PageAccessRoute` (per-route) | Specific routes | Redirects to `/` if denied |

### B.3 Auth behavior change — 401 vs 403

```typescript
// lib/http.ts
// 401 = session dead → dispatch 'auth:unauthorized' → AuthContext logs out
// 403 = permission miss → toast.error(), user STAYS signed in

function checkAuth(status: number, message?: string): void {
  if (status === 401) {
    document.dispatchEvent(new CustomEvent('auth:unauthorized'));
    return;
  }
  if (status === 403) {
    // Debounced toast (2s) — "You don't have permission to do that"
  }
}
```

`HttpError` now carries parsed JSON body:

```typescript
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: Record<string, unknown>,  // NEW
  ) { ... }
}
```

### B.4 Error message utilities (NEW — `lib/api-error.ts`)

| Function | Purpose |
|---|---|
| `formatApiErrorBody(body, statusText)` | Parse API JSON/text → one user-facing string |
| `getErrorMessage(error, fallback)` | Extract message from HttpError/Error/string |
| `parseCreditApprovalError(error)` | Detect credit-limit approval from COMPLETED failure |
| `loadErrorMessage(error, resource)` | `"Unable to load {resource}: {detail}"` for list pages |

**Applied on 15 list pages:** AuditLog, Bills, Customers, Expenses, Fleet (Drivers/Trips/Vehicles),
PaymentTransactions, PurchaseOrders, PurchaseOrderDetail, PurchaseOrderReceive, Roles,
StockTransfers, UserRoles.

**DataTable.tsx:** Removed `"Failed to load:"` prefix — callers pass full message via `loadErrorMessage`.

---

## Part C — POS UX refactor (prior design, implemented)

**Design doc:** `docs/brainstorm/2026-08-10-pos-billing-ux-redesign-design.md` (approved)

Split ~1918-line monolithic `POSTerminal.tsx` into focused components. State stays in parent
(`useState`, ~26 fields). No context/reducer. No checkout logic changes.

### C.1 Architecture

```
renderer/src/pages/pos/
├── POSTerminal.tsx          # State owner, checkout orchestration (1052 lines)
├── posHelpers.ts            # BillLine, ExtraCharge, fmt, lineTax, productRate
├── posStock.ts              # Stock map, availability, validation (NEW)
├── checkout.ts              # Bill POST → DRAFT → COMPLETED pipeline
├── components/
│   ├── PosToolbar.tsx       # Mode/sale-type, location, payment, customer type (281 lines)
│   ├── ProductSearchPanel.tsx  # Search, suggestions, qty stepper, quick charges (256 lines)
│   ├── CartTable.tsx        # Line items, qty ±, override pencil, stock column (358 lines)
│   ├── CheckoutPanel.tsx    # Totals, payment, customer, credit, actions (541 lines)
│   ├── StockBadge.tsx       # Colored stock badges (NEW, 39 lines)
│   └── StepList.tsx         # Checkout step status (34 lines)
├── HeldSalesPanel.tsx       # Draft resume panel
├── ReceiptDocument.tsx      # Print templates (unchanged)
└── buildSaleDocHtml.ts      # PDF generation (unchanged)
```

### C.2 UX fixes delivered

1. **Cart qty ± stepper** — per-row increment/decrement (was delete + re-add)
2. **Toolbar layout** — two clusters (transaction left, payment right) instead of one wrapping row
3. **Override pencil icon** — always visible (was hover-only text button)
4. **Collapsible sections** — delivery info + facilitator/commission collapsed by default

### C.3 Data flow (unchanged principles)

```
POSTerminal (useState)
    ├── PosToolbar          ← mode, saleType, locationId, payMethod, customerType
    ├── ProductSearchPanel  ← searchVal, qty, addProduct()
    ├── CartTable           ← lines, handleLineQtyChange(), stock badges
    └── CheckoutPanel       ← grandTotal, generateBill()
            └── generateBill() → runSalesCheckout() / runPurchaseCheckout()
                                    └── checkout.ts
```

**Preserved features (full parity):** sales/purchase modes, normal/credit/black sale types,
payment method + timing, customer type + inline creation, credit limit + approval, facilitator
& commission, delivery info, held sales, quick charges, price/tax override, purchase supplier.

### C.4 Non-goals (explicit)

- No changes to calculation functions (`lineTax`, `lineTotal`, black markup, credit logic)
- No new state management approach
- No feature removal
- No touch/mobile optimization
- No server-side stock validation changes

---

## Part D — POS stock awareness (NEW today)

### D.1 Data source

```typescript
// POSTerminal.tsx
const { data: inventory = [] } = Inventory.useList();
const stockMap = useMemo(
  () => buildLocationStockMap(inventory, locationId),
  [inventory, locationId],
);
const orgId = stockLocation?.organizationId;  // from location, not store
```

Canonical `Inventory` export moved to `features/inventory/api/index.ts` (removed duplicates
from `api.ts` and `features/core/api/index.ts`).

### D.2 Availability rules (`posStock.ts`)

| Sale type | Formula | Badge label |
|---|---|---|
| `normal`, `credit` | `max(0, onHand − reserved)` | `"12 left"`, `"Out of stock"` |
| `black` | `max(0, quantityUnpublished)` | `"5 black units"`, `"No black stock"` |
| No inventory row | `found: false` | `"No stock record"` |
| Low stock | `available ≤ reorderLevel` | Amber badge tone |

```typescript
export interface StockInfo {
  available: number;
  onHand: number;
  reserved: number;
  unpublished: number;
  reorderLevel: number;
  found: boolean;
}

// Key functions:
buildLocationStockMap(inventory, locationId) → Map<productId, InventoryItem>
getStockInfo(stockMap, productId, saleType) → StockInfo
cartQtyForProduct(lines, productId, excludeLineId?) → number
lineExceedsStock(lines, line, stockMap, saleType) → boolean
saleHasStockIssues(lines, stockMap, saleType) → boolean
stockBadgeTone(info) → 'ok' | 'low' | 'out' | 'none'
stockBadgeLabel(info, saleType) → string
```

### D.3 StockBadge component

```tsx
<StockBadge info={stockInfo} saleType={saleType} />
// Tones: ok (emerald), low (amber), out (red), none (muted)
// Tooltip: on-hand/reserved for normal; black pool + official on-hand for black
```

Used in: `ProductSearchPanel` (suggestion rows), `CartTable` (per-line Stock column).

### D.4 Validation gates

| Action | Handler | Behavior |
|---|---|---|
| Add product | `addProduct()` | Block if no row / zero stock; clamp qty to `room = available − inCart` |
| Line qty ± | `handleLineQtyChange()` | Clamp to `stock.available − otherLinesQty`; min 1 |
| Complete Sale | `generateDisabled` | `hasStockIssues` → button disabled |
| Hold Sale | `holdDisabled` | **NOT** blocked by stock (draft only) |

UI feedback:

- Over-stock row: red-tinted background + `"Need {qty}, only {available} available"`
- Cart footer banner when any line exceeds stock
- CheckoutPanel hint: `"Fix stock issues in the cart before completing"`

### D.5 Types

```typescript
// renderer/src/types.ts — InventoryItem
quantityOnHand: number;
quantityReserved: number;
quantityUnpublished?: number;  // black / unpublished pool
reorderLevel: number;
```

Server deducts stock on bill `COMPLETED` — client checks are advisory/preventive only.

---

## Part E — Credit approvals flow

### E.1 Checkout — credit over limit (`checkout.ts`)

When `PATCH /bills/:id/status` with `COMPLETED` fails with credit-limit message:

```typescript
const approval = parseCreditApprovalError(e);
if (approval.isPendingApproval) {
  // Bill stays DRAFT; treat as partial success
  return {
    receipt, steps,
    primaryOk: true,
    pendingCreditApproval: true,
    approvalRequestId: approval.approvalRequestId,
    billId,
  };
}
```

Detection patterns in `parseCreditApprovalError`:

- `/sent for approval/i`
- `/exceeds customer credit limit/i`

Extracts `approvalRequestId` from `HttpError.body`.

### E.2 Pending Approvals page — rich cards (`PendingApprovals.tsx`)

- Lists pending via `CreditApprovals.useListPending()`
- Builds `customerMap` from `Customers.useSearch`
- Parallel bill fetches via `useQueries` — one `GET /bills/:id` per approval
- `ApprovalCard` shows: customer label, bill number, bill total, credit limit/balance/after-sale,
  requested amount, approve/reject buttons

### E.3 Black Ledger (`BlackLedger.tsx`)

- Removed `date-fns` dependency → native `toLocaleString`
- Date formatting for bill createdAt and commission paidAt

### E.4 Held Sales panel (`HeldSalesPanel.tsx`)

- Removed `date-fns` → native `toLocaleString`
- Amount display uses `fmt()` from posHelpers (was raw `₹{b.totalAmount}`)

---

## Part F — Dashboard live data

**File:** `renderer/src/pages/Dashboard/index.tsx`

| Chart | Before (demo) | After (live) |
|---|---|---|
| Revenue trend | `DEMO_REVENUE_TREND` (7 months fake) | `Analytics.useRevenueTrend(6)` |
| Fleet status donut | `DEMO_VEHICLE_METRICS` | `FleetVehicles.useList()` aggregated by status |
| Trip volume | `DEMO_VEHICLE_TRIPS` | `FleetTrips.useList()` grouped by start month |
| Fleet CTA link | `/vehicles` | `/fleet` |

Fleet status buckets: `available`, `in_transit`, `maintenance`, `idle`, `out_of_service`.

Empty states: "No sales yet", "No vehicles yet", "No trips yet".

---

## Part G — API module cleanup

| File | Change |
|---|---|
| `api.ts` | Removed duplicate `Inventory` export |
| `features/core/api/index.ts` | Removed duplicate `Inventory` export |
| `features/inventory/api/index.ts` | **Canonical home** for `Inventory` + `useByProduct()` |

```typescript
// features/inventory/api/index.ts
export const Inventory = {
  ...inventoryBase,
  useByProduct(productId: string | undefined) {
    return useQuery({
      queryKey: ['inventory', 'by-product', productId],
      queryFn: () => get<InventoryItem[]>(`/api/v1/inventory/by-product/${productId}`),
      enabled: !!productId,
    });
  },
};
```

---

## Part H — Commit status & suggested grouping

### core-apis

```bash
cd core-apis
git log origin/develop..HEAD --oneline   # 10 RBAC commits (NOT PUSHED)
git status                                # 22 files still modified
```

**Push now:** 10 RBAC commits  
**Commit separately:** exception filter, requireOrganizationId, analytics scoping, inventory field

### ERP-Client

```bash
cd ERP-Client
git status        # 34 modified, 4 untracked
git diff --stat   # +705 / −283
```

**Suggested commits:**

1. `feat(pos): location-aware stock badges and checkout caps`
2. `fix(http): distinguish 401 logout from 403 permission toast`
3. `feat(access): PageAccessGate for route-level role enforcement`
4. `feat(dashboard): replace demo charts with live analytics and fleet data`
5. `feat(credit): rich pending approvals UI and checkout approval flow`
6. `refactor(api): consolidate Inventory export to features/inventory/api`
7. `docs: full session context snapshot 2026-08-12`

---

## Part I — Verification checklist

### RBAC (core-apis)

- [ ] `yarn test rbac-guard-coverage` passes
- [ ] Unauthenticated `GET /api/v1/roles` → 401
- [ ] StoreStaff `POST /api/v1/user-roles` → 403
- [ ] OrgAdmin can assign user roles
- [ ] SuperAdmin can create roles; others cannot
- [ ] StoreStaff cannot DELETE customers/drivers/vehicles
- [ ] Analytics without org → 403 (after uncommitted work committed)

### ERP-Client

- [ ] POS: stock badges show correct qty for normal and black sales
- [ ] POS: add/qty clamped to available; Complete Sale disabled when over stock
- [ ] POS: hold sale works regardless of stock issues
- [ ] 403 on action → toast, user stays logged in
- [ ] 401 → forced logout
- [ ] PageAccessGate: restricted role sees in-app gate screen
- [ ] Roles / User Roles pages show readable API errors
- [ ] Dashboard revenue chart loads from API
- [ ] Credit sale over limit → draft saved, appears on Pending Approvals with rich card
- [ ] Black Ledger and Held Sales show formatted dates/amounts

---

## Part J — Risks & follow-ups

1. **core-apis 10 commits unpushed** — deploy RBAC before relying on frontend 403 handling.
2. **ERP-Client entirely uncommitted** — commit/push to avoid loss.
3. **Stale inventory cache** — `Inventory.useList()` may lag in multi-terminal setups; invalidate on checkout success.
4. **Server is authoritative** — client stock caps are advisory; backend validates on COMPLETED.
5. **`role.txt` in core-apis** — session artifact; do not commit.
6. **No unit tests** for `posStock.ts` or `api-error.ts`.
7. **PageAccessGate only active when `hasConfigs`** — if no DB configs exist, all routes pass through.

---

## Part K — Related docs

| Doc | Topic |
|---|---|
| `ERP-Client/docs/brainstorm/2026-08-10-pos-billing-ux-redesign-design.md` | POS component extraction design |
| `ERP-Client/docs/context-purchase-order-flow.md` | Earlier POS location/supplier refactor |
| `ERP-Client/docs/superpowers/plans/2026-08-07-sales-v2-credit-black-CONTEXT.md` | Credit/black sale types |
| `core-apis/docs/superpowers/plans/2026-08-12-rbac-guard-enforcement.md` | RBAC implementation plan |
| `core-apis/ai_context.md` | Backend architecture reference |
| `core-apis/docs/brainstorm/2026-07-27-inventory-system-design.md` | `quantityUnpublished` pool design |

---

## Part L — Line counts (POS module)

| File | Lines |
|---|---|
| `POSTerminal.tsx` | 1052 |
| `components/CartTable.tsx` | 358 |
| `components/CheckoutPanel.tsx` | 541 |
| `components/PosToolbar.tsx` | 281 |
| `components/ProductSearchPanel.tsx` | 256 |
| `components/StockBadge.tsx` | 39 |
| `components/StepList.tsx` | 34 |
| `posStock.ts` | 113 |
| **Total POS module** | **2674** |
