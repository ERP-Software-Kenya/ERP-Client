# Shared Frontend Layer Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `api.ts`, `ERPDataTable.tsx`, `ResourceSelect.tsx`, `FormDrawer.tsx`, `useResourceMutations.ts`, and `components/ui/*` with fresh code behind a typed-resource-hook architecture, then migrate every consuming file to the new pattern.

**Architecture:** A `createResource<T>(basePath, queryKey, label)` factory (in `lib/resource.ts`) returns typed react-query hooks (`useList`, `useSearch`, `useGet`, `useCreate`, `useUpdate`, `useDelete`) per entity. `DataTable` becomes presentational-only (no internal fetch), fed by a page-owned `useXxx().useSearch(...)` call plus a shared `usePagination()` hook for page/search state.

**Tech Stack:** React 19, TypeScript (strict), `@tanstack/react-query` 5, Radix UI primitives, Tailwind 4, `sonner` toasts, `lucide-react`. No new dependencies.

## Global Constraints

- No new npm dependencies — react-query, Radix, Tailwind, sonner, lucide-react already installed (`ERP-Client/package.json`).
- No changes to `core-apis` (backend) in this plan.
- No behavior changes beyond what the new data-fetching pattern mechanically requires — same columns, same validation, same toasts, same routes.
- Verification command for every task: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`.
- `renderer/tsconfig.json` has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — unused old imports left behind after a migration fail the typecheck.

---

## Program context

Sub-project 1 of 3 (see `docs/superpowers/specs/2026-07-30-shared-frontend-layer-rewrite-design.md`). Sub-project 3 (inventory pages) will fully rebuild `Inventory.tsx`, `InventoryDetail.tsx`, `pages/dashboards/InventoryDashboard.tsx`, `StockMovements.tsx`, `StockTransfers.tsx`, `UnpublishedStock.tsx`, `ProductLogs.tsx` from scratch. **This plan explicitly does not migrate those 7 files** — migrating them now would be thrown away when sub-project 3 replaces them wholesale. To keep them compiling in the meantime, `api.ts` keeps a clearly-labeled temporary legacy block (old-style async-method exports) for exactly the resources those 7 files use: `Inventory` (merged: new hooks + legacy methods), `StockTransfers` (legacy only), and the one-off functions for stock-movements, unpublished-stock, and product-logs. Sub-project 3 deletes this legacy block entirely.

## File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`)

**Rewritten shared infrastructure:**
- `renderer/src/lib/http.ts` — new
- `renderer/src/lib/resource.ts` — new
- `renderer/src/lib/utils.ts` — rewrite (trivial `cn` helper)
- `renderer/src/hooks/usePagination.ts` — new
- `renderer/src/hooks/useDebounce.ts` — rewrite (same behavior)
- `renderer/src/api.ts` — full rewrite
- `renderer/src/components/ui/{button,input,select,dialog,label,textarea}.tsx` — rewrite (mechanical, same behavior)
- `renderer/src/components/DataTable.tsx` — new, replaces `ERPDataTable.tsx`
- `renderer/src/components/ERPDataTable.tsx` — deleted
- `renderer/src/hooks/useResourceMutations.ts` — deleted (folded into `lib/resource.ts`)
- `renderer/src/components/ResourceSelect.tsx` — rewrite
- `renderer/src/components/FormDrawer.tsx` — rewrite (same behavior)
- `renderer/src/components/CategorySelect.tsx` — rewrite

**Consumers migrated to the new pattern (31 files):**
`pages/{ActivityLogs,BillDetail,Bills,Categories,Customers,Dashboard,Expenses,Invoices,ItemReturns,Locations,Notifications,Orders,OrgAddresses,Organizations,PaymentTransactions,PlatformConfigurations,Products,PurchaseItems,PurchaseOrderDetail,PurchaseOrders,ReportGenerationLogs,Roles,Stores,Suppliers,UserAddresses,UserRoles,Users}.tsx`, `pages/dashboards/{PurchaseDashboard,WarehouseDashboard}.tsx`, `components/VehiclesView.tsx`.

**Untouched (verified — do not need changes):**
- `context/AuthContext.tsx`, `services/auth.service.ts` — import `configureApi`/`get`/`post` from `../api`, which keep identical names/signatures (re-exported from `lib/http.ts`).
- `components/VehicleDetailView.tsx`, `components/ConfirmDialog.tsx`, `components/ImageLightbox.tsx` — don't import `../api` or the rewritten components' props in a way that changes.
- The 7 inventory-cluster files named above — out of scope for this plan (sub-project 3).

---

### Task 1: `lib/http.ts` — low-level fetch wrapper

**Files:**
- Create: `renderer/src/lib/http.ts`

**Interfaces:**
- Produces: `configureApi(baseUrl, getToken)`, `get<T>(path, params?)`, `post<T>(path, body?)`, `put<T>(path, body?)`, `del(path)`, `authHeader()` — all consumed by `lib/resource.ts` (Task 2) and re-exported unchanged from `api.ts` (Task 6) for `AuthContext.tsx`/`auth.service.ts`.

- [ ] **Step 1: Write the file**

```ts
// renderer/src/lib/http.ts
let _baseUrl = 'https://core-apis-m03n.onrender.com';
let _getToken: () => Promise<string | null> = async () => null;

/** Call once at startup. getToken is invoked fresh on every request (Clerk auto-refreshes). */
export function configureApi(baseUrl: string, getToken: () => Promise<string | null>): void {
  _baseUrl = baseUrl.replace(/\/$/, '');
  _getToken = getToken;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${_baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = await _getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonHeaders(): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json', ...(await authHeader()) };
}

async function readErrorBody(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  if (!text) return `HTTP ${resp.status} — ${resp.statusText}`;
  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message ?? json.error ?? text;
  } catch {
    return text;
  }
}

export async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const resp = await fetch(buildUrl(path, params), { headers: await jsonHeaders() });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return resp.json() as Promise<T>;
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: 'POST',
    headers: await jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return resp.json() as Promise<T>;
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: 'PUT',
    headers: await jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return resp.json() as Promise<T>;
}

export async function del(path: string): Promise<void> {
  const resp = await fetch(buildUrl(path), { method: 'DELETE', headers: await jsonHeaders() });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
}

export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(buildUrl(path), { method: 'POST', headers: await authHeader(), body: form });
  if (!resp.ok) throw new Error(await readErrorBody(resp));
  return resp.json() as Promise<T>;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no new errors attributable to `lib/http.ts` (existing errors from untouched `api.ts` are expected until Task 6).

- [ ] **Step 3: Commit**

```bash
git add renderer/src/lib/http.ts
git commit -m "feat: add lib/http.ts low-level fetch wrapper"
```

---

### Task 2: `lib/resource.ts` — typed resource-hook factory

**Files:**
- Create: `renderer/src/lib/resource.ts`

**Interfaces:**
- Consumes: `get`, `post`, `put`, `del` from `lib/http.ts` (Task 1).
- Produces: `createResource<T>(basePath, queryKey, label)` returning `{ useList, useSearch, useGet, useCreate, useUpdate, useDelete }`. `SearchParams` and the resolved search shape `{ items: T[]; total: number }` are consumed by `DataTable.tsx` (Task 4) and every migrated page.

- [ ] **Step 1: Write the file**

```ts
// renderer/src/lib/resource.ts
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { get, post, put, del, type QueryParams } from './http';
import type { PaginatedResponse } from '../types';

