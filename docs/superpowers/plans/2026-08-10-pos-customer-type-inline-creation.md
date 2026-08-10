# POS customer-type auto-fill + inline creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selecting a customer in POS auto-fills the bill's Customer Type from that customer's own stored type; an empty search offers inline customer creation via the same form the Customers page uses.

**Architecture:** Backend adds a nullable `customer_type` column to `CustomerEntity` (via `npm run migration:generate`, following `ECustomerType` moved out of `bill.entity.ts` into its own `e-customer-type.ts`) and threads `customerType` through the Customer DTO/domain/command stack. Frontend extracts the existing Customers-page create/edit form into a reusable `CustomerFormDrawer`, adds a Type field to it, and wires POS to read `customerType` off search results and to open the drawer on a zero-result search.

**Tech Stack:** NestJS + CQRS + TypeORM + AutoMapper (`core-apis`), React + TanStack Query + Tailwind (`ERP-Client`).

**Design source:** `ERP-Client/docs/brainstorm/2026-08-10-pos-customer-type-and-inline-creation-design.md`

## Global Constraints

- `core-apis` migrations: only `npm run migration:generate` produces migration files — never hand-write one. Run only against a DB with all prior migrations applied (`npm run migration:up` first). Add the new file to `migrations/index.ts`.
- `core-apis` naming: enum file `e-[name].ts`, exported as `E[Name]`. `@AutoMap()` on every property added to Commands/Queries/domain models/DTOs. New `createMap` calls only where a genuinely new class pair is introduced — existing profile pairs pick up new fields automatically.
- `core-apis` file separation: one class per file (already satisfied — `e-customer-type.ts` holds only the enum).
- Frontend: reuse `FormDrawer`/`Field` (`renderer/src/components/FormDrawer.tsx`) — do not build a new overlay primitive. Reuse `formatEntityLabel`, `Customers.useCreate/useUpdate` from `renderer/src/api.ts`.
- Walk-in billing (no `customerId`) must keep working unchanged at every step.
- No bulk backfill of existing customers' `customer_type` — stays `null` until edited.

---

### Task 1: Backend — `customerType` on the Customer record

**Files:**
- Create: `core-apis/src/infrastructure/persistence/entities/e-customer-type.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/bill.entity.ts` (remove inline `ECustomerType`, import from new file)
- Modify: `core-apis/src/infrastructure/persistence/entities/customer.entity.ts` (add `customerType` column)
- Modify: `core-apis/src/infrastructure/persistence/entities/index.ts` (export new enum file)
- Modify: `core-apis/src/application/modules/customers/domain/customer.model.ts`
- Modify: `core-apis/src/application/modules/customers/models/requests/create-customer.request.ts`
- Modify: `core-apis/src/application/modules/customers/models/requests/update-customer.request.ts`
- Modify: `core-apis/src/application/modules/customers/models/responses/customer.response.ts`
- Modify: `core-apis/src/application/modules/customers/commands/create-customer/create-customer.command.ts`
- Modify: `core-apis/src/application/modules/customers/commands/update-customer/update-customer.command.ts`
- Create: `core-apis/src/infrastructure/persistence/migrations/<generated-timestamp>-migration.ts` (via CLI, not hand-written)
- Modify: `core-apis/src/infrastructure/persistence/migrations/index.ts` (barrel export for the generated file)
- Test: `core-apis/src/application/modules/customers/mapper/customer.profile.spec.ts`

**Interfaces:**
- Produces: `ECustomerType` (values `regular | new | shop | big_customer`) importable from `../../../../infrastructure/persistence/entities` (barrel) or directly from `e-customer-type.ts`.
- Produces: `Customer.customerType?: ECustomerType`, `CustomerResponse.customerType?: ECustomerType`, `CreateCustomerCommand.customerType?: ECustomerType`, `UpdateCustomerCommand.customerType?: ECustomerType` — consumed by Task 3 (frontend types mirror these as `CustomerType | string | null`, already declared in `renderer/src/types.ts:237,266`).

- [ ] **Step 1: Extract `ECustomerType` into its own file**

