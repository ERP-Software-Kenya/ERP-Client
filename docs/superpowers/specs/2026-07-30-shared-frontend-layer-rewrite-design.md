# Shared Frontend Layer Rewrite — Design

**Date:** 2026-07-30
**Status:** Approved (sub-project 1 of 3 — see "Program context" below)

## Program context

This is the first of three sequential sub-projects toward "rebuild the full inventory section from scratch":

1. **Shared frontend layer rewrite** (this doc) — `api.ts`, `ERPDataTable`, `ResourceSelect`, `FormDrawer`, `useResourceMutations`, `components/ui/*`.
2. **Core-apis inventory endpoint audit** — verify/fix inventory, stock-movements, stock-transfers, unpublished-stock, product-logs controllers. Any backend fix is proposed to the user before being made — no unilateral core-apis changes.
3. **Inventory section pages rebuild** — Inventory, InventoryDetail, InventoryDashboard, StockMovements, StockTransfers, UnpublishedStock, ProductLogs — built on top of #1 and #2.

Each sub-project gets its own spec → plan → implementation cycle. This doc covers #1 only.

## Why

User wants the shared frontend layer rewritten with fresh code (no old files carried over), even though the current implementation is small (~800 lines total across 4 files) and has no known bugs. This was surfaced and confirmed explicitly — see conversation. Scope is deliberately app-wide: every page importing these modules is affected, not just inventory.

## Current state (verified by reading each file)

- `renderer/src/api.ts` (405 lines) — low-level `get/post/put/del` over `fetch`, plus `makeResource<T>`/`makeMutableResource<T>` factories returning plain objects (`search`, `list`, `getById`, `create`, `update`, `remove`) exported per resource (`Products`, `Inventory`, `Customers`, …), plus one-off functions for subresources (product images, product suppliers, stock movements ops, unpublished stock, product logs).
- `renderer/src/components/ERPDataTable.tsx` (215 lines) — generic table; owns its own `useQuery` internally keyed by a `queryKey` string and a `fetchData` prop; owns search debounce and pagination state; renders loading skeletons, empty state, error state, row actions (view/edit/delete gated on `isAdmin`).
- `renderer/src/components/ResourceSelect.tsx` (50 lines) — generic searchable-by-list-only select (Radix `Select`), owns its own `useQuery` for options.
- `renderer/src/components/FormDrawer.tsx` (123 lines) — slide-out drawer plus `Field`/`FormSection` layout helpers. Pure presentational, no data fetching.
- `renderer/src/hooks/useResourceMutations.ts` (46 lines) — wraps `create`/`update`/`remove` from a `MutableResourceApi<T>` in react-query mutations with toast + cache invalidation.
- `components/ui/{button,input,select,dialog,label,textarea}.tsx` — Radix-wrapped, Tailwind-styled primitives (cva variants).

**30 pages** import one or more of these: ActivityLogs, BillDetail, Bills, Categories, Customers, Expenses, Inventory, InventoryDetail, Invoices, ItemReturns, Locations, Notifications, Orders, OrgAddresses, Organizations, PaymentTransactions, PlatformConfigurations, ProductLogs, Products, PurchaseItems, PurchaseOrderDetail, PurchaseOrders, ReportGenerationLogs, Roles, StockMovements, StockTransfers, Stores, Suppliers, UnpublishedStock, UserAddresses, UserRoles, Users.

## Architecture

- **`lib/http.ts`** — the low-level `get/post/put/del` fetch wrapper, auth header injection, error-body parsing. Pure infra, no resource-specific knowledge. Direct rewrite of the current top half of `api.ts`, unchanged responsibility.
- **`lib/resource.ts`** — `createResource<T>(basePath, queryKey)` factory. Returns typed react-query hooks instead of plain async methods:
  - `useList()` → `useQuery` over `GET {basePath}/list`
  - `useSearch(params)` → `useQuery` over `GET {basePath}` with page/search, normalized to `{ items, total }`
  - `useGet(id)` → `useQuery` over `GET {basePath}/:id`
  - `useCreate()`, `useUpdate()`, `useDelete()` → `useMutation`, each auto-invalidating the resource's query key on success and toasting on error (folds in what `useResourceMutations` does today, so that hook is retired — its behavior moves into the factory).
  - One factory call per resource replaces today's `makeResource`/`makeMutableResource` call; subresource one-off functions (product images, product suppliers, stock-movements ops, unpublished-stock, product-logs) get their own small typed hooks alongside, same responsibilities as today.
- **`hooks/usePagination.ts`** — small hook holding `{ page, search, debouncedSearch }` + setters, replacing the pagination/search state currently duplicated inside `ERPDataTable`.
- **`components/DataTable.tsx`** (replaces `ERPDataTable.tsx`) — presentational only. Props: `rows`, `total`, `page`, `loading`, `error`, `columns`, `onPageChange`, `onSearchChange`, `onAdd?`, `onView?`, `onEdit?`, `onDelete?`, `isAdmin?`. No internal `useQuery`.
- **`components/ResourceSelect.tsx`** — rewritten on top of a resource's `useList()` hook instead of a raw `fetchList` prop.
- **`components/FormDrawer.tsx`** and **`components/ui/*`** — rewritten fresh, same responsibilities, no interface pressure since they're already presentational.

### Data flow example (`Products.tsx`)

```
const { page, search, setPage, setSearch } = usePagination();
const { data, isLoading, error } = Products.useSearch({ page, search });
const { useCreate, useUpdate, useDelete } = Products; // mutation hooks from the same factory

<DataTable
  rows={data?.items} total={data?.total} loading={isLoading} error={error}
  page={page} onPageChange={setPage} onSearchChange={setSearch}
  columns={...} onAdd={...} onEdit={...} onDelete={...}
/>
```

Every one of the 30 pages listed above migrates to this pattern in the same change — this is not incremental. A half-migrated state would leave some pages calling an API that no longer exists.

## Error handling

- Query errors (list/search/get) surface through react-query's `error` state, rendered by `DataTable`'s existing inline "Failed to load / Retry" block.
- Mutation errors (create/update/delete) surface via `sonner` toast, same as today — the error-body parsing in `lib/http.ts` (JSON `message`/`error`, else raw text) feeds the toast message.

## Rollout & verification

- Lands as one atomic change: rewritten shared files + all 30 pages updated together, since call-site shapes change.
- Fans out well across independent pages — a good fit for parallel subagents during implementation, each taking a batch of pages, once the shared files (`lib/http.ts`, `lib/resource.ts`, `usePagination.ts`, `DataTable.tsx`, `ResourceSelect.tsx`, `FormDrawer.tsx`, `ui/*`) land first.
- Primary gate: the project's typecheck script (`tsc --noEmit` or equivalent) — every page's props change, so a type error on any page means that page didn't migrate correctly.
- After typecheck passes: smoke-test the running app (`npm run dev`) against a paginated list page, a create/edit flow, and a `ResourceSelect` dropdown, to confirm real behavior rather than just types.

## Out of scope

- No behavior changes to any page beyond what's mechanically required by the new data-fetching pattern (no new columns, no new validation, no new features on non-inventory pages).
- No core-apis changes — this sub-project is frontend-only.
- No new dependencies — react-query, Radix, Tailwind, sonner, lucide-react are all already installed and stay as-is.
