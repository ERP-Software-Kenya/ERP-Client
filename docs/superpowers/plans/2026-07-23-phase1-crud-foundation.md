# Phase 1 — CRUD Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 12 full-CRUD-capable resources (Bills, Categories, Inventory, ItemReturns, Notifications, Organizations, PaymentTransactions, Products, PurchaseOrders, ReportGenerationLogs, Stores, Suppliers) working Add/Edit/Delete in the UI, backed by real `create`/`update`/`remove` calls against the live API, plus the shared Dialog/Select/ConfirmDialog/mutation-hook infrastructure every later phase (Inventory Transactions → Purchase → Sales) reuses.

**Architecture:** Extend `api.ts`'s resource factory with a `create`/`update`/`remove`-capable variant, attached only to the 12 resources that support it. Build four small reusable pieces (`ui/dialog.tsx`, `ui/select.tsx`, `ConfirmDialog.tsx`, `ResourceSelect.tsx`) plus a `useResourceMutations` hook that wires toast + cache-invalidation once. Each resource gets its own dedicated page file (existing `Products.tsx`/`Inventory.tsx` pattern) combining `ERPDataTable` (already built) with a hand-written Dialog form — no generic form renderer, per the locked Phase 1 design decision.

**Tech Stack:** React 19, TanStack Query 5, Radix UI (`react-dialog`, `react-select` — already installed), `sonner` for toasts (already mounted in `main.tsx`), Tailwind v4 with the existing shadcn-style CSS-variable theme in `renderer/src/index.css`. No new npm dependencies.

## Global Constraints

- **No test framework exists in this repo** (no vitest/jest, no test script in `package.json`). Verification per task is: (1) `npx tsc -p renderer/tsconfig.json --noEmit` must pass with zero errors, and (2) a manual smoke-test step in the running app (`npm run dev`, `VITE_DEV_BYPASS_AUTH=true` already set in `renderer/.env`). This matches the project's actual convention — `Products.tsx`/`Inventory.tsx` have no tests today either.
- TypeScript is `strict: true` with `noUnusedLocals`/`noUnusedParameters` (`renderer/tsconfig.json`) — no `any`, no unused imports/params.
- Use the existing Tailwind CSS-variable tokens already defined in `renderer/src/index.css` (`bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, etc.) and the existing `components/ui/button.tsx` / `input.tsx` / `label.tsx` — do not invent new color tokens. (Note: `ERPDataTable.tsx`'s own inline styles reference `var(--surface-1)`/`.btn`/`.erp-input`, which are **not** defined anywhere in this codebase — that's a pre-existing gap outside Phase 1 scope; don't fix it here, just don't copy the pattern into new code.)
- Toasts via `sonner`'s `toast` import (`toast.success(...)` / `toast.error(...)`) — already mounted globally in `renderer/src/main.tsx`.
- Mutation errors must surface the real backend response body text (per Phase 1 spec §4.5: "surface backend 400 error bodies verbatim... rather than guessing validation rules") — not a generic "Something went wrong."
- Where a field's enum/shape is unverified against the live API (PurchaseOrder.status, PaymentTransaction fields, Bill.status), mark it with a `// TODO: verify against live API` comment at the point of use, per the locked Phase 1 decision (spec §6) — don't block on it.
- Do not touch `renderer/src/pages/VehiclesPage.tsx`, `VehicleDetailPage.tsx`, or the `vehicles` nav entry — confirmed out of scope.
- Resource pages live in `renderer/src/pages/`; shared CRUD building blocks live in `renderer/src/components/` (`ui/` subfolder for primitive wrappers, top-level for app-specific composites like `ConfirmDialog`/`ResourceSelect`/`CategorySelect`).

---

## Task 1: `api.ts` — mutation helpers and the 12 full-CRUD resource exports

**Files:**
- Modify: `renderer/src/api.ts`

**Interfaces:**
- Produces: `put<T>(path, body): Promise<T>`, `del(path): Promise<void>` (exported alongside existing `get`/`post`). `makeMutableResource<T>(basePath)` returning `{ search, list, getById, create, update, remove }`. The 12 exports (`Bills`, `Categories`, `Inventory`, `ItemReturns`, `Notifications`, `Organizations`, `PaymentTransactions`, `Products`, `PurchaseOrders`, `ReportGenerationLogs`, `Stores`, `Suppliers`) now have `.create(body)`, `.update(id, body)`, `.remove(id)`. All other exports (`Customers`, `Expenses`, `PurchaseItems`, `Roles`, `StockMovements`, `StockTransfers`, `UserRoles`, `Users`, `ActivityLogs`, `Orders`, `Invoices`, `PlatformConfigurations`, `Vehicles`) are unchanged — no `.create`/`.update`/`.remove` exposed on them.

- [ ] **Step 1: Add `put`/`del` helpers with real error-body surfacing**

In `renderer/src/api.ts`, replace the existing `post<T>` function and the block after it with:

```ts
async function readErrorBody(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  if (!text) return `HTTP ${resp.status} — ${resp.statusText}`;
  try {
    const json = JSON.parse(text);
    return json.message || json.error || text;
  } catch {
    return text;
  }
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: 'POST',
    headers: await headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    throw new Error(await readErrorBody(resp));
  }
  return resp.json() as Promise<T>;
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: 'PUT',
    headers: await headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    throw new Error(await readErrorBody(resp));
  }
  return resp.json() as Promise<T>;
}

export async function del(path: string): Promise<void> {
  const resp = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: await headers(),
  });
  if (!resp.ok) {
    throw new Error(await readErrorBody(resp));
  }
}
```

- [ ] **Step 2: Add `makeMutableResource` next to `makeResource`**

Immediately after the existing `makeResource<T>` function definition, add:

```ts
function makeMutableResource<T extends { id: string }>(basePath: string) {
  const base = makeResource<T>(basePath);
  return {
    ...base,
    /** Create a new record */
    async create(body: Partial<T>): Promise<T> {
      return post<T>(basePath, body);
    },
    /** Update an existing record by id */
    async update(id: string, body: Partial<T>): Promise<T> {
      return put<T>(`${basePath}/${id}`, body);
    },
    /** Delete a record by id */
    async remove(id: string): Promise<void> {
      return del(`${basePath}/${id}`);
    },
  };
}
```

- [ ] **Step 3: Switch the 12 full-CRUD exports to `makeMutableResource`**

In the `// ── Exported resource clients ──` section, change these 12 lines from `makeResource<...>` to `makeMutableResource<...>` (leave every other export as `makeResource<...>`, unchanged):

```ts
export const Organizations      = makeMutableResource<Organization>('/api/v1/organizations');
export const Stores             = makeMutableResource<Store>('/api/v1/stores');
export const Categories         = makeMutableResource<Category>('/api/v1/categories');
export const Products           = makeMutableResource<Product>('/api/v1/products');
export const Inventory          = makeMutableResource<InventoryItem>('/api/v1/inventory');
export const Suppliers          = makeMutableResource<Supplier>('/api/v1/suppliers');
export const PurchaseOrders     = makeMutableResource<PurchaseOrder>('/api/v1/purchase-orders');
export const Bills              = makeMutableResource<Bill>('/api/v1/bills');
export const PaymentTransactions = makeMutableResource<PaymentTransaction>('/api/v1/payment-transactions');
export const Notifications      = makeMutableResource<Notification>('/api/v1/notifications');
export const ItemReturns        = makeMutableResource<ItemReturn>('/api/v1/item-returns');
export const ReportGenerationLogs = makeMutableResource<ReportGenerationLog>('/api/v1/report-generation-logs');
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/api.ts
git commit -m "feat: add create/update/remove mutation methods for full-CRUD resources"
```

---

## Task 2: `types.ts` — `PlatformUser` type and `ItemReturn` field additions

**Files:**
- Modify: `renderer/src/types.ts`

**Interfaces:**
- Produces: `PlatformUser` interface (distinct from the existing local `User` interface used for PIN-based operator accounts). Extended `ItemReturn` interface with `returnType`, `storeId`, `orderId`, `supplierId`.

- [ ] **Step 1: Add `PlatformUser`**

In `renderer/src/types.ts`, after the `PlatformConfiguration` interface (before the `// ── Fleet / Vehicles ──` section), add:

```ts
// ── Platform Users (backend /api/v1/users — distinct from the local PIN-based `User` above) ──

export interface PlatformUser {
  id: string;
  clerkUserId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  created_at?: string;
}
```

- [ ] **Step 2: Extend `ItemReturn`**

Replace the existing `ItemReturn` interface with:

```ts
export interface ItemReturn {
  id: string;
  return_number?: string;
  status?: string;
  total_amount?: number;
  // TODO: verify against live API — OpenAPI request schema (CreateItemReturnRequest) uses
  // camelCase (returnType/storeId/orderId/supplierId/totalAmount) while response fields above
  // are snake_case, matching the rest of this file. Confirm whether GET responses actually
  // return these fields in snake_case or camelCase before relying on them for display.
  returnType?: 'sales' | 'purchase';
  storeId?: string;
  orderId?: string;
  supplierId?: string;
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/types.ts
git commit -m "feat: add PlatformUser type and extend ItemReturn with request-schema fields"
```

---

## Task 3: `components/ui/dialog.tsx` — Radix Dialog wrapper

**Files:**
- Create: `renderer/src/components/ui/dialog.tsx`

**Interfaces:**
- Consumes: `cn` from `renderer/src/lib/utils.ts` (already exists, used by `ui/button.tsx`).
- Produces: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` — used by every resource page's create/edit form (Tasks 9+) and by `ConfirmDialog` (Task 5).

- [ ] **Step 1: Write the component**

```tsx
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
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} />;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/ui/dialog.tsx
git commit -m "feat: add Dialog primitive wrapper"
```

---

## Task 4: `components/ui/select.tsx` — Radix Select wrapper

**Files:**
- Create: `renderer/src/components/ui/select.tsx`

**Interfaces:**
- Consumes: `cn` from `renderer/src/lib/utils.ts`.
- Produces: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — used by every resource page's status/enum fields, and by `ResourceSelect`/`CategorySelect` (Tasks 7–8).

- [ ] **Step 1: Write the component**

```tsx
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
      className={cn(
        'z-50 max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md',
        className,
      )}
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

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/ui/select.tsx
git commit -m "feat: add Select primitive wrapper"
```

---

## Task 5: `components/ConfirmDialog.tsx` — generic delete confirmation

**Files:**
- Create: `renderer/src/components/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle` (Task 3), `Button` (`renderer/src/components/ui/button.tsx`, already exists).
- Produces: `ConfirmDialog` component with props `{ open, onOpenChange, title, description, onConfirm, confirmLabel?, isPending? }` — used by every resource page's delete action (Tasks 9+).

- [ ] **Step 1: Write the component**

```tsx
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Delete',
  isPending,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog for delete confirmations"