`core-apis/src/infrastructure/persistence/entities/e-customer-type.ts`:
```typescript
export enum ECustomerType {
  Regular     = 'regular',
  New         = 'new',
  Shop        = 'shop',
  BigCustomer = 'big_customer',
}
```

In `bill.entity.ts`, delete the inline `export enum ECustomerType { ... }` block (lines 47-52) and add:
```typescript
import { ECustomerType } from './e-customer-type';
```
Every other file that currently does `import { ECustomerType } from '.../bill.entity'` (or via the entities barrel) keeps working unchanged since the barrel re-exports both files.

Add to `entities/index.ts`: `export * from './e-customer-type';` (place near the other `e-*` export, alongside `export * from './e-core-table-name';`).

- [ ] **Step 2: Add the column to `CustomerEntity`**

In `customer.entity.ts`, import `ECustomerType` from `./e-customer-type` and add, after the `creditBalance` column:
```typescript
  @AutoMap(() => String)
  @Column({ name: 'customer_type', type: 'enum', enum: ECustomerType, nullable: true })
  public customerType?: ECustomerType;
```

- [ ] **Step 3: Thread `customerType` through the DTO/domain/command stack**

`customer.model.ts` — add after `creditBalance`:
```typescript
  @AutoMap(() => String) public customerType?: ECustomerType;
```
(import `ECustomerType` from `../../../../infrastructure/persistence/entities`)

`create-customer.request.ts` — add:
```typescript
  @ApiPropertyOptional({ enum: ECustomerType }) @IsOptional() @IsEnum(ECustomerType) @AutoMap(() => String) public customerType?: ECustomerType;
```
(add `IsEnum` to the `class-validator` import, add `ECustomerType` import from the entities barrel and `ApiPropertyOptional` already imported)

`update-customer.request.ts` — same field/decorators as above.

`customer.response.ts` — add:
```typescript
  @ApiPropertyOptional({ enum: ECustomerType }) @AutoMap(() => String) public customerType?: ECustomerType;
```

`create-customer.command.ts` — add `@AutoMap() public customerType?: ECustomerType;` (import from entities barrel).

`update-customer.command.ts` — add `@AutoMap() public customerType?: ECustomerType;`. (Note: this command is also missing `creditLimit` today — pre-existing gap, out of scope, do not fix here.)

No changes needed to `customer.profile.ts` — all six `createMap` pairs already registered; AutoMapper's default property-matching now copies the new field once it exists on both sides of each pair.

- [ ] **Step 4: Generate and apply the migration**

