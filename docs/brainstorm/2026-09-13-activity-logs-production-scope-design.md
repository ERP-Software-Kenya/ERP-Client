# Activity Logs — Production-Grade Scope Design

**Date:** 2026-09-13
**Status:** Approved
**Scope:** `core-apis` shared service + all module command handlers + `renderer/src/pages/ActivityLogs/` + `renderer/src/pages/AuditLog/` (deleted)

---

## Goal

Replace the current partial, manually-triggered activity logging system with a fully automatic, org-admin-facing activity feed that covers every significant write operation across all ERP modules. The org admin opens one page and sees a complete, chronological record of everything that has happened inside their organisation — who did it, what they did, and when.

---

## What is changing

### Removed
- `POST /api/v1/activity-logs` — manual log creation endpoint deleted
- `renderer/src/pages/AuditLog/index.tsx` — deleted; merged into ActivityLogs
- `audit-log` entry in `renderer/src/config/modules.ts`
- Manual entry drawer in `ActivityLogs/index.tsx`
- `ProductActivityLogger` service — replaced by the new `ActivityLogService`
- Client-side pagination in `ActivityLogs/index.tsx`

### Added
- `RequestActorContext` — request-scoped provider resolving actor from Clerk JWT
- `ActivityLogService` — unified shared service, one call site per handler
- `actorName` column on `activity_logs` table
- Server-side filters on `GET /api/v1/activity-logs/list`
- `POST /api/v1/activity-logs/export` — PDF export endpoint via Puppeteer
- 53-event `EActivityAction` enum replacing the current 16-action enum
- `auth.login_failed` capture in the auth exception path

---

## Data Model

### `activity_logs` table — delta from current

| Field | Type | Change |
|---|---|---|
| `actorName` | `VARCHAR(150)` | **NEW** — display name snapshotted at log time |
| `ipAddress` | `VARCHAR(50)` | exists, now always populated |
| `userAgent` | `VARCHAR(255)` | exists, now always populated |
| all other fields | — | unchanged |

`actorName` is snapshotted so the admin always sees the name that was current at the time of the action, even if the user is later renamed or deactivated.

### Complete `EActivityAction` enum

Dot-notation: `module.action`. Grouped by module for readability.

```typescript
export enum EActivityAction {
  // Authentication
  AUTH_LOGIN              = 'auth.login',
  AUTH_LOGOUT             = 'auth.logout',
  AUTH_LOGIN_FAILED       = 'auth.login_failed',

  // Products
  PRODUCT_CREATED         = 'product.created',
  PRODUCT_UPDATED         = 'product.updated',
  PRODUCT_DELETED         = 'product.deleted',
  PRODUCT_ENABLED         = 'product.enabled',
  PRODUCT_DISABLED        = 'product.disabled',
  PRODUCT_PRICE_CHANGED   = 'product.price_changed',

  // Inventory / Stock
  STOCK_ADDED             = 'stock.added',
  STOCK_REMOVED           = 'stock.removed',
  STOCK_ADJUSTED          = 'stock.adjusted',
  STOCK_TRANSFERRED       = 'stock.transferred',
  STOCK_DAMAGED           = 'stock.damaged',
  STOCK_WRITTEN_OFF       = 'stock.written_off',
  STOCK_RESERVED          = 'stock.reserved',
  STOCK_RESERVATION_RELEASED = 'stock.reservation_released',

  // Sales / POS
  SALE_CREATED            = 'sale.created',
  SALE_CONFIRMED          = 'sale.confirmed',
  SALE_VOIDED             = 'sale.voided',
  SALE_PAYMENT_RECEIVED   = 'sale.payment_received',
  SALE_REFUNDED           = 'sale.refunded',

  // Purchase Orders
  PURCHASE_ORDER_CREATED          = 'purchase_order.created',
  PURCHASE_ORDER_SENT             = 'purchase_order.sent',
  PURCHASE_ORDER_GOODS_RECEIVED   = 'purchase_order.goods_received',
  PURCHASE_ORDER_CANCELLED        = 'purchase_order.cancelled',

  // Invoices
  INVOICE_CREATED         = 'invoice.created',
  INVOICE_SENT            = 'invoice.sent',
  INVOICE_PAID            = 'invoice.paid',
  INVOICE_VOIDED          = 'invoice.voided',

  // Bills
  BILL_CREATED            = 'bill.created',
  BILL_PAID               = 'bill.paid',

  // Customers
  CUSTOMER_CREATED        = 'customer.created',
  CUSTOMER_UPDATED        = 'customer.updated',
  CUSTOMER_CREDIT_LIMIT_CHANGED = 'customer.credit_limit_changed',
  CUSTOMER_DEACTIVATED    = 'customer.deactivated',

  // Suppliers
  SUPPLIER_CREATED        = 'supplier.created',
  SUPPLIER_UPDATED        = 'supplier.updated',
  SUPPLIER_DEACTIVATED    = 'supplier.deactivated',

  // Users & Staff
  USER_CREATED            = 'user.created',
  USER_UPDATED            = 'user.updated',
  USER_ROLE_CHANGED       = 'user.role_changed',
  USER_DEACTIVATED        = 'user.deactivated',
  USER_REACTIVATED        = 'user.reactivated',

  // Branches / Stores
  BRANCH_CREATED          = 'branch.created',
  BRANCH_UPDATED          = 'branch.updated',

  // Reports
  REPORT_GENERATED        = 'report.generated',
  REPORT_EXPORTED         = 'report.exported',

  // Org Settings
  ORG_SETTINGS_UPDATED    = 'org.settings_updated',
  ORG_MODULE_TOGGLED      = 'org.module_toggled',
  ORG_BILLING_CHANGED     = 'org.billing_changed',
}
```