```

---

## Task 6: `hooks/useResourceMutations.ts` — shared create/update/remove wiring

**Files:**
- Create: `renderer/src/hooks/useResourceMutations.ts`

**Interfaces:**
- Consumes: `useMutation`, `useQueryClient` from `@tanstack/react-query` (already a dependency), `toast` from `sonner` (already a dependency).
- Produces: `useResourceMutations<T>(api, queryKey, label)` returning `{ createMutation, updateMutation, removeMutation }`, each a TanStack `useMutation` result with `.mutate`, `.isPending`. `createMutation.mutate(body, { onSuccess })`; `updateMutation.mutate({ id, body }, { onSuccess })`; `removeMutation.mutate(id, { onSuccess })`. Consumed by every resource page (Tasks 9+).

- [ ] **Step 1: Write the hook**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MutableResourceApi<T> {
  create(body: Partial<T>): Promise<T>;
  update(id: string, body: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export function useResourceMutations<T extends { id: string }>(
  api: MutableResourceApi<T>,
  queryKey: string,
  label: string,
) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: (body: Partial<T>) => api.create(body),
    onSuccess: () => {
      toast.success(`${label} created`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || `Failed to create ${label.toLowerCase()}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<T> }) => api.update(id, body),
    onSuccess: () => {
      toast.success(`${label} updated`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || `Failed to update ${label.toLowerCase()}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      toast.success(`${label} deleted`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || `Failed to delete ${label.toLowerCase()}`),
  });

  return { createMutation, updateMutation, removeMutation };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/hooks/useResourceMutations.ts
git commit -m "feat: add useResourceMutations hook for shared CRUD mutation wiring"
```

---

## Task 7: `components/ResourceSelect.tsx` — generic "pick a related record" dropdown

**Files:**
- Create: `renderer/src/components/ResourceSelect.tsx`

**Interfaces:**
- Consumes: `useQuery` from `@tanstack/react-query`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` (Task 4).
- Produces: `ResourceSelect<T>` component with props `{ queryKey, fetchList, getLabel, value, onValueChange, placeholder?, allowNone? }`. `value`/`onValueChange` deal in plain string ids — `''` means "none selected" (internally mapped to/from a `__none__` sentinel, since Radix `Select.Item` rejects an empty-string value). Used by PurchaseOrders (supplier/store), Bills (purchase order), Products (category — via `CategorySelect`, Task 8), Inventory (product/store), ItemReturns (store/supplier).

- [ ] **Step 1: Write the component**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const NONE_VALUE = '__none__';

interface ResourceSelectProps<T extends { id: string }> {
  queryKey: string;
  fetchList: () => Promise<T[]>;
  getLabel: (item: T) => string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
}

export function ResourceSelect<T extends { id: string }>({
  queryKey,
  fetchList,
  getLabel,
  value,
  onValueChange,
  placeholder,
  allowNone,
}: ResourceSelectProps<T>) {
  const { data } = useQuery({
    queryKey: [queryKey, 'options'],
    queryFn: fetchList,
    staleTime: 5 * 60 * 1000,
  });
  const items = data ?? [];

  return (
    <Select
      value={value || NONE_VALUE}
      onValueChange={(v) => onValueChange(v === NONE_VALUE ? '' : v)}
    >
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

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/ResourceSelect.tsx
git commit -m "feat: add ResourceSelect for related-record dropdowns"
```

---

## Task 8: `components/CategorySelect.tsx` — hierarchical category picker

**Files:**
- Create: `renderer/src/components/CategorySelect.tsx`

**Interfaces:**
- Consumes: `useQuery` from `@tanstack/react-query`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` (Task 4), `Categories` from `renderer/src/api.ts` (Task 1), `Category` type from `renderer/src/types.ts`.
- Produces: `CategorySelect` component with props `{ value, onValueChange, excludeId? }` — renders categories indented by depth so `parent_id` selection reflects real hierarchy (locked Phase 1 decision, spec §6). `excludeId` prevents a category from being offered as its own parent. Used by Categories page (Task 11, `parent_id`) and Products page (Task 12, `category_id`).

- [ ] **Step 1: Write the component**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Categories } from '../api';
import type { Category } from '../types';

const NONE_VALUE = '__none__';

function buildIndentedList(categories: Category[], excludeId?: string): { id: string; label: string }[] {
  const byParent = new Map<string | undefined, Category[]>();
  categories.forEach((c) => {
    const key = c.parent_id || undefined;
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
  const { data } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => Categories.list(),
    staleTime: 5 * 60 * 1000,
  });
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

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/CategorySelect.tsx
git commit -m "feat: add CategorySelect hierarchical picker"
```

---

## Task 9: Organizations page — full CRUD

**Files:**
- Create: `renderer/src/pages/Organizations.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `ERPDataTable`/`Column` (existing), `Organizations` API client (Task 1), `Dialog*` (Task 3), `Select*` (Task 4), `ConfirmDialog` (Task 5), `useResourceMutations` (Task 6), `Button`/`Input`/`Label` (existing), `Organization` type (existing).
- Produces: default-exported `Organizations` page component, routed at `/organizations`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Organizations as OrganizationsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Organization } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface FormState {
  name: string;
  code: string;
  email: string;
  phone: string;
  status: string;
}

const EMPTY_FORM: FormState = { name: '', code: '', email: '', phone: '', status: 'active' };

export default function Organizations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    OrganizationsApi,
    'organizations',
    'Organization',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Organization) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Organization> = {
      name: form.name,
      code: form.code || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Organization>[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Organizations"
        description="Manage organizations."
        queryKey="organizations"
        columns={columns}
        fetchData={(params) => OrganizationsApi.search(params)}
        searchPlaceholder="Search organizations…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-code">Code</Label>
              <Input id="org-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Email</Label>
              <Input
                id="org-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phone">Phone</Label>
              <Input id="org-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Organization"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

In `renderer/src/App.tsx`:
1. Remove `'organizations'` from the `GENERIC_KEYS` set.
2. Add `import Organizations from './pages/Organizations';` near the other page imports.
3. Add `<Route path="organizations" element={<Organizations />} />` next to the `products`/`inventory` routes (inside the `ProtectedRoute` layout route, before the `GENERIC_KEYS` map).

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
In the running app (dev-bypass auth), navigate to Organizations. Confirm: list loads, "Add" opens a dialog, submitting creates a row and shows a success toast, "Edit" pre-fills the dialog and updates on submit, "Delete" shows a confirm dialog and removes the row on confirm. Check the browser devtools Network tab to confirm real `POST`/`PUT`/`DELETE` requests are sent to `/api/v1/organizations`.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Organizations.tsx renderer/src/App.tsx
git commit -m "feat: add Organizations CRUD page"
```

---

## Task 10: Stores page — full CRUD

**Files:**
- Create: `renderer/src/pages/Stores.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `ResourceSelect` (Task 7) and `Organizations` API client (Task 1) for the optional `organization_id` field.
- Produces: default-exported `Stores` page, routed at `/stores`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Stores as StoresApi, Organizations as OrganizationsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Store } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface FormState {
  name: string;
  code: string;
  address: string;
  organization_id: string;
  status: string;
}

const EMPTY_FORM: FormState = { name: '', code: '', address: '', organization_id: '', status: 'active' };

export default function Stores() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(StoresApi, 'stores', 'Store');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Store) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      address: row.address ?? '',
      organization_id: row.organization_id ?? '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Store> = {
      name: form.name,
      code: form.code || undefined,
      address: form.address || undefined,
      organization_id: form.organization_id || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Store>[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'address', label: 'Address' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Stores / Warehouses"
        description="Manage store and warehouse locations."
        queryKey="stores"
        columns={columns}
        fetchData={(params) => StoresApi.search(params)}
        searchPlaceholder="Search stores…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Store' : 'Add Store'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Name</Label>
              <Input
                id="store-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-code">Code</Label>
              <Input id="store-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">Address</Label>
              <Input
                id="store-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <ResourceSelect
                queryKey="organizations"
                fetchList={() => OrganizationsApi.list()}
                getLabel={(org) => org.name}
                value={form.organization_id}
                onValueChange={(v) => setForm({ ...form, organization_id: v })}
                placeholder="Select organization…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Store"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'stores'` from `GENERIC_KEYS`, import `Stores` from `./pages/Stores`, add `<Route path="stores" element={<Stores />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Stores. Confirm Add/Edit/Delete work end-to-end, and the Organization dropdown populates from real data.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Stores.tsx renderer/src/App.tsx
git commit -m "feat: add Stores CRUD page"
```

---

## Task 11: Categories page — full CRUD with hierarchy picker

**Files:**
- Create: `renderer/src/pages/Categories.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `CategorySelect` (Task 8) for `parent_id`.
- Produces: default-exported `Categories` page, routed at `/categories`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategorySelect } from '../components/CategorySelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Categories as CategoriesApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Category } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface FormState {
  name: string;
  code: string;
  description: string;
  parent_id: string;
  status: string;
}

const EMPTY_FORM: FormState = { name: '', code: '', description: '', parent_id: '', status: 'active' };

export default function Categories() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    CategoriesApi,
    'categories',
    'Category',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Category) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      description: row.description ?? '',
      parent_id: row.parent_id ?? '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Category> = {
      name: form.name,
      code: form.code || undefined,
      description: form.description || undefined,
      parent_id: form.parent_id || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Category>[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Categories"
        description="Manage the product category hierarchy."
        queryKey="categories"
        columns={columns}
        fetchData={(params) => CategoriesApi.search(params)}
        searchPlaceholder="Search categories…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-code">Code</Label>
              <Input id="cat-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <CategorySelect
                value={form.parent_id}
                onValueChange={(v) => setForm({ ...form, parent_id: v })}
                excludeId={editing?.id}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'categories'` from `GENERIC_KEYS`, import `Categories` from `./pages/Categories`, add `<Route path="categories" element={<Categories />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Categories. Create a top-level category, then create a second category with the first as its parent — confirm the parent dropdown shows real hierarchy and the created child appears indented once reopening the picker. Confirm a category can't select itself as its own parent when editing.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Categories.tsx renderer/src/App.tsx
git commit -m "feat: add Categories CRUD page with hierarchy picker"
```

---

## Task 12: Products page — rewire to real CRUD

**Files:**
- Modify: `renderer/src/pages/Products.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `CategorySelect` (Task 8) for `category_id`. Already routed at `/products` in `App.tsx` — no routing change needed.
- Produces: default-exported `Products` page (replacing the current stub whose `onAdd`/`onEdit` are `console.log`).

- [ ] **Step 1: Rewrite the page**

Replace the full contents of `renderer/src/pages/Products.tsx` with:

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategorySelect } from '../components/CategorySelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Products as ProductsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Product } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface FormState {
  name: string;
  code: string;
  unit: string;
  unit_price: string;
  sku: string;
  barcode: string;
  category_id: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  unit: '',
  unit_price: '',
  sku: '',
  barcode: '',
  category_id: '',
  status: 'active',
};

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(ProductsApi, 'products', 'Product');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Product) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      unit: row.unit ?? '',
      unit_price: row.unit_price != null ? String(row.unit_price) : '',
      sku: row.sku ?? '',
      barcode: row.barcode ?? '',
      category_id: row.category_id ?? '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Product> = {
      name: form.name,
      code: form.code || undefined,
      unit: form.unit || undefined,
      unit_price: form.unit_price ? Number(form.unit_price) : undefined,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      category_id: form.category_id || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Product>[] = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    {
      key: 'unit_price',
      label: 'Price',
      render: (row) => `$${Number(row.unit_price || 0).toFixed(2)}`,
    },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Products"
        description="Manage your product catalog."
        queryKey="products"
        columns={columns}
        fetchData={(params) => ProductsApi.search(params)}
        searchPlaceholder="Search products…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-name">Name</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-code">Code</Label>
              <Input id="prod-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-sku">SKU</Label>
              <Input id="prod-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-barcode">Barcode</Label>
              <Input
                id="prod-barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-unit">Unit</Label>
              <Input
                id="prod-unit"
                placeholder="e.g. pcs, box, kg"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-price">Unit Price</Label>
              <Input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelect value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Navigate to Products. Confirm Add/Edit/Delete work end-to-end and the Category dropdown reflects the hierarchy built in Task 11.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/pages/Products.tsx
git commit -m "feat: wire Products page to real create/update/remove"
```

---

## Task 13: Suppliers page — full CRUD

**Files:**
- Create: `renderer/src/pages/Suppliers.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9.
- Produces: default-exported `Suppliers` page, routed at `/suppliers`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Suppliers as SuppliersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Supplier } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface FormState {
  name: string;
  code: string;
  email: string;
  phone: string;
  status: string;
}

const EMPTY_FORM: FormState = { name: '', code: '', email: '', phone: '', status: 'active' };

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    SuppliersApi,
    'suppliers',
    'Supplier',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Supplier) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Supplier> = {
      name: form.name,
      code: form.code || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Suppliers"
        description="Manage your suppliers."
        queryKey="suppliers"
        columns={columns}
        fetchData={(params) => SuppliersApi.search(params)}
        searchPlaceholder="Search suppliers…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sup-name">Name</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-code">Code</Label>
              <Input id="sup-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input id="sup-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Supplier"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'suppliers'` from `GENERIC_KEYS`, import `Suppliers` from `./pages/Suppliers`, add `<Route path="suppliers" element={<Suppliers />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Suppliers. Confirm Add/Edit/Delete work end-to-end.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Suppliers.tsx renderer/src/App.tsx
git commit -m "feat: add Suppliers CRUD page"
```

---

## Task 14: PurchaseOrders page — full CRUD (basic shell only, no line items)

**Files:**
- Create: `renderer/src/pages/PurchaseOrders.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `ResourceSelect` (Task 7), `Suppliers`/`Stores` API clients (Task 1).
- Produces: default-exported `PurchaseOrders` page, routed at `/purchase-orders`. Line items, linked Bills/Payments, and the full workflow are explicitly Phase 2 — this task is the PO shell CRUD only, per the locked scope in `docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md` §1.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PurchaseOrders as PurchaseOrdersApi, Suppliers as SuppliersApi, Stores as StoresApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { PurchaseOrder } from '../types';

// TODO: verify against live API — guessed from the dead legacy PurchaseOrdersView.tsx, not confirmed
// against a real POST /api/v1/purchase-orders response.
const STATUS_OPTIONS = ['pending', 'approved', 'received', 'cancelled'];

interface FormState {
  supplier_id: string;
  store_id: string;
  total_amount: string;
  status: string;
  ordered_at: string;
}

const EMPTY_FORM: FormState = { supplier_id: '', store_id: '', total_amount: '', status: 'pending', ordered_at: '' };

export default function PurchaseOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    PurchaseOrdersApi,
    'purchase-orders',
    'Purchase Order',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: PurchaseOrder) => {
    setEditing(row);
    setForm({
      supplier_id: row.supplier_id ?? '',
      store_id: row.store_id ?? '',
      total_amount: row.total_amount != null ? String(row.total_amount) : '',
      status: row.status ?? 'pending',
      ordered_at: row.ordered_at ? row.ordered_at.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<PurchaseOrder> = {
      supplier_id: form.supplier_id || undefined,
      store_id: form.store_id || undefined,
      total_amount: form.total_amount ? Number(form.total_amount) : undefined,
      status: form.status,
      ordered_at: form.ordered_at || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'supplier_id', label: 'Supplier' },
    { key: 'store_id', label: 'Store' },
    {
      key: 'total_amount',
      label: 'Total',
      render: (row) => `$${Number(row.total_amount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
    { key: 'ordered_at', label: 'Ordered At' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Purchase Orders"
        description="Manage purchase orders. Line items are added from a purchase order's detail view (Phase 2)."
        queryKey="purchase-orders"
        columns={columns}
        fetchData={(params) => PurchaseOrdersApi.search(params)}
        searchPlaceholder="Search purchase orders…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Purchase Order' : 'Add Purchase Order'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <ResourceSelect
                queryKey="suppliers"
                fetchList={() => SuppliersApi.list()}
                getLabel={(s) => s.name}
                value={form.supplier_id}
                onValueChange={(v) => setForm({ ...form, supplier_id: v })}
                placeholder="Select supplier…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.store_id}
                onValueChange={(v) => setForm({ ...form, store_id: v })}
                placeholder="Select store…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-total">Total Amount</Label>
              <Input
                id="po-total"
                type="number"
                step="0.01"
                min="0"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-ordered-at">Ordered At</Label>
              <Input
                id="po-ordered-at"
                type="date"
                value={form.ordered_at}
                onChange={(e) => setForm({ ...form, ordered_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Order"
        description="Delete this purchase order? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'purchase-orders'` from `GENERIC_KEYS`, import `PurchaseOrders` from `./pages/PurchaseOrders`, add `<Route path="purchase-orders" element={<PurchaseOrders />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Purchase Orders. Confirm Add/Edit/Delete work end-to-end. Toggle dev-bypass off, log in for real, and create one purchase order — record the raw response shape in a scratch note for Phase 2 (does it embed `items`?), per the verification strategy in the overview spec §8.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/PurchaseOrders.tsx renderer/src/App.tsx
git commit -m "feat: add PurchaseOrders CRUD page (shell only, no line items)"
```

---

## Task 15: Bills page — full CRUD

**Files:**
- Create: `renderer/src/pages/Bills.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `ResourceSelect` (Task 7), `PurchaseOrders` API client (Task 1) for the optional `purchase_order_id` link.
- Produces: default-exported `Bills` page, routed at `/bills`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Bills as BillsApi, PurchaseOrders as PurchaseOrdersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Bill } from '../types';

interface FormState {
  purchase_order_id: string;
  amount: string;
  due_date: string;
  status: string;
}

const EMPTY_FORM: FormState = { purchase_order_id: '', amount: '', due_date: '', status: '' };

export default function Bills() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(BillsApi, 'bills', 'Bill');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Bill) => {
    setEditing(row);
    setForm({
      purchase_order_id: row.purchase_order_id ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      due_date: row.due_date ? row.due_date.slice(0, 10) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Bill> = {
      purchase_order_id: form.purchase_order_id || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      due_date: form.due_date || undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Bill>[] = [
    { key: 'purchase_order_id', label: 'Purchase Order' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => `$${Number(row.amount || 0).toFixed(2)}`,
    },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Bills"
        description="Track bills and payment obligations. A purchase order link is optional — direct entry is supported."
        queryKey="bills"
        columns={columns}
        fetchData={(params) => BillsApi.search(params)}
        searchPlaceholder="Search bills…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Order (optional)</Label>
              <ResourceSelect
                queryKey="purchase-orders"
                fetchList={() => PurchaseOrdersApi.list()}
                getLabel={(po) => `PO ${po.id.slice(0, 8)} — ${po.status ?? 'unknown'}`}
                value={form.purchase_order_id}
                onValueChange={(v) => setForm({ ...form, purchase_order_id: v })}
                placeholder="No linked purchase order"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-amount">Amount</Label>
              <Input
                id="bill-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-due-date">Due Date</Label>
              <Input
                id="bill-due-date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              {/* TODO: verify against live API — Bill's real status enum isn't confirmed; free text
                  avoids guessing an unverified set of values. */}
              <Label htmlFor="bill-status">Status</Label>
              <Input
                id="bill-status"
                placeholder="e.g. unpaid"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Bill"
        description="Delete this bill? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'bills'` from `GENERIC_KEYS`, import `Bills` from `./pages/Bills`, add `<Route path="bills" element={<Bills />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Bills. Confirm Add/Edit/Delete work end-to-end, and a Bill can be created both with and without a linked Purchase Order.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Bills.tsx renderer/src/App.tsx
git commit -m "feat: add Bills CRUD page"
```

---

## Task 16: PaymentTransactions page — full CRUD

**Files:**
- Create: `renderer/src/pages/PaymentTransactions.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9.
- Produces: default-exported `PaymentTransactions` page, routed at `/payment-transactions`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PaymentTransactions as PaymentTransactionsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { PaymentTransaction } from '../types';

interface FormState {
  reference: string;
  type: string;
  amount: string;
  status: string;
}

const EMPTY_FORM: FormState = { reference: '', type: '', amount: '', status: '' };

export default function PaymentTransactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentTransaction | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PaymentTransaction | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    PaymentTransactionsApi,
    'payment-transactions',
    'Payment',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: PaymentTransaction) => {
    setEditing(row);
    setForm({
      reference: row.reference ?? '',
      type: row.type ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<PaymentTransaction> = {
      reference: form.reference || undefined,
      type: form.type || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<PaymentTransaction>[] = [
    { key: 'reference', label: 'Reference' },
    { key: 'type', label: 'Type' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => `$${Number(row.amount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Payment Transactions"
        description="Record payments. Linking a payment to a specific bill/invoice is Phase 2/3 (real link field names unverified — see spec)."
        queryKey="payment-transactions"
        columns={columns}
        fetchData={(params) => PaymentTransactionsApi.search(params)}
        searchPlaceholder="Search payments…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-reference">Reference</Label>
              <Input
                id="pay-reference"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              {/* TODO: verify against live API — real OpenAPI shape shows orgId/referenceId/referenceType/method,
                  richer than this. Confirm before Phase 2 needs to link payments to a specific Bill. */}
              <Label htmlFor="pay-type">Type</Label>
              <Input
                id="pay-type"
                placeholder="e.g. cash, card, bank_transfer"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-status">Status</Label>
              <Input
                id="pay-status"
                placeholder="e.g. completed"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Payment"
        description="Delete this payment record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'payment-transactions'` from `GENERIC_KEYS`, import `PaymentTransactions` from `./pages/PaymentTransactions`, add `<Route path="payment-transactions" element={<PaymentTransactions />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Payment Transactions. Confirm Add/Edit/Delete work end-to-end. Toggle dev-bypass off, log in for real, create one payment, and inspect the raw response for the real field names (`orgId`/`referenceId`/`referenceType`/`method`) — needed before Phase 2.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/PaymentTransactions.tsx renderer/src/App.tsx
git commit -m "feat: add PaymentTransactions CRUD page"
```

---

## Task 17: Inventory page — rewire to real CRUD (restricted edit fields)

**Files:**
- Modify: `renderer/src/pages/Inventory.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `ResourceSelect` (Task 7), `Products`/`Stores` API clients (Task 1). Already routed at `/inventory` — no routing change needed.
- Produces: default-exported `Inventory` page. Per the locked Phase 1 decision (spec §6): **create** form has full fields (`product_id`, `store_id`, `quantity`, `min_quantity`, `unit`, `status`); **edit** form only allows `min_quantity`/`status` — `quantity` is read-only until Phase 4 (Stock Movements) provides an audited adjustment path.

- [ ] **Step 1: Rewrite the page**

Replace the full contents of `renderer/src/pages/Inventory.tsx` with:

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Inventory as InventoryApi, Products as ProductsApi, Stores as StoresApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { InventoryItem } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface CreateFormState {
  product_id: string;
  store_id: string;
  quantity: string;
  min_quantity: string;
  unit: string;
  status: string;
}

interface EditFormState {
  min_quantity: string;
  status: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  product_id: '',
  store_id: '',
  quantity: '',
  min_quantity: '',
  unit: '',
  status: 'active',
};

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState<EditFormState>({ min_quantity: '', status: 'active' });
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    InventoryApi,
    'inventory',
    'Inventory item',
  );

  const openCreate = () => {
    setEditing(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: InventoryItem) => {
    setEditing(row);
    setEditForm({
      min_quantity: row.min_quantity != null ? String(row.min_quantity) : '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<InventoryItem> = {
      product_id: createForm.product_id || undefined,
      store_id: createForm.store_id || undefined,
      quantity: createForm.quantity ? Number(createForm.quantity) : undefined,
      min_quantity: createForm.min_quantity ? Number(createForm.min_quantity) : undefined,
      unit: createForm.unit || undefined,
      status: createForm.status,
    };
    createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const body: Partial<InventoryItem> = {
      min_quantity: editForm.min_quantity ? Number(editForm.min_quantity) : undefined,
      status: editForm.status,
    };
    updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'product',
      label: 'Product',
      render: (row) => String((row as unknown as { product_name?: string }).product_name || row.product_id || 'Unknown'),
    },
    {
      key: 'location',
      label: 'Location',
      render: (row) => String((row as unknown as { store_name?: string }).store_name || row.store_id || '—'),
    },
    { key: 'quantity', label: 'Quantity' },
    { key: 'min_quantity', label: 'Reorder Level' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const qty = row.quantity || 0;
        const minQty = row.min_quantity ?? 0;
        const isLow = qty < minQty;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isLow ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
            }`}
          >
            {isLow ? 'Low Stock' : row.status || 'In Stock'}
          </span>
        );
      },
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Inventory Management"
        description="Monitor stock balances across locations. Quantity changes go through Stock Movements (Phase 4)."
        queryKey="inventory"
        columns={columns}
        fetchData={(params) => InventoryApi.search(params)}
        searchPlaceholder="Search inventory…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      {!editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Balance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <ResourceSelect
                  queryKey="products"
                  fetchList={() => ProductsApi.list()}
                  getLabel={(p) => p.name}
                  value={createForm.product_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, product_id: v })}
                  placeholder="Select product…"
                />
              </div>
              <div className="space-y-2">
                <Label>Store</Label>
                <ResourceSelect
                  queryKey="stores"
                  fetchList={() => StoresApi.list()}
                  getLabel={(s) => s.name}
                  value={createForm.store_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, store_id: v })}
                  placeholder="Select store…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-quantity">Initial Quantity</Label>
                <Input
                  id="inv-quantity"
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-min-quantity">Reorder Level (min quantity)</Label>
                <Input
                  id="inv-min-quantity"
                  type="number"
                  min="0"
                  value={createForm.min_quantity}
                  onChange={(e) => setCreateForm({ ...createForm, min_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-unit">Unit</Label>
                <Input
                  id="inv-unit"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={createForm.status} onValueChange={(v) => setCreateForm({ ...createForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory Balance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Current Quantity (read-only — adjust via Stock Movements, Phase 4)</Label>
                <Input value={editing.quantity ?? 0} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-edit-min-quantity">Reorder Level (min quantity)</Label>
                <Input
                  id="inv-edit-min-quantity"
                  type="number"
                  min="0"
                  value={editForm.min_quantity}
                  onChange={(e) => setEditForm({ ...editForm, min_quantity: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Inventory Balance"
        description="Delete this inventory balance record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Navigate to Inventory. Confirm: create form has all fields including quantity; edit form only shows min-quantity/status with quantity displayed read-only; delete works.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/pages/Inventory.tsx
git commit -m "feat: wire Inventory page to real CRUD with restricted edit fields"
```

---

## Task 18: ItemReturns page — full CRUD

**Files:**
- Create: `renderer/src/pages/ItemReturns.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9, plus `ResourceSelect` (Task 7), `Stores`/`Suppliers` API clients (Task 1), extended `ItemReturn` type (Task 2).
- Produces: default-exported `ItemReturns` page, routed at `/item-returns`. `returnType` distinguishes Sales Return (Phase 3) vs Purchase Return (Phase 2) — both selectable here since the underlying resource is shared.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ItemReturns as ItemReturnsApi, Stores as StoresApi, Suppliers as SuppliersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { ItemReturn } from '../types';

const RETURN_TYPE_OPTIONS = ['sales', 'purchase'] as const;

interface FormState {
  returnType: string;
  storeId: string;
  supplierId: string;
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  returnType: 'purchase',
  storeId: '',
  supplierId: '',
  orderId: '',
  totalAmount: '',
  status: '',
};

export default function ItemReturns() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemReturn | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ItemReturn | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    ItemReturnsApi,
    'item-returns',
    'Item Return',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: ItemReturn) => {
    setEditing(row);
    setForm({
      returnType: row.returnType ?? 'purchase',
      storeId: row.storeId ?? '',
      supplierId: row.supplierId ?? '',
      orderId: row.orderId ?? '',
      totalAmount: row.total_amount != null ? String(row.total_amount) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<ItemReturn> = {
      returnType: form.returnType as ItemReturn['returnType'],
      storeId: form.storeId || undefined,
      supplierId: form.supplierId || undefined,
      orderId: form.orderId || undefined,
      total_amount: form.totalAmount ? Number(form.totalAmount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<ItemReturn>[] = [
    { key: 'return_number', label: 'Return #' },
    { key: 'returnType', label: 'Type' },
    {
      key: 'total_amount',
      label: 'Total',
      render: (row) => `$${Number(row.total_amount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Item Returns"
        description="Sales and purchase returns share this resource — select the type to distinguish them."
        queryKey="item-returns"
        columns={columns}
        fetchData={(params) => ItemReturnsApi.search(params)}
        searchPlaceholder="Search returns…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item Return' : 'Add Item Return'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Return Type</Label>
              <Select value={form.returnType} onValueChange={(v) => setForm({ ...form, returnType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.storeId}
                onValueChange={(v) => setForm({ ...form, storeId: v })}
                placeholder="Select store…"
                allowNone
              />
            </div>
            {form.returnType === 'purchase' && (
              <div className="space-y-2">
                <Label>Supplier</Label>
                <ResourceSelect
                  queryKey="suppliers"
                  fetchList={() => SuppliersApi.list()}
                  getLabel={(s) => s.name}
                  value={form.supplierId}
                  onValueChange={(v) => setForm({ ...form, supplierId: v })}
                  placeholder="Select supplier…"
                  allowNone
                />
              </div>
            )}
            <div className="space-y-2">
              {/* TODO: verify against live API — Phase 2 spec flags this may be PO-specific wording,
                  unclear if it accepts a purchase order id for returnType=purchase. */}
              <Label htmlFor="ret-order-id">Order / Purchase Order ID (optional)</Label>
              <Input
                id="ret-order-id"
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-total">Total Amount</Label>
              <Input
                id="ret-total"
                type="number"
                step="0.01"
                min="0"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-status">Status</Label>
              <Input
                id="ret-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Item Return"
        description="Delete this return record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'item-returns'` from `GENERIC_KEYS`, import `ItemReturns` from `./pages/ItemReturns`, add `<Route path="item-returns" element={<ItemReturns />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Item Returns. Confirm Add/Edit/Delete work end-to-end, and the Supplier field only appears when Return Type is "purchase".

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/ItemReturns.tsx renderer/src/App.tsx
git commit -m "feat: add ItemReturns CRUD page"
```

---

## Task 19: Notifications page — edit (mark read) + delete only, no Add

**Files:**
- Create: `renderer/src/pages/Notifications.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9 minus create. Per locked Phase 1 decision (spec §6): system-generated, no Add form.
- Produces: default-exported `Notifications` page, routed at `/notifications`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Notifications as NotificationsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Notification } from '../types';

export default function Notifications() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  // create is intentionally unused here — no Add form for this system-generated resource.
  const { updateMutation, removeMutation } = useResourceMutations(NotificationsApi, 'notifications', 'Notification');

  const openEdit = (row: Notification) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const toggleRead = () => {
    if (!editing) return;
    updateMutation.mutate(
      { id: editing.id, body: { read: !editing.read } },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  const columns: Column<Notification>[] = [
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'type', label: 'Type' },
    { key: 'read', label: 'Read', render: (row) => (row.read ? 'Yes' : 'No') },
    { key: 'created_at', label: 'Created' },
  ];

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Notifications"
        description="System-generated notifications. Mark as read or delete."
        queryKey="notifications"
        columns={columns}
        fetchData={(params) => NotificationsApi.search(params)}
        searchPlaceholder="Search notifications…"
        isAdmin={true}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.title ?? 'Notification'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{editing?.message}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={toggleRead} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : editing?.read ? 'Mark as Unread' : 'Mark as Read'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Notification"
        description="Delete this notification? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'notifications'` from `GENERIC_KEYS`, import `Notifications` from `./pages/Notifications`, add `<Route path="notifications" element={<Notifications />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Notifications. Confirm there is no Add button, Edit opens a dialog that toggles read/unread, and Delete works.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/Notifications.tsx renderer/src/App.tsx
git commit -m "feat: add Notifications page (mark-as-read + delete only)"
```

---

## Task 20: ReportGenerationLogs page — edit (status) + delete only, no Add

**Files:**
- Create: `renderer/src/pages/ReportGenerationLogs.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: same shared pieces as Task 9 minus create. Per locked Phase 1 decision (spec §6): system-generated, no Add form.
- Produces: default-exported `ReportGenerationLogs` page, routed at `/report-generation-logs`.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ReportGenerationLogs as ReportGenerationLogsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { ReportGenerationLog } from '../types';

export default function ReportGenerationLogs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReportGenerationLog | null>(null);
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReportGenerationLog | null>(null);

  const { updateMutation, removeMutation } = useResourceMutations(
    ReportGenerationLogsApi,
    'report-generation-logs',
    'Report log',
  );

  const openEdit = (row: ReportGenerationLog) => {
    setEditing(row);
    setStatus(row.status ?? '');
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, body: { status } }, { onSuccess: () => setDialogOpen(false) });
  };

  const columns: Column<ReportGenerationLog>[] = [
    { key: 'report_type', label: 'Report Type' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created' },
  ];

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Report Generation Logs"
        description="System-generated report job logs. Update status or delete."
        queryKey="report-generation-logs"
        columns={columns}
        fetchData={(params) => ReportGenerationLogsApi.search(params)}
        searchPlaceholder="Search report logs…"
        isAdmin={true}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report Log</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Input value={editing?.report_type ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-status">Status</Label>
              <Input id="log-status" value={status} onChange={(e) => setStatus(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Report Log"
        description="Delete this report log? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Remove `'report-generation-logs'` from `GENERIC_KEYS`, import `ReportGenerationLogs` from `./pages/ReportGenerationLogs`, add `<Route path="report-generation-logs" element={<ReportGenerationLogs />} />`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Navigate to Report Generation Logs. Confirm there is no Add button, Edit updates status, and Delete works.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/pages/ReportGenerationLogs.tsx renderer/src/App.tsx
git commit -m "feat: add ReportGenerationLogs page (status edit + delete only)"
```

---

## Task 21: Fix orphaned `Api.Users` wiring

**Files:**
- Modify: `renderer/src/api.ts`

**Interfaces:**
- Consumes: `PlatformUser` type (Task 2), `makeResource` (existing).
- Produces: `Users` export on `Api` — `ModulePage.tsx`'s `getApiClient('users')` (`renderer/src/pages/ModulePage.tsx:9-12`, unchanged) now resolves to a real client instead of `undefined`. `/api/v1/users` only supports create + get-by-id (per the capability matrix in the overview spec §4) — this stays on plain `makeResource`, not `makeMutableResource`; full Users screen build-out is Phase 5's job. This closes the "orphaned nav entry" gap noted in the overview spec §3, not a new dedicated page.

- [ ] **Step 1: Add the `Users` export**

In `renderer/src/api.ts`, add `PlatformUser` to the type import list:

```ts
import type {
  Organization,
  Store,
  Category,
  Product,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  Bill,
  PaymentTransaction,
  Notification,
  ItemReturn,
  ReportGenerationLog,
  StockMovement,
  StockTransfer,
  Order,
  Invoice,
  Customer,
  Expense,
  PurchaseItem,
  ActivityLog,
  Role,
  UserRole,
  PlatformConfiguration,
  PlatformUser,
  Vehicle,
} from './types';
```

Then add, next to the other `makeResource` exports (order doesn't matter, but keep it near `UserRoles`/`Roles` for readability):

```ts
export const Users = makeResource<PlatformUser>('/api/v1/users');
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Navigate to Admin → Users (still routed via the generic `ModulePage`, per the Phase 1 spec's "at minimum stop it from silently rendering empty" bar — Phase 5 builds the real dedicated screen). Confirm the page now attempts a real request (visible in Network tab or as a surfaced error) instead of finding no `apiClient` at all.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/api.ts
git commit -m "fix: wire orphaned Api.Users to the real /api/v1/users endpoint"
```

---

## Task 22: Delete dead `components/*View.tsx` files

**Files:**
- Delete: `renderer/src/components/BillsView.tsx`, `CategoriesView.tsx`, `InventoryView.tsx`, `NotificationsView.tsx`, `OrganizationsView.tsx`, `PaymentsView.tsx`, `ProductsView.tsx`, `PurchaseOrdersView.tsx`, `StoresView.tsx`, `SuppliersView.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing — pure deletion. Confirmed dead (not imported by `App.tsx` or anywhere else) per the overview spec §3 and §6. Note: `BillsView.tsx` and `ProductsView.tsx` currently carry a small uncommitted one-line fix each (`queryKey="bills"` / `queryKey="products"` added to their `ERPDataTable` call) from unrelated prior work in this working tree — those edits are lost on deletion, which is fine since the files are dead code with no route pointing at them.

- [ ] **Step 1: Delete the files**

```bash
git rm renderer/src/components/BillsView.tsx renderer/src/components/CategoriesView.tsx renderer/src/components/InventoryView.tsx renderer/src/components/NotificationsView.tsx renderer/src/components/OrganizationsView.tsx renderer/src/components/PaymentsView.tsx renderer/src/components/ProductsView.tsx renderer/src/components/PurchaseOrdersView.tsx renderer/src/components/StoresView.tsx renderer/src/components/SuppliersView.tsx
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0. (Confirms nothing else imported these files.)

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete dead components/*View.tsx files (unrouted legacy code)"
```

---

## Task 23: Final full-app verification pass

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–22.
- Produces: confirmation that Phase 1's "Done when" checklist (spec §7) is met.

- [ ] **Step 1: Full typecheck**

Run: `npx tsc -p renderer/tsconfig.json --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 2: Full app smoke test**

Run: `npm run dev` (dev-bypass auth on). Walk every one of the 12 resource screens (Organizations, Stores, Categories, Products, Suppliers, Purchase Orders, Bills, Payment Transactions, Inventory, Item Returns, Notifications, Report Generation Logs):
- Add (where applicable) creates a row and shows a success toast.
- Edit pre-fills correctly and updates the row.
- Delete asks for confirmation and removes the row.
- An intentionally invalid submission (e.g. omit a required field, or use dev tools to force a 400) surfaces the real backend error text in a toast, not a generic message.

- [ ] **Step 3: Confirm nav cleanup**

Open `renderer/src/App.tsx` and confirm `GENERIC_KEYS` no longer contains: `bills`, `categories`, `inventory` (was never in it), `item-returns`, `notifications`, `organizations`, `payment-transactions`, `purchase-orders`, `report-generation-logs`, `stores`, `suppliers`. Confirm it still contains the Phase 2–6 resources (`orders`, `invoices`, `customers`, `purchase-items`, `stock-movements`, `stock-transfers`, `expenses`, `reports`, `users`, `roles`, `user-roles`, `platform-configurations`, `activity-logs`) — those stay on the generic `ModulePage` until their own phases.

- [ ] **Step 4: Update the spec's "Done when" checklist**

In `docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md` §7, check off every completed box (all six, if Steps 1–3 above passed clean).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md
git commit -m "docs: mark Phase 1 CRUD Foundation done-when checklist complete"
```