```bash
cd core-apis
createdb core_db 2>/dev/null || true   # only if it doesn't already exist
cat > .env <<'EOF'
DB_HOST=/var/run/postgresql
DB_PORT=5432
DB_USER=hitarth
DB_PASS=
DB_NAME=core_db
DB_SSL=false
EOF
npm run migration:up        # bring core_db to current head before diffing
npm run migration:generate  # after Steps 1-2 land — diffs entities vs DB, writes the new migration file
```
Expected generated DDL (verify against actual CLI output, don't hand-edit): a new enum type `core.customers_customer_type_enum` and `ALTER TABLE core.customers ADD "customer_type" ...`, mirroring the existing `bills_customer_type_enum` pattern in `1786301965722-migration.ts:48-49`.

Add the generated file to `migrations/index.ts` (`export * from './<timestamp>-migration';`), then:
```bash
npm run migration:up
```

- [ ] **Step 5: Mapper round-trip test**

`customer.profile.spec.ts`:
```typescript
import { Mapper } from '@automapper/core';
import { Test } from '@nestjs/testing';
import { AutomapperModule, getMapperToken } from '@automapper/nestjs';
import { classes } from '@automapper/classes';
import { CustomerProfile } from './customer.profile';
import { CreateCustomerCommand } from '../commands/create-customer';
import { UpdateCustomerCommand } from '../commands/update-customer';
import { Customer } from '../domain';
import { CustomerResponse } from '../models';
import { ECustomerType } from '../../../../infrastructure/persistence/entities';

describe('CustomerProfile', () => {
  let mapper: Mapper;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AutomapperModule.forRoot({ strategyInitializer: classes() })],
      providers: [CustomerProfile],
    }).compile();
    mapper = module.get<Mapper>(getMapperToken());
  });

  it('carries customerType from CreateCustomerCommand through to Customer', () => {
    const command = new CreateCustomerCommand();
    command.name = 'Test Co';
    command.customerType = ECustomerType.Shop;
    const customer = mapper.map(command, CreateCustomerCommand, Customer);
    expect(customer.customerType).toBe(ECustomerType.Shop);
  });

  it('carries customerType from UpdateCustomerCommand through to Customer', () => {
    const command = new UpdateCustomerCommand();
    command.customerType = ECustomerType.BigCustomer;
    const customer = mapper.map(command, UpdateCustomerCommand, Customer);
    expect(customer.customerType).toBe(ECustomerType.BigCustomer);
  });

  it('carries customerType from Customer through to CustomerResponse', () => {
    const customer = new Customer();
    customer.customerType = ECustomerType.New;
    const response = mapper.map(customer, Customer, CustomerResponse);
    expect(response.customerType).toBe(ECustomerType.New);
  });
});
```

Run: `npm test -- customer.profile.spec.ts`
Expected: 3 passing tests. If any fails with `undefined`, the field is missing `@AutoMap()` on one side of the pair — check Step 3.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add src/infrastructure/persistence/entities/e-customer-type.ts \
        src/infrastructure/persistence/entities/bill.entity.ts \
        src/infrastructure/persistence/entities/customer.entity.ts \
        src/infrastructure/persistence/entities/index.ts \
        src/infrastructure/persistence/migrations/ \
        src/application/modules/customers/
git commit -m "feat(customers): add customerType field to Customer record"
```
Do not `git add .env` — it's gitignored and holds only local dev DB config, no real secret.

---

### Task 2: Frontend — extract `CustomerFormDrawer`

**Files:**
- Create: `ERP-Client/renderer/src/components/CustomerFormDrawer.tsx`
- Modify: `ERP-Client/renderer/src/pages/Customers/index.tsx` (replace inline form with the new component)
- Modify: `ERP-Client/renderer/src/types.ts:486-497` (add `customerType` to the `Customer` interface)

**Interfaces:**
- Consumes: `Customers.useCreate()`, `Customers.useUpdate()` (`renderer/src/api.ts:208-231`, both already generic over `Customer`), `FormDrawer`/`Field` (`renderer/src/components/FormDrawer.tsx`), `CustomerType` (`renderer/src/types.ts:237`).
- Produces: `CustomerFormDrawer({ open, onClose, editing, initialName, onSaved })` — consumed by Task 3 in `POSTerminal.tsx`.

- [ ] **Step 1: Add `customerType` to the `Customer` type**

In `types.ts`, in the `Customer` interface (currently lines 486-497), add after `creditBalance`:
```typescript
  customerType?: CustomerType | string | null;
```
(`CustomerType` is already imported/declared at `types.ts:237` in the same file — no new import needed.)

- [ ] **Step 2: Write `CustomerFormDrawer`**

`renderer/src/components/CustomerFormDrawer.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Customers } from '../api';
import type { Customer, CustomerType } from '../types';

const CUSTOMER_TYPE_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: 'regular', label: 'Regular' },
  { value: 'new', label: 'New' },
  { value: 'shop', label: 'Shop' },
  { value: 'big_customer', label: 'Big Customer' },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  creditLimit: string;
  customerType: CustomerType;
}

function emptyForm(initialName?: string): FormState {
  return { name: initialName ?? '', email: '', phone: '', gstin: '', creditLimit: '', customerType: 'new' };
}

function formFromCustomer(customer: Customer): FormState {
  return {
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    gstin: customer.gstin ?? '',
    creditLimit: customer.creditLimit != null ? String(customer.creditLimit) : '',
    customerType: (customer.customerType as CustomerType) || 'regular',
  };
}

export interface CustomerFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editing?: Customer | null;
  initialName?: string;
  onSaved: (customer: Customer) => void;
}