export interface SearchParams {
  page?: number;
  limit?: number;
  search?: string;
}

function toQuery(p?: SearchParams): QueryParams {
  return {
    $page: p?.page ?? 1,
    $perPage: p?.limit ?? 15,
    ...(p?.search ? { name: p.search } : {}),
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
}

function normalisePaginated<T>(raw: PaginatedResponse<T> | T[]): SearchResult<T> {
  if (Array.isArray(raw)) return { items: raw, total: raw.length };
  return { items: raw.items ?? [], total: raw.totalCount ?? 0 };
}

export function createResource<T extends { id: string }>(basePath: string, queryKey: string, label: string) {
  return {
    /** Flat list, uses the /list endpoint (falls back to a large page of the paginated endpoint). */
    useList(enabled = true): UseQueryResult<T[]> {
      return useQuery({
        queryKey: [queryKey, 'list'],
        queryFn: async () => {
          try {
            const raw = await get<T[]>(`${basePath}/list`);
            return Array.isArray(raw) ? raw : [];
          } catch {
            const paged = await get<PaginatedResponse<T> | T[]>(basePath, { $perPage: 100 });
            return Array.isArray(paged) ? paged : (paged.items ?? []);
          }
        },
        staleTime: 5 * 60 * 1000,
        enabled,
      });
    },

    /** Paginated search — resolves to { items, total }. */
    useSearch(params?: SearchParams) {
      return useQuery({
        queryKey: [queryKey, 'search', params?.page ?? 1, params?.limit ?? 15, params?.search ?? ''],
        queryFn: async () => normalisePaginated(await get<PaginatedResponse<T> | T[]>(basePath, toQuery(params))),
      });
    },

    /** Single record by id. Disabled while id is undefined (e.g. route param not yet resolved). */
    useGet(id: string | undefined): UseQueryResult<T> {
      return useQuery({
        queryKey: [queryKey, id],
        queryFn: () => get<T>(`${basePath}/${id as string}`),
        enabled: !!id,
      });
    },

    useCreate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (body: Partial<T>) => post<T>(basePath, body),
        onSuccess: () => {
          toast.success(`${label} created`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to create ${label.toLowerCase()}`),
      });
    },

    useUpdate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<T> }) => put<T>(`${basePath}/${id}`, body),
        onSuccess: () => {
          toast.success(`${label} updated`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to update ${label.toLowerCase()}`),
      });
    },

    useDelete() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => del(`${basePath}/${id}`),
        onSuccess: () => {
          toast.success(`${label} deleted`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to delete ${label.toLowerCase()}`),
      });
    },
  };
}

export type Resource<T extends { id: string }> = ReturnType<typeof createResource<T>>;
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no new errors from `lib/resource.ts`.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/lib/resource.ts
git commit -m "feat: add createResource typed-hook factory"
```

---

### Task 3: `hooks/usePagination.ts` and `hooks/useDebounce.ts`

**Files:**
- Create: `renderer/src/hooks/usePagination.ts`
- Modify (rewrite in place, same behavior): `renderer/src/hooks/useDebounce.ts`

**Interfaces:**
- Produces: `usePagination()` → `{ page, setPage, search, setSearch, debouncedSearch }`, consumed by `DataTable.tsx` (Task 4) and every migrated list page.

- [ ] **Step 1: Rewrite `useDebounce.ts`**

```ts
// renderer/src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 2: Write `usePagination.ts`**

```ts
// renderer/src/hooks/usePagination.ts
import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';

export function usePagination() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return { page, setPage, search, setSearch, debouncedSearch };
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no new errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/hooks/usePagination.ts renderer/src/hooks/useDebounce.ts
git commit -m "feat: add usePagination hook, rewrite useDebounce"
```

---

### Task 4: `components/DataTable.tsx` (replaces `ERPDataTable.tsx`)

**Files:**
- Create: `renderer/src/components/DataTable.tsx`
- Delete: `renderer/src/components/ERPDataTable.tsx` (after all consumers migrate — actually deleted in Task 26 cleanup, since consumers still import it until then)

**Interfaces:**
- Consumes: `Button`, `Input` from `components/ui/*` (Task 5), `cn` from `lib/utils` (Task 5).
- Produces: `Column<T>` type and `DataTable<T>` component — props `{ title, description?, columns, rows, total, page, loading, error?, onPageChange, onSearchChange, onRefetch?, onAdd?, onView?, onEdit?, onDelete?, isAdmin?, searchPlaceholder?, limit? }`. Consumed by every migrated list page starting Task 7.

- [ ] **Step 1: Write the file**

```tsx
// renderer/src/components/DataTable.tsx
import { useState } from 'react';
import { RefreshCw, Search, Plus, Trash2, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id: string }> {
  title: string;
  description?: string;
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  loading: boolean;
  error?: string | null;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onRefetch?: () => void;
  onAdd?: () => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isAdmin?: boolean;
  searchPlaceholder?: string;
  limit?: number;
}

function getCellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function DataTable<T extends { id: string }>({
  title,
  description,
  columns,
  rows,
  total,
  page,
  loading,
  error,
  onPageChange,
  onSearchChange,
  onRefetch,
  onAdd,
  onView,
  onEdit,
  onDelete,
  isAdmin,
  searchPlaceholder = 'Search…',
  limit = 15,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                onSearchChange(e.target.value);
              }}
              className="w-[220px] pl-9"
            />
          </div>
          {onRefetch && (
            <Button variant="ghost" size="icon" onClick={onRefetch} title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          )}
          {onAdd && isAdmin && (
            <Button size="sm" onClick={onAdd}>
              <Plus size={15} /> Add
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
        {error && (
          <div className="p-8 text-center text-destructive">
            <p>Failed to load: {error}</p>
            {onRefetch && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={onRefetch}>
                Retry
              </Button>
            )}
          </div>
        )}

        {!error && (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-4 py-2 text-left font-medium text-muted-foreground" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                {(onView || onEdit || onDelete) && isAdmin && <th className="w-[130px] px-4 py-2 text-left font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && rows.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-2">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                    {(onView || onEdit || onDelete) && isAdmin && (
                      <td className="px-4 py-2"><div className="h-4 w-[60px] animate-pulse rounded bg-muted" /></td>
                    )}
                  </tr>
                ))
              }

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-2">
                      {col.render ? col.render(row) : String(getCellValue(row, String(col.key)) ?? '—')}
                    </td>
                  ))}
                  {(onView || onEdit || onDelete) && isAdmin && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {onView && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(row)} title="View">
                            <Eye size={14} />
                          </Button>
                        )}
                        {onEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)} title="Edit">
                            <Pencil size={14} />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive')}
                            onClick={() => onDelete(row)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total > 0 ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : 'No results'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
            <ChevronLeft size={15} />
          </Button>
          <span className="min-w-[4rem] text-center">{page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Note: `onSearchChange` fires on every keystroke here (no internal debounce — that's `usePagination`'s job on the consuming page). This differs slightly from the old `ERPDataTable`, which debounced internally; debouncing now lives once in `usePagination` rather than duplicated per-table.

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: errors only from files not yet migrated (unrelated to this file itself — `DataTable.tsx` alone should have zero errors once Task 5's `ui/*` lands).

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/DataTable.tsx
git commit -m "feat: add presentational DataTable component"
```

---

### Task 5: `components/ui/*` and `lib/utils.ts` rewrite

**Files:**
- Modify (rewrite in place, identical behavior): `renderer/src/lib/utils.ts`, `renderer/src/components/ui/button.tsx`, `renderer/src/components/ui/input.tsx`, `renderer/src/components/ui/select.tsx`, `renderer/src/components/ui/dialog.tsx`, `renderer/src/components/ui/label.tsx`, `renderer/src/components/ui/textarea.tsx`

**Interfaces:**
- Produces: same exports as today — `cn`, `Button`/`buttonVariants`, `Input`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`/`DialogTrigger`, `Label`, `Textarea`. No prop or behavior changes — these are Radix wrappers with no identified issues, rewritten fresh per program scope.

- [ ] **Step 1: `lib/utils.ts`**

```ts
// renderer/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: `components/ui/button.tsx`**

```tsx
// renderer/src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';
```

- [ ] **Step 3: `components/ui/input.tsx`**

```tsx
// renderer/src/components/ui/input.tsx
import * as React from 'react';
import { cn } from '../../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';
```

- [ ] **Step 4: `components/ui/select.tsx`**

```tsx
// renderer/src/components/ui/select.tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown size={14} className="opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn('z-50 max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md', className)}
      position="popper"
      sideOffset={4}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
```

- [ ] **Step 5: `components/ui/dialog.tsx`**

```tsx
// renderer/src/components/ui/dialog.tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg max-h-[85vh] overflow-y-auto',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none">
        <X size={16} />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />;
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />);
DialogTitle.displayName = 'DialogTitle';

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} />;
}
```

- [ ] **Step 6: `components/ui/label.tsx`**

```tsx
// renderer/src/components/ui/label.tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const labelVariants = cva('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70');

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />);
Label.displayName = LabelPrimitive.Root.displayName;
```

- [ ] **Step 7: `components/ui/textarea.tsx`**

```tsx
// renderer/src/components/ui/textarea.tsx
import * as React from 'react';
import { cn } from '../../lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
```

- [ ] **Step 8: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no new errors from these 7 files.

- [ ] **Step 9: Commit**

```bash
git add renderer/src/lib/utils.ts renderer/src/components/ui
git commit -m "refactor: rewrite ui primitives and cn helper"
```

---

### Task 6: `api.ts` full rewrite

**Files:**
- Modify (full rewrite): `renderer/src/api.ts`

**Interfaces:**
- Consumes: `createResource` (Task 2), `get`/`post`/`put`/`del`/`configureApi`/`uploadForm` (Task 1).
- Produces: `configureApi`, `get`, `post`, `put`, `del` (re-exported, unchanged signatures, for `AuthContext.tsx`/`auth.service.ts`); resource bundles `Organizations`, `Stores`, `Categories`, `Products`, `Suppliers`, `PurchaseOrders`, `Bills`, `PaymentTransactions`, `Notifications`, `ItemReturns`, `ReportGenerationLogs`, `Orders`, `Invoices`, `Customers`, `Expenses`, `PurchaseItems`, `ActivityLogs`, `Roles`, `UserRoles`, `PlatformConfigurations`, `Users`, `Vehicles`, `Locations`, `OrgAddresses`, `UserAddresses` (each with `.useList/.useSearch/.useGet/.useCreate/.useUpdate/.useDelete`); Product subresource hooks `useProductImages`, `useUploadProductImage`, `useProductSuppliers`, `useLinkProductSupplier`, `useUpdateProductSupplier`, `useUnlinkProductSupplier`; Location image hooks `useUploadLocationImage`, `useRemoveLocationImage`; the temporary legacy block for `Inventory` (merged) and `StockTransfers` plus the stock-movements/unpublished-stock/product-logs one-off functions, copied verbatim from the current `api.ts` (unchanged — do not "improve" this block, sub-project 3 replaces it).

- [ ] **Step 1: Write the file**

```ts
// renderer/src/api.ts
export { configureApi, get, post, put, del } from './lib/http';
import { get, post, put, del, uploadForm } from './lib/http';
import { createResource } from './lib/resource';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Organization, Store, Category, Product, Supplier, PurchaseOrder, Bill, PaymentTransaction,
  Notification, ItemReturn, ReportGenerationLog, Order, Invoice, Customer, Expense, PurchaseItem,
  ActivityLog, Role, UserRole, PlatformConfiguration, PlatformUser, Vehicle, Location, OrgAddress,
  UserAddress, ProductImage, ProductSupplier,
  // legacy-block types (Inventory cluster, see bottom of file)
  InventoryItem, StockMovement, StockMovementOp, StockOperationBody, StockTransfer,
  UnpublishedStock, UnpublishedStockMovement, ProductLog, PaginatedResponse,
} from './types';

// ── New hook-based resources ───────────────────────────────────────────────────

export const Organizations = createResource<Organization>('/api/v1/organizations', 'organizations', 'Organization');
export const Stores = createResource<Store>('/api/v1/stores', 'stores', 'Store');
export const Categories = createResource<Category>('/api/v1/categories', 'categories', 'Category');
export const Products = createResource<Product>('/api/v1/products', 'products', 'Product');
export const Suppliers = createResource<Supplier>('/api/v1/suppliers', 'suppliers', 'Supplier');
export const PurchaseOrders = createResource<PurchaseOrder>('/api/v1/purchase-orders', 'purchase-orders', 'Purchase order');
export const Bills = createResource<Bill>('/api/v1/bills', 'bills', 'Bill');
export const PaymentTransactions = createResource<PaymentTransaction>('/api/v1/payment-transactions', 'payment-transactions', 'Payment');
export const Notifications = createResource<Notification>('/api/v1/notifications', 'notifications', 'Notification');
export const ItemReturns = createResource<ItemReturn>('/api/v1/item-returns', 'item-returns', 'Return');
export const ReportGenerationLogs = createResource<ReportGenerationLog>('/api/v1/report-generation-logs', 'report-generation-logs', 'Report log');
export const Orders = createResource<Order>('/api/v1/orders', 'orders', 'Order');
export const Invoices = createResource<Invoice>('/api/v1/invoices', 'invoices', 'Invoice');
export const Customers = createResource<Customer>('/api/v1/customers', 'customers', 'Customer');
export const Expenses = createResource<Expense>('/api/v1/expenses', 'expenses', 'Expense');
export const PurchaseItems = createResource<PurchaseItem>('/api/v1/purchase-items', 'purchase-items', 'Purchase item');
export const ActivityLogs = createResource<ActivityLog>('/api/v1/activity-logs', 'activity-logs', 'Activity log');
export const Roles = createResource<Role>('/api/v1/roles', 'roles', 'Role');
export const UserRoles = createResource<UserRole>('/api/v1/user-roles', 'user-roles', 'User role');
export const PlatformConfigurations = createResource<PlatformConfiguration>('/api/v1/platform-configurations', 'platform-configurations', 'Configuration');
export const Users = createResource<PlatformUser>('/api/v1/users', 'users', 'User');
export const Vehicles = createResource<Vehicle>('/api/v1/vehicles', 'vehicles', 'Vehicle');
export const Locations = createResource<Location>('/api/v1/locations', 'locations', 'Location');
export const OrgAddresses = createResource<OrgAddress>('/api/v1/org-addresses', 'org-addresses', 'Address');
export const UserAddresses = createResource<UserAddress>('/api/v1/user-addresses', 'user-addresses', 'Address');

// ── Product subresources (images, suppliers) ──────────────────────────────────

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'images'],
    queryFn: () => get<ProductImage[]>(`/api/v1/products/${productId}/images`),
    enabled: !!productId,
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<ProductImage>(`/api/v1/products/${productId}/images`, form);
    },
    onSuccess: (_result, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'images'] });
    },
  });
}

export function useProductSuppliers(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'suppliers'],
    queryFn: () => get<ProductSupplier[]>(`/api/v1/products/${productId}/suppliers`),
    enabled: !!productId,
  });
}

interface ProductSupplierLinkBody {
  supplierId: string;
  isDefault?: boolean;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
}

export function useLinkProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductSupplierLinkBody) => post<ProductSupplier>(`/api/v1/products/${productId}/suppliers`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

export function useUpdateProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: Omit<ProductSupplierLinkBody, 'supplierId'> }) =>
      put<ProductSupplier>(`/api/v1/products/${productId}/suppliers/${supplierId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

export function useUnlinkProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) => del(`/api/v1/products/${productId}/suppliers/${supplierId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

// ── Location image (single image; upload replaces) ────────────────────────────

export function useUploadLocationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, file }: { locationId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<Location>(`/api/v1/locations/${locationId}/image`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });
}

export function useRemoveLocationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => del(`/api/v1/locations/${locationId}/image`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });
}

// ── TEMPORARY LEGACY BLOCK — inventory cluster ────────────────────────────────
// Inventory.tsx, InventoryDetail.tsx, pages/dashboards/InventoryDashboard.tsx,
// StockMovements.tsx, StockTransfers.tsx, UnpublishedStock.tsx, ProductLogs.tsx
// still call these old-style async methods. Sub-project 3 rebuilds all seven
// pages AND deletes this entire block — do not extend it or build new
// features against it.

function legacySearch<T>(basePath: string) {
  return async (params?: { page?: number; limit?: number; search?: string }) => {
    const query = { $page: params?.page ?? 1, $perPage: params?.limit ?? 15, ...(params?.search ? { name: params.search } : {}) };
    const raw = await get<PaginatedResponse<T> | T[]>(basePath, query);
    if (Array.isArray(raw)) return { data: raw, total: raw.length };
    return { data: raw.items ?? [], total: raw.totalCount ?? 0 };
  };
}

export const Inventory = {
  ...createResource<InventoryItem>('/api/v1/inventory', 'inventory', 'Inventory item'),
  search: legacySearch<InventoryItem>('/api/v1/inventory'),
  list: async () => {
    try {
      const raw = await get<InventoryItem[]>('/api/v1/inventory/list');
      return Array.isArray(raw) ? raw : [];
    } catch {
      const paged = await get<PaginatedResponse<InventoryItem> | InventoryItem[]>('/api/v1/inventory', { $perPage: 100 });
      return Array.isArray(paged) ? paged : (paged.items ?? []);
    }
  },
  getById: (id: string) => get<InventoryItem>(`/api/v1/inventory/${id}`),
  create: (body: Partial<InventoryItem>) => post<InventoryItem>('/api/v1/inventory', body),
  update: (id: string, body: Partial<InventoryItem>) => put<InventoryItem>(`/api/v1/inventory/${id}`, body),
  remove: (id: string) => del(`/api/v1/inventory/${id}`),
};

export const StockTransfers = {
  search: legacySearch<StockTransfer>('/api/v1/stock-transfers'),
};

export async function getStockTransfer(id: string): Promise<StockTransfer> {
  return get<StockTransfer>(`/api/v1/stock-transfers/${id}`);
}

export async function completeStockTransfer(
  id: string,
  items: Array<{ fromInventoryId: string; toInventoryId: string; productId: string; fromLocationId: string; toLocationId: string; quantity: number }>,
): Promise<StockTransfer> {
  return put<StockTransfer>(`/api/v1/stock-transfers/${id}/complete`, { items });
}

export async function cancelStockTransfer(id: string): Promise<StockTransfer> {
  return put<StockTransfer>(`/api/v1/stock-transfers/${id}/cancel`, {});
}

export async function getStockMovement(id: string): Promise<StockMovement> {
  return get<StockMovement>(`/api/v1/stock-movements/${id}`);
}

export async function listStockMovementsByInventory(inventoryId: string): Promise<StockMovement[]> {
  return get<StockMovement[]>(`/api/v1/stock-movements/by-inventory/${inventoryId}`);
}

export async function performStockOperation(op: StockMovementOp, body: StockOperationBody): Promise<void> {
  await post<unknown>(`/api/v1/stock-movements/${op}`, body);
}

export async function getUnpublishedStock(id: string): Promise<UnpublishedStock> {
  return get<UnpublishedStock>(`/api/v1/unpublished-stock/${id}`);
}

export async function listUnpublishedStockMovements(unpublishedStockId: string): Promise<UnpublishedStockMovement[]> {
  return get<UnpublishedStockMovement[]>(`/api/v1/unpublished-stock/by-record/${unpublishedStockId}`);
}

export async function addUnpublishedStock(body: { locationId: string; productId: string; quantity: number; unitCost?: number; notes?: string }): Promise<void> {
  await post('/api/v1/unpublished-stock/add', body);
}

export async function publishUnpublishedStock(body: { unpublishedStockId: string; quantity: number; notes?: string }): Promise<void> {
  await post('/api/v1/unpublished-stock/publish', body);
}

export async function getProductLog(id: string): Promise<ProductLog> {
  return get<ProductLog>(`/api/v1/product-logs/${id}`);
}

export async function listProductLogsByProduct(productId: string): Promise<ProductLog[]> {
  const paged = await get<PaginatedResponse<ProductLog>>(`/api/v1/product-logs/by-product/${productId}`, { perPage: 100 });
  return paged.items ?? [];
}

export async function listProductLogsByInventory(inventoryId: string): Promise<ProductLog[]> {
  return get<ProductLog[]>(`/api/v1/product-logs/by-inventory/${inventoryId}`);
}

export async function getInventoryLowStock(): Promise<InventoryItem[]> {
  return get<InventoryItem[]>('/api/v1/inventory/low-stock');
}

export async function getInventoryValuation(): Promise<InventoryItem[]> {
  return get<InventoryItem[]>('/api/v1/inventory/valuation');
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: errors now appear in every not-yet-migrated consumer file (they import old exports like `ProductsApi.search`, `useResourceMutations`, `ERPDataTable` — all still importable since those files/hooks aren't deleted yet, but `ProductsApi.search` no longer exists since `Products` is now a hook bundle). This is expected until Tasks 7+ migrate each consumer. Confirm errors are confined to the consumer files listed in the File Inventory, not to `api.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/api.ts
git commit -m "refactor: rewrite api.ts on top of createResource hooks"
```

---

### Task 7: `components/ResourceSelect.tsx` and `components/CategorySelect.tsx` rewrite

**Files:**
- Modify (rewrite in place): `renderer/src/components/ResourceSelect.tsx`
- Modify (rewrite in place): `renderer/src/components/CategorySelect.tsx`

**Interfaces:**
- Consumes: any resource bundle's `.useList()` (Task 6).
- Produces: `ResourceSelect<T>` props change from `{ queryKey, fetchList, getLabel, value, onValueChange, placeholder?, allowNone? }` to `{ resource, getLabel, value, onValueChange, placeholder?, allowNone? }` where `resource` is anything with a `useList(enabled?)` method. Every page using `ResourceSelect` (Tasks 9+) drops its `queryKey`/`fetchList` props for a single `resource={X}` prop.

- [ ] **Step 1: `ResourceSelect.tsx`**

```tsx
// renderer/src/components/ResourceSelect.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const NONE_VALUE = '__none__';

interface ListResource<T> {
  useList(enabled?: boolean): { data?: T[] };
}

interface ResourceSelectProps<T extends { id: string }> {
  resource: ListResource<T>;
  getLabel: (item: T) => string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
}

export function ResourceSelect<T extends { id: string }>({
  resource,
  getLabel,
  value,
  onValueChange,
  placeholder,
  allowNone,
}: ResourceSelectProps<T>) {
  const { data } = resource.useList();
  const items = data ?? [];

  return (
    <Select value={value || NONE_VALUE} onValueChange={(v) => onValueChange(v === NONE_VALUE ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE_VALUE}>None</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {getLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: `CategorySelect.tsx`**

```tsx
// renderer/src/components/CategorySelect.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Categories } from '../api';
import type { Category } from '../types';

const NONE_VALUE = '__none__';

function buildIndentedList(categories: Category[], excludeId?: string): { id: string; label: string }[] {
  const byParent = new Map<string | undefined, Category[]>();
  categories.forEach((c) => {
    const key = c.parentId || undefined;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  });

  const result: { id: string; label: string }[] = [];
  function walk(parentId: string | undefined, depth: number) {
    for (const cat of byParent.get(parentId) ?? []) {
      if (cat.id === excludeId) continue;
      result.push({ id: cat.id, label: `${'— '.repeat(depth)}${cat.name}` });
      walk(cat.id, depth + 1);
    }
  }
  walk(undefined, 0);
  return result;
}

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  excludeId?: string;
}

export function CategorySelect({ value, onValueChange, excludeId }: CategorySelectProps) {
  const { data } = Categories.useList();
  const options = buildIndentedList(data ?? [], excludeId);

  return (
    <Select value={value || NONE_VALUE} onValueChange={(v) => onValueChange(v === NONE_VALUE ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder="No parent (top level)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>None (top level)</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: errors remain in pages still passing the old `queryKey`/`fetchList` props to `ResourceSelect` — resolved as each page migrates in Tasks 9+.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/ResourceSelect.tsx renderer/src/components/CategorySelect.tsx
git commit -m "refactor: rewrite ResourceSelect and CategorySelect on resource hooks"
```

---

### Task 8: `components/FormDrawer.tsx` rewrite

**Files:**
- Modify (rewrite in place, identical behavior): `renderer/src/components/FormDrawer.tsx`

**Interfaces:**
- Produces: same exports as today — `FormDrawer`, `Field`, `FormSection` — same props. No consumer changes needed for this file alone.

- [ ] **Step 1: Write the file**

```tsx
// renderer/src/components/FormDrawer.tsx
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}

export function FormDrawer({ open, onClose, title, subtitle, width = 520, children, footer }: FormDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border bg-card text-card-foreground shadow-2xl"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex flex-shrink-0 items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="flex flex-shrink-0 items-center gap-3 border-t border-border bg-muted/40 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormSection({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-4 rounded-lg border border-border p-4', className)}>
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`

```bash
git add renderer/src/components/FormDrawer.tsx
git commit -m "refactor: rewrite FormDrawer"
```

---

### Task 9: Migrate `Products.tsx` (reference implementation)

**Files:**
- Modify: `renderer/src/pages/Products.tsx`

**Interfaces:**
- Consumes: `Products`, `Suppliers` resource bundles, `useProductImages`, `useUploadProductImage`, `useProductSuppliers`, `useLinkProductSupplier`, `useUpdateProductSupplier`, `useUnlinkProductSupplier` (all from Task 6); `DataTable`, `Column` (Task 4); `ResourceSelect` (Task 7); `usePagination` (Task 3).

This is the most complex page (table + selects + create/update/delete + subresources) and establishes the pattern every later task cites as "the Products.tsx migration pattern."

**Migration algorithm (apply verbatim to every later page/component task):**
1. Replace `import { ERPDataTable, Column } from '../components/ERPDataTable'` → `import { DataTable, Column } from '../components/DataTable'`.
2. Drop `import { useResourceMutations } from '../hooks/useResourceMutations'`.
3. Add `import { usePagination } from '../hooks/usePagination'` if the page renders a `DataTable`.
4. Replace `const { createMutation, updateMutation, removeMutation } = useResourceMutations(XApi, 'x', 'X')` → `const createMutation = X.useCreate(); const updateMutation = X.useUpdate(); const removeMutation = X.useDelete();` (drop whichever of the three the page doesn't use).
5. Replace any local `useQuery({ queryFn: () => XApi.search(...) })` used to feed a table → `const { page, setPage, search, setSearch, debouncedSearch } = usePagination(); const { data, isLoading, error, refetch } = X.useSearch({ page, search: debouncedSearch });`.
6. Replace the `<ERPDataTable queryKey=... fetchData={(params) => XApi.search(params)} .../>` block → `<DataTable rows={data?.items ?? []} total={data?.total ?? 0} page={page} loading={isLoading} error={error ? String(error) : null} onPageChange={setPage} onSearchChange={setSearch} onRefetch={refetch} .../>` (keep every other prop — `title`, `description`, `columns`, `isAdmin`, `onAdd`, `onEdit`, `onDelete`, `searchPlaceholder` — unchanged).
7. Replace `<ResourceSelect queryKey="x" fetchList={() => XApi.list()} .../>` → `<ResourceSelect resource={X} .../>` (drop `queryKey`/`fetchList`, keep `getLabel`/`value`/`onValueChange`/`placeholder`/`allowNone`).
8. Replace any standalone `useQuery({ queryFn: () => XApi.getById(id!) })` → `X.useGet(id)`.
9. Replace any standalone `useQuery({ queryFn: () => XApi.list() })` → `X.useList()`.
10. Replace any standalone `useMutation({ mutationFn: (body) => XApi.create(body) })` → `X.useCreate()` (drop the manual `onSuccess`/`onError` — the hook already toasts and invalidates; if the page needs an extra side effect on success, e.g. closing a drawer, pass it as the second argument to `.mutate(body, { onSuccess: ... })`).

- [ ] **Step 1: Apply the algorithm to `Products.tsx`**

Replace lines 1–26 (imports) with:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategorySelect } from '../components/CategorySelect';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ImageLightbox } from '../components/ImageLightbox';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Products,
  Suppliers,
  useUploadProductImage,
  useProductImages,
  useProductSuppliers,
  useLinkProductSupplier,
  useUpdateProductSupplier,
  useUnlinkProductSupplier,
} from '../api';
import { usePagination } from '../hooks/usePagination';
import type { Product, ProductUnit } from '../types';
```

Replace line 101 (`const { createMutation, updateMutation, removeMutation } = useResourceMutations(ProductsApi, 'products', 'Product');`) with:

```tsx
  const createMutation = Products.useCreate();
  const updateMutation = Products.useUpdate();
  const removeMutation = Products.useDelete();
  const { page, setPage, search, setSearch, debouncedSearch } = usePagination();
  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } =
    Products.useSearch({ page, search: debouncedSearch });
```

Replace lines 103–107 (`images` query) with:

```tsx
  const { data: images } = useProductImages(editing?.id);
```

Replace lines 113–123 (`allSuppliers`, `productSuppliers` queries) with:

```tsx
  const { data: allSuppliers } = Suppliers.useList();
  const { data: productSuppliers } = useProductSuppliers(editing?.id);
```

Replace lines 125–157 (`invalidateSuppliers`, `linkSupplierMutation`, `updateSupplierLinkMutation`, `unlinkSupplierMutation`) with:

```tsx
  const linkSupplierMutation = useLinkProductSupplier(editing?.id);
  const updateSupplierLinkMutation = useUpdateProductSupplier(editing?.id);
  const unlinkSupplierMutation = useUnlinkProductSupplier(editing?.id);

  useEffect(() => {
    if (linkSupplierMutation.isSuccess) setSupplierForm(EMPTY_SUPPLIER_FORM);
  }, [linkSupplierMutation.isSuccess]);
  useEffect(() => {
    if (updateSupplierLinkMutation.isSuccess) setEditingLinkId(null);
  }, [updateSupplierLinkMutation.isSuccess]);
```

Replace the `uploadFiles` helper (lines 209–225) with a version built on the new mutation hook:

```tsx
  const uploadProductImageMutation = useUploadProductImage();

  const uploadFiles = async (productId: string, files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadProductImageMutation.mutateAsync({ productId, file });
      }
      toast.success(files.length === 1 ? 'Image uploaded' : `${files.length} images uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
```

Replace the `<ERPDataTable ... />` block (lines 313–324) with:

```tsx
      <DataTable
        title="Products"
        description="Manage your product catalog."
        columns={columns}
        rows={productsData?.items ?? []}
        total={productsData?.total ?? 0}
        page={page}
        loading={productsLoading}
        error={productsError ? String(productsError) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetchProducts()}
        searchPlaceholder="Search products…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />
```

Replace the `<ResourceSelect queryKey="suppliers" fetchList={() => SuppliersApi.list()} .../>` block (lines 639–646) with:

```tsx
                <ResourceSelect
                  resource={Suppliers}
                  getLabel={(s) => s.name}
                  value={supplierForm.supplierId}
                  onValueChange={(v) => setSupplierForm({ ...supplierForm, supplierId: v })}
                  placeholder="Select supplier to link…"
                />
```

Update the mutation call sites to the new signatures: `linkSupplierMutation.mutate({ supplierId, unitCost, leadTimeDays, minOrderQty, isDefault })` (unchanged shape), `updateSupplierLinkMutation.mutate({ supplierId, body: { ... } })` (unchanged shape), `unlinkSupplierMutation.mutate(supplierId)` (unchanged shape) — these three keep the exact call sites from the original file since `useLinkProductSupplier`/`useUpdateProductSupplier`/`useUnlinkProductSupplier` (Task 6) accept the same argument shapes as the old inline mutations.

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in `Products.tsx`.

- [ ] **Step 3: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev`
In the Electron window: open Products, confirm the table loads and paginates, search filters results, Add/Edit drawer opens and saves, supplier link/unlink works, image upload works, Delete confirms and removes a row.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/pages/Products.tsx
git commit -m "refactor: migrate Products.tsx to resource hooks (reference implementation)"
```

---

### Task 10: Migrate core CRUD list pages (ERPDataTable + useResourceMutations pattern)

**Files:**
- Modify: `renderer/src/pages/{Bills,Categories,Locations,Notifications,OrgAddresses,Organizations,PaymentTransactions,PurchaseOrders,ReportGenerationLogs,Stores,Suppliers,UserAddresses,ItemReturns}.tsx`

**Interfaces:**
- Consumes: same as Task 9 — apply the Task 9 Migration Algorithm to each file. Each row below gives the exact substitution (resource name, mutation set, extra `ResourceSelect` bindings) needed since these pages don't have Products.tsx's subresource complexity.

Apply steps 1–7 of the Task 9 algorithm to each file, with these per-file specifics (all verified via `grep -n` against the current files):

| File | Resource | Mutations used | Extra `ResourceSelect` bindings (old `queryKey` → new `resource`) |
|---|---|---|---|
| `Bills.tsx` | `Bills` | create, update, delete | — |
| `Categories.tsx` | `Categories` | create, update, delete | — |
| `Locations.tsx` | `Locations` | create, update, delete | — |
| `Notifications.tsx` | `Notifications` | update, delete (no create) | — |
| `OrgAddresses.tsx` | `OrgAddresses` | create, update, delete | `queryKey="organizations"` → `resource={Organizations}` |
| `Organizations.tsx` | `Organizations` | create, update, delete | — |
| `PaymentTransactions.tsx` | `PaymentTransactions` | create, update, delete | — |
| `PurchaseOrders.tsx` | `PurchaseOrders` | create, update, delete | — |
| `ReportGenerationLogs.tsx` | `ReportGenerationLogs` | update, delete (no create) | — |
| `Stores.tsx` | `Stores` | create, update, delete | `queryKey="organizations"` → `resource={Organizations}` |
| `Suppliers.tsx` | `Suppliers` | create, update, delete | — |
| `UserAddresses.tsx` | `UserAddresses` | create, update, delete | `queryKey="users"` → `resource={Users}` |
| `ItemReturns.tsx` | `ItemReturns` | create, update, delete | `queryKey="stores"`→`resource={Stores}`, `queryKey="suppliers"`→`resource={Suppliers}`, `queryKey="locations"`→`resource={Locations}`, `queryKey="products"`→`resource={Products}`, `queryKey="inventory"`→`resource={Inventory}` |

For a page with only `update`/`delete` (no `create`), `const updateMutation = X.useUpdate(); const removeMutation = X.useDelete();` — do not call `X.useCreate()` if the page has no create form (avoids an unused-variable typecheck failure per `noUnusedLocals`).

- [ ] **Step 1: Migrate each file per the table above, applying the Task 9 algorithm**

- [ ] **Step 2: Typecheck after each file** (or after the batch — either is fine since these files are independent of each other)

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in the 13 migrated files.

- [ ] **Step 3: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev`
Spot-check 3 of the 13 pages (e.g. Categories, Stores, ItemReturns): table loads/paginates/searches, add/edit/delete work, any `ResourceSelect` dropdowns populate.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/pages/{Bills,Categories,Locations,Notifications,OrgAddresses,Organizations,PaymentTransactions,PurchaseOrders,ReportGenerationLogs,Stores,Suppliers,UserAddresses,ItemReturns}.tsx
git commit -m "refactor: migrate core CRUD list pages to resource hooks"
```

---

### Task 11: Migrate create-only form pages (no table, just `useMutation` + optional `ResourceSelect`)

**Files:**
- Modify: `renderer/src/pages/{ActivityLogs,Customers,Expenses,Invoices,Orders,PlatformConfigurations,Roles,UserRoles}.tsx`

**Interfaces:**
- Consumes: apply steps 7 and 10 of the Task 9 algorithm (no `DataTable` on these pages — they're bare create forms). Each currently has `const createMutation = useMutation({ mutationFn: (body) => XApi.create(body), onSuccess: ..., onError: ... })`. Replace with `const createMutation = X.useCreate();` and, where the page needs a side effect beyond the built-in toast (closing its drawer, storing the created record), pass that as the second argument to `.mutate(body, { onSuccess: (created) => { ...page-specific side effect... } })` — do not delete page-specific `onSuccess` logic, only the toast/invalidate boilerplate that the hook now handles.

Per-file specifics (verified via `grep`):

| File | Resource | `ResourceSelect` bindings |
|---|---|---|
| `ActivityLogs.tsx` | `ActivityLogs` | `queryKey="organizations"` → `resource={Organizations}` |
| `Customers.tsx` | `Customers` | — |
| `Expenses.tsx` | `Expenses` | `queryKey="organizations"`→`resource={Organizations}`, `queryKey="stores"`→`resource={Stores}` |
| `Invoices.tsx` | `Invoices` | — |
| `Orders.tsx` | `Orders` | `queryKey="stores"` → `resource={Stores}` |
| `PlatformConfigurations.tsx` | `PlatformConfigurations` | — |
| `Roles.tsx` | `Roles` | `queryKey="organizations"` → `resource={Organizations}` |
| `UserRoles.tsx` | `UserRoles` | — |

- [ ] **Step 1: Migrate each file per the table above**

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in the 8 migrated files.

- [ ] **Step 3: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev`
Spot-check 2 of the 8 pages: open the create drawer, fill the form, submit, confirm the success toast and any dropdowns populate.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/pages/{ActivityLogs,Customers,Expenses,Invoices,Orders,PlatformConfigurations,Roles,UserRoles}.tsx
git commit -m "refactor: migrate create-only form pages to resource hooks"
```

---

### Task 12: Migrate `Users.tsx`

**Files:**
- Modify: `renderer/src/pages/Users.tsx`

**Interfaces:**
- Consumes: `Users.useCreate()`, `Organizations`/`Stores` via `ResourceSelect`. The `inviteMutation` (calls `AuthService.inviteMember`, unrelated to the resource-factory api client) is **not** part of this migration — leave it untouched.

- [ ] **Step 1: Replace the `createMutation` (lines 58–66) with `const createMutation = Users.useCreate();`, keeping the page's own `onSuccess` side effect (`setLastCreated`, `closeDrawer`, `setForm(EMPTY_FORM)`) passed as the second argument to `.mutate()` at the call site.**

- [ ] **Step 2: Replace the two `ResourceSelect` bindings** — `queryKey="organizations"` → `resource={Organizations}` (line 208), `queryKey="stores"` → `resource={Stores}` (line 218).

- [ ] **Step 3: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in `Users.tsx`.

- [ ] **Step 4: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev` — open Users, create a user, confirm the invite flow (unchanged) still works.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Users.tsx
git commit -m "refactor: migrate Users.tsx to resource hooks"
```

---

### Task 13: Migrate detail pages with nested queries (`BillDetail.tsx`, `PurchaseOrderDetail.tsx`, `PurchaseItems.tsx`, `Dashboard.tsx`)

**Files:**
- Modify: `renderer/src/pages/BillDetail.tsx`, `renderer/src/pages/PurchaseOrderDetail.tsx`, `renderer/src/pages/PurchaseItems.tsx`, `renderer/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `X.useGet(id)`, `X.useSearch(params)`, `X.useCreate()`, `ResourceSelect`.

- [ ] **Step 1: `BillDetail.tsx`**
  - Replace `useQuery({ queryKey: ['bills', id], queryFn: () => BillsApi.getById(id!), ... })` (lines 25–31) → `const { data: bill, isLoading, error } = Bills.useGet(id);`.
  - Replace `useQuery({ queryFn: () => PaymentTransactionsApi.search({ limit: 100 }) })` (lines 33–39) → `const { data: paymentsResult } = PaymentTransactions.useSearch({ limit: 100 });` (note: field is now `.items`, not `.data` — update any `paymentsResult.data` reads to `paymentsResult.items`).
  - Replace `createPaymentMutation` (`useMutation({ mutationFn: (body) => PaymentTransactionsApi.create(body), ... })`, lines 46+) → `const createPaymentMutation = PaymentTransactions.useCreate();`.

- [ ] **Step 2: `PurchaseOrderDetail.tsx`**
  - Replace `useQuery({ queryFn: () => PurchaseOrdersApi.getById(id!) })` (lines 30–36) → `const { data: po, isLoading, error } = PurchaseOrders.useGet(id);`.
  - Replace `createItemMutation` (`useMutation({ mutationFn: (body) => PurchaseItemsApi.create(body) })`, lines 40+) → `const createItemMutation = PurchaseItems.useCreate();`.
  - Replace `<ResourceSelect fetchList={() => ProductsApi.list()} .../>` (line 131–133) → `<ResourceSelect resource={Products} .../>`.

- [ ] **Step 3: `PurchaseItems.tsx`**
  - Replace `createMutation` (`useMutation({ mutationFn: (body) => PurchaseItemsApi.create(body) })`, line 32+) → `const createMutation = PurchaseItems.useCreate();`.
  - Replace `<ResourceSelect fetchList={() => PurchaseOrdersApi.list()} .../>` (line 96–97) → `resource={PurchaseOrders}`.
  - Replace `<ResourceSelect fetchList={() => ProductsApi.list()} .../>` (line 106–107) → `resource={Products}`.

- [ ] **Step 4: `Dashboard.tsx`**
  - Replace `useQuery({ queryFn: async () => (await ProductsApi.search({ limit: 1 })).total })` (lines 12–15) → `const { data: productsData, isLoading } = Products.useSearch({ limit: 1 }); const productTotal = productsData?.total;`.

- [ ] **Step 5: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in these 4 files.

- [ ] **Step 6: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev` — open a bill detail, a purchase order detail, the purchase items page, and the main dashboard; confirm each loads its data and forms submit.

- [ ] **Step 7: Commit**

```bash
git add renderer/src/pages/BillDetail.tsx renderer/src/pages/PurchaseOrderDetail.tsx renderer/src/pages/PurchaseItems.tsx renderer/src/pages/Dashboard.tsx
git commit -m "refactor: migrate detail/dashboard pages to resource hooks"
```

---

### Task 14: Migrate `pages/dashboards/{PurchaseDashboard,WarehouseDashboard}.tsx`

**Files:**
- Modify: `renderer/src/pages/dashboards/PurchaseDashboard.tsx`, `renderer/src/pages/dashboards/WarehouseDashboard.tsx`

**Interfaces:**
- Consumes: `X.useSearch({ limit: 1 })`.

- [ ] **Step 1: `PurchaseDashboard.tsx`** — replace the three `useQuery({ queryFn: () => PurchaseOrders.search({limit:1}) })` / `Bills.search` / `PaymentTransactions.search` calls (lines 20–34) with `PurchaseOrders.useSearch({ limit: 1 })`, `Bills.useSearch({ limit: 1 })`, `PaymentTransactions.useSearch({ limit: 1 })` respectively — drop the manual `queryKey`/`staleTime`, the hook already sets a stable key. `poData?.total` etc. reads are unchanged (still `.total` on the resolved value).

- [ ] **Step 2: `WarehouseDashboard.tsx`** — replace `useQuery({ queryFn: () => Stores.search({limit:1}) })` (lines 20–24) with `Stores.useSearch({ limit: 1 })`.

- [ ] **Step 3: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in these 2 files.

- [ ] **Step 4: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev` — open the Purchase and Warehouse dashboards, confirm stat cards render numbers (not "Not available").

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/dashboards/PurchaseDashboard.tsx renderer/src/pages/dashboards/WarehouseDashboard.tsx
git commit -m "refactor: migrate Purchase/Warehouse dashboards to resource hooks"
```

---

### Task 15: Migrate `components/VehiclesView.tsx`

**Files:**
- Modify: `renderer/src/components/VehiclesView.tsx`

**Interfaces:**
- Consumes: `Vehicles.useSearch({ limit: 50 })`.

- [ ] **Step 1: Replace the manual `useState`/`useCallback`/`useEffect` fetch (`loadVehicles`, calling `await Vehicles.search({ limit: 50 })` at line 441) with `const { data, isLoading } = Vehicles.useSearch({ limit: 50 }); const vehicles = data && data.items.length > 0 ? data.items : MOCK_STORE;`** — preserve the existing mock-data fallback behavior (falls back to `MOCK_STORE` when the API returns zero rows), drop the manual `loading`/`vehicles` state and the `loadVehicles`/`useEffect` wiring since react-query now owns this.

- [ ] **Step 2: Typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors in `VehiclesView.tsx`.

- [ ] **Step 3: Smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev` — open the Vehicles page, confirm the fleet table renders (real data or mock fallback).

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/VehiclesView.tsx
git commit -m "refactor: migrate VehiclesView to resource hooks"
```

---

### Task 16: Full-repo typecheck, cleanup, and final smoke test

**Files:**
- Delete: `renderer/src/components/ERPDataTable.tsx`
- Delete: `renderer/src/hooks/useResourceMutations.ts`

**Interfaces:** none — this is the final verification task confirming every consumer moved off the deleted files.

- [ ] **Step 1: Confirm nothing still imports the two files being deleted**

Run: `cd /home/hitarth/ERP/ERP-Client && grep -rl "ERPDataTable\|useResourceMutations" renderer/src`
Expected: no output (empty). If any file still matches, it was missed in Tasks 9–15 — migrate it before proceeding.

- [ ] **Step 2: Delete the two files**

```bash
git rm renderer/src/components/ERPDataTable.tsx renderer/src/hooks/useResourceMutations.ts
```

- [ ] **Step 3: Full-repo typecheck**

Run: `cd /home/hitarth/ERP/ERP-Client && npx tsc -p renderer/tsconfig.json --noEmit`
Expected: zero errors across the entire `renderer/src` tree.

- [ ] **Step 4: Full smoke test**

Run: `cd /home/hitarth/ERP/ERP-Client && npm run dev`
Walk every migrated page once (the 31 consumer files plus the 7 untouched inventory-cluster pages, to confirm the legacy block in `api.ts` kept them working): tables load/paginate/search, creates/edits/deletes succeed with toasts, all `ResourceSelect`/`CategorySelect` dropdowns populate, the Vehicles fleet view renders, both dashboards show real numbers.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove ERPDataTable and useResourceMutations after full migration"
```

---

## Self-review notes

- **Spec coverage:** every architecture element in the design spec (createResource factory, presentational DataTable, usePagination, error handling via react-query error state + sonner toasts, no new dependencies) has a corresponding task. The design spec's rollout note ("lands as one atomic change... good fit for parallel subagents") is realized as Tasks 9–15 being independent of each other once Tasks 1–8 land, so subagent-driven-development can dispatch them in parallel.
- **Scope correction from the spec:** the spec listed all 30 pages as in-migration-scope; this plan excludes the 7 inventory-cluster files (rebuilt from scratch in sub-project 3) and adds 3 files the spec's page-only grep missed (`pages/dashboards/{PurchaseDashboard,WarehouseDashboard}.tsx`, `components/VehiclesView.tsx`), found via a full-tree `grep -rl "from '../api'"`. This is a scope tightening, not a scope change — it avoids migrating code that gets deleted in sub-project 3, and it closes a gap the spec's narrower search didn't catch.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact line-range instruction with concrete resource/prop names drawn from `grep` against the current files.
- **Type consistency:** `SearchResult<T>` (`{ items, total }`) is defined once in `lib/resource.ts` (Task 2) and used identically in `DataTable.tsx` (Task 4, `rows={data?.items}` pattern), `api.ts` (Task 6), and every page task (Tasks 9–14). `Resource<T>` methods (`useList/useSearch/useGet/useCreate/useUpdate/useDelete`) are named identically everywhere they're referenced.