---

## Backend Architecture

### 1. `RequestActorContext` provider

**Path:** `core-apis/src/application/shared/providers/request-actor-context.provider.ts`
**Scope:** `REQUEST` (NestJS per-request lifecycle)

Reads from the Clerk JWT already verified by `ClerkAuthGuard` and the Express `Request` object. Exposes a single `IRequestActor` interface:

```typescript
interface IRequestActor {
  userId: string;
  actorName: string;       // firstName + lastName from Clerk JWT
  organizationId: string;
  ipAddress: string;       // X-Forwarded-For → req.ip fallback
  userAgent: string;       // req.headers['user-agent']
}
```

No extra database queries — all fields are available from the already-decoded JWT and request headers.

### 2. `ActivityLogService`

**Path:** `core-apis/src/application/shared/services/activity-log.service.ts`
**Scope:** `REQUEST` (inherits from `RequestActorContext`)

Single public method:

```typescript
record(entry: {
  action: EActivityAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}): void
```

- Fire-and-forget: the method is synchronous from the caller's perspective; the async write is initiated internally
- Never throws: all errors are caught and written to Pino; a logging failure never propagates to the business operation
- Constructs the full log row by merging `entry` with actor context from `RequestActorContext`

**Integration in command handlers — one line:**

```typescript
// After the business operation succeeds:
this.activityLog.record({
  action: EActivityAction.STOCK_ADDED,
  entityType: 'Inventory',
  entityId: inventoryId,
  metadata: { quantity, locationId, productName },
});
```

The handler never passes `userId`, `actorName`, `ipAddress`, or `userAgent` — the service resolves all of it automatically.

### 3. Module registration

`ActivityLogModule` exports `ActivityLogService` and `RequestActorContext`. Each feature module (`ProductsModule`, `SalesModule`, `InventoryModule`, etc.) adds `ActivityLogModule` to its `imports` array. NestJS handles the `REQUEST`-scoped lifecycle per module.

### 4. Auth events — special case

`auth.login` and `auth.logout` are logged directly inside the existing Clerk auth handlers where user identity is available from the token.

`auth.login_failed` is logged in the global exception filter when Clerk returns an authentication error, capturing the attempted email address in `metadata`.

### 5. API changes

**`GET /api/v1/activity-logs/list`** — server-side filters added:

| Query param | Type | Description |
|---|---|---|
| `action` | `string[]` | One or more `EActivityAction` values |
| `userId` | `string` | Filter to a specific staff member |
| `dateFrom` | `ISO string` | Start of date range |
| `dateTo` | `ISO string` | End of date range |
| `page` | `number` | 1-based page number (default: 1) |
| `limit` | `number` | Rows per page (default: 50, max: 50) |