export function CustomerFormDrawer({ open, onClose, editing, initialName, onSaved }: CustomerFormDrawerProps) {
  const [form, setForm] = useState<FormState>(() => (editing ? formFromCustomer(editing) : emptyForm(initialName)));
  const createMutation = Customers.useCreate();
  const updateMutation = Customers.useUpdate();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromCustomer(editing) : emptyForm(initialName));
  }, [open, editing, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const trimmedCreditLimit = form.creditLimit.trim();
    const body = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
      creditLimit: trimmedCreditLimit ? Number(trimmedCreditLimit) : undefined,
      customerType: form.customerType,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: (customer) => onSaved(customer) });
      return;
    }
    createMutation.mutate(body, { onSuccess: (customer) => onSaved(customer) });
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <Button type="submit" form="customer-form-drawer" disabled={isSaving || !form.name.trim()}>
            {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="customer-form-drawer" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="GSTIN">
          <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
        </Field>
        <Field label="Credit Limit">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.creditLimit}
            onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
          />
        </Field>
        <Field label="Customer Type">
          <select
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary"
          >
            {CUSTOMER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </FormDrawer>
  );
}
```

- [ ] **Step 3: Rewrite `Customers/index.tsx` to use it**

Remove `FormState`/`EMPTY_FORM`, the `form` state, `openCreate`/`openEdit`'s form-population, `handleSubmit`, `createMutation`/`updateMutation`, and the inline `<FormDrawer>...</FormDrawer>` block (`index.tsx:13-21,27,30-31,50-88,159-211`). Replace with:
```tsx
import { CustomerFormDrawer } from '../../components/CustomerFormDrawer';
// ... keep other imports; drop Field/FormDrawer import if no longer used elsewhere in this file, keep FormDrawer import removed, Field import removed
```
```tsx
const openCreate = () => {
  setEditing(null);
  setDrawerOpen(true);
};

const openEdit = (row: Customer) => {
  setEditing(row);
  setDrawerOpen(true);
};

const closeDrawer = () => setDrawerOpen(false);
```
```tsx
<CustomerFormDrawer
  open={drawerOpen}
  editing={editing}
  onClose={closeDrawer}
  onSaved={closeDrawer}
/>
```
Add a `customerType` column to the `columns` array (after `creditLimit`):
```tsx
{
  key: 'customerType',
  label: 'Type',
  render: (row) => row.customerType || '—',
},
```
Keep `viewData`/`ViewDrawer` as-is — it spreads the raw row, so `customerType` shows automatically once present on `Customer`.

- [ ] **Step 4: Manual verification**

Run the app (`npm run dev` or this repo's documented dev command), open Customers page:
- Create a customer with Type = "Shop" → row appears with Type "shop", editing it re-opens the drawer pre-filled to "shop".
- Edit an existing pre-existing (pre-migration) customer with no type → drawer defaults to "regular" (per `formFromCustomer` fallback), saving sets a real type.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/CustomerFormDrawer.tsx renderer/src/pages/Customers/index.tsx renderer/src/types.ts
git commit -m "refactor(customers): extract CustomerFormDrawer, add Customer Type field"
```

---

### Task 3: POS integration

**Files:**
- Modify: `ERP-Client/renderer/src/pages/pos/POSTerminal.tsx`

**Interfaces:**
- Consumes: `CustomerFormDrawer` (Task 2), `Customer.customerType` (Task 2), existing `customerSearch`, `customerId`, `customerInfo`, `customerType`, `showCustomerSuggestions` state (`POSTerminal.tsx:504-524,557-570`).

- [ ] **Step 1: Import `CustomerFormDrawer` and add creation-drawer state**

Add import: `import { CustomerFormDrawer } from "../../components/CustomerFormDrawer";`

Near the other POS state (after `showCustomerSuggestions` at line 522), add:
```typescript
const [showCreateCustomer, setShowCreateCustomer] = useState(false);
```

- [ ] **Step 2: Auto-fill `customerType` on selection**

In the suggestions-dropdown `onClick` handler (`POSTerminal.tsx:1636-1646`), add a `setCustomerType` call alongside the existing `setCustomerId`/`setCustomerInfo`:
```tsx
onClick={() => {
  setCustomerId(c.id);
  setCustomerInfo(
    formatEntityLabel({
      name: c.name,
      phone: c.phone,
      id: c.id,
    }),
  );
  setCustomerType((c.customerType as CustomerType) || "regular");
  setShowCustomerSuggestions(false);
}}
```
(`c` is already typed `Customer` in the `.map((c: Customer) => ...)` at line 1631, so `c.customerType` is available once Task 2 lands.)

- [ ] **Step 3: No-match create-customer row**

Replace the suggestions-block condition at `POSTerminal.tsx:1626-1659` (currently only renders when `customerSearch.items.length > 0`) so that it also renders a create-prompt row when the search is active but empty. Restructure to:
```tsx
{mode === "sales" &&
  showCustomerSuggestions &&
  !customerId &&
  debouncedCustomerInfo.trim().length >= 2 && (
    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
      {(customerSearch?.items ?? []).map((c: Customer) => (
        <button
          key={c.id}
          type="button"
          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-0"
          onClick={() => {
            setCustomerId(c.id);
            setCustomerInfo(
              formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }),
            );
            setCustomerType((c.customerType as CustomerType) || "regular");
            setShowCustomerSuggestions(false);
          }}
        >
          <span className="font-medium">{c.name || "Unnamed"}</span>
          {c.phone ? (
            <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>
          ) : null}
        </button>
      ))}
      {(customerSearch?.items?.length ?? 0) === 0 && (
        <button
          type="button"
          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
          onClick={() => {
            setShowCreateCustomer(true);
            setShowCustomerSuggestions(false);
          }}
        >
          No customer found for "{customerInfo.trim()}" — <span className="font-medium text-primary">+ Create customer</span>
        </button>
      )}
    </div>
  )}
```
This keeps every existing selection behavior (click a match → same as today) and adds the empty-state row. Walk-in stays available: if the cashier ignores the row and clicks elsewhere, `customerId` stays empty exactly as before.

- [ ] **Step 4: Wire the create-customer drawer**

After the customer-info block (after the closing of the `<div>` block ending around `POSTerminal.tsx:1660`, before the sibling elements that follow), add:
```tsx
{mode === "sales" && (
  <CustomerFormDrawer
    open={showCreateCustomer}
    initialName={customerInfo.trim()}
    onClose={() => setShowCreateCustomer(false)}
    onSaved={(customer) => {
      setCustomerId(customer.id);
      setCustomerInfo(
        formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id }),
      );
      setCustomerType((customer.customerType as CustomerType) || "new");
      setShowCreateCustomer(false);
    }}
  />
)}
```
Bill lines/qty/other state are untouched by this — `CustomerFormDrawer` only calls `onSaved` with the created `Customer`.

- [ ] **Step 5: Manual verification**

Run the app, open POS in sales mode:
- Search an existing customer by name → select it → Customer Type dropdown auto-updates to that customer's stored type (verify against the value set on that customer in Task 2's Customers page).
- Type a name matching nothing (≥2 chars) → "No customer found ... + Create customer" row appears → click it → drawer opens pre-filled with that name, Type defaulted to "new" → save → drawer closes, customer is auto-selected, `customerType` on the bill reflects "new" (or whatever was chosen in the drawer before saving).
- Dismiss the create-prompt (click elsewhere / press Escape) → `customerId` stays empty → complete a walk-in sale exactly as before this change.
- Existing credit-sale flow (`saleType === "credit"` requiring a selected customer) still works unaffected.

- [ ] **Step 6: Commit**

```bash
git add renderer/src/pages/pos/POSTerminal.tsx
git commit -m "feat(pos): auto-fill customer type on selection, inline customer creation on no-match"
```

---

## Self-Review

- **Spec coverage:** Backend column/DTO threading → Task 1. Shared form extraction + Type field → Task 2. Auto-fill on selection, no-match create row, create flow, walk-in preservation → Task 3 Steps 2-4. Testing strategy (mapper unit test + manual POS/Customers verification) → Task 1 Step 5, Task 2 Step 4, Task 3 Step 5. Out-of-scope items (bulk reclassification, Bill.customerType storage change, purchase-history derivation) are not touched by any task.
- **Placeholder scan:** no TBD/"add validation"/"similar to" — every step has literal code or an exact shell command.
- **Type consistency:** `ECustomerType` (backend) / `CustomerType` (frontend, pre-existing) used consistently; `CustomerFormDrawer` props (`open`, `onClose`, `editing`, `initialName`, `onSaved`) match between Task 2's definition and Task 3's usage.