Response includes `{ data: ActivityLogResponse[], total: number, page: number, totalPages: number }`.

**`POST /api/v1/activity-logs/export`** — new PDF export endpoint:

- Accepts same filter params as the list endpoint (at least one filter required)
- Queries up to 5,000 rows (hard cap)
- Renders via the existing Puppeteer service used for billing/purchase PDFs
- Returns `application/pdf` binary
- PDF filename: `activity-log-{dateFrom}-{dateTo}.pdf`

**`POST /api/v1/activity-logs`** — deleted.

---

## Frontend

### Page: `/activity-logs`

**File:** `renderer/src/pages/ActivityLogs/index.tsx` (rebuilt)

#### Toolbar

Three filters, all using `renderer/src/components/ui/dropdown-menu.tsx`:

**Event Type** (`DropdownMenuCheckboxItem`, multi-select, grouped by module via `DropdownMenuLabel`):
```
AUTHENTICATION          PRODUCTS
☑ Login                ☑ Product created
☑ Logout               ☑ Product updated
☑ Failed login         ...

INVENTORY / STOCK      SALES
☑ Stock added          ☑ Sale confirmed
☑ Stock removed        ☑ Sale voided
...                    ...
```

**Date Range** — From / To date pickers using the existing date input components.

**Staff Member** — Single-select dropdown of users in the org. "All staff" is the default.

Changing any filter resets to page 1. Active filters are shown as dismissible chips below the toolbar.

#### Table

Server-side pagination, 50 rows per page.

| When | Event | Module | Affected Record | Performed By |
|---|---|---|---|---|
| 3m ago | Stock Added | Inventory | #ITEM-78C91F | John Mwangi |
| Today, 2:34 PM | Sale Confirmed | Sales | #SALE-3A12F0 | Alice Kamau |

- `actorName` shown directly from the stored snapshot — no user lookup
- Friendly reference codes (UUID shortened to `#TYPE-XXXXXX`)
- Color-coded event badge per module (existing badge system kept)
- Relative + absolute timestamp (existing formatting kept)

Clicking a row opens the **detail drawer**:
- Activity Summary section
- Affected Record section
- Performed By (actorName, userId, ipAddress, userAgent)
- Metadata / changed fields (collapsed by default, expandable)
- Copy-to-clipboard for all reference IDs

#### Export PDF button

- Sits in the toolbar, right-aligned
- Disabled when no filters are active (tooltip: "Apply at least one filter to export")
- On click: calls `POST /api/v1/activity-logs/export` with current filter state, triggers browser file download
- Loading spinner on the button while the PDF is generating

**PDF layout:**
- Header: org name, "Activity Log", date range, "Generated by {actorName} on {date}"
- Table: same 5 columns as the UI
- Grouped by date (Today / Yesterday / specific date headings)
- Footer: page numbers (`Page N of M`)

### Deleted

- `renderer/src/pages/AuditLog/index.tsx` — file deleted
- `audit-log` module entry in `renderer/src/config/modules.ts` — removed
- `ActivityLogs` `createCreateOnlyResource` in `renderer/src/api.ts` — replaced with filtered query hook and export function

### API hooks (frontend)

```typescript
// replaces useListActivityLogs()
export function useActivityLogs(filters: ActivityLogFilters) {
  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: () => get<PaginatedResponse<ActivityLog>>('/api/v1/activity-logs/list', { params: filters }),
    staleTime: 30_000,
  });
}

export function exportActivityLogsPdf(filters: ActivityLogFilters): Promise<Blob> {
  return post<Blob>('/api/v1/activity-logs/export', filters, { responseType: 'blob' });
}
```

---

## What is NOT in scope

- Retention / archival policy — logs are kept indefinitely; a separate piece of work
- Alerting on suspicious activity (e.g. bulk deletes, off-hours access) — future work
- `org_activity_logs` table integration — the entity exists but wiring it up is out of scope here
- Role-based log visibility (staff seeing only their own logs) — all logs are admin-only for now
- Real-time / WebSocket feed — the 30-second `staleTime` on the query is sufficient for now
