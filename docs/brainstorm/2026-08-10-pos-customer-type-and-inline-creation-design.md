# POS billing: customer-type auto-fill + inline new-customer creation

Date: 2026-08-10
Repos touched: `core-apis`, `ERP-Client`

## Problem

In `POSTerminal.tsx` (billing screen), the cashier searches/selects a customer, and separately picks a "Customer Type" (regular/new/shop/big_customer) by hand on every bill — it's never derived from the customer being billed. There's also no way to register a brand-new customer from the billing screen itself: typing a name that matches nothing just becomes an untracked free-text walk-in.

Requested behavior: selecting/searching a customer should surface that customer's own type, and if the search finds no match, the cashier should be able to create the customer inline, using the same form as the standalone Customers page.

## Current state (verified in code)

- `Customer` entity (`core-apis/src/infrastructure/persistence/entities/customer.entity.ts`) has no type field — only `name/email/phone/gstin/creditLimit/creditBalance`.
- `Bill` entity has `customer_type` (`ECustomerType` enum: `regular | new | shop | big_customer`, defined inline in `bill.entity.ts`), set once per bill via the `CustomerTypeRow` dropdown in `POSTerminal.tsx`. It is not read from the customer record because the customer record has no such field.
- `POSTerminal.tsx` customer search (`Customers.useSearch`) already returns full `Customer` objects for the suggestions dropdown; selecting one only sets `customerId`/`customerInfo`, not `customerType`.
- No-match on customer search currently just leaves the typed text as a free-text walk-in name (`customerId` stays empty); there is no creation trigger anywhere in POS.
- The Customers page (`renderer/src/pages/Customers/index.tsx`) already has a full create/edit form (Name, Phone, Email, GSTIN, Credit Limit) via `FormDrawer`, which is a self-contained fixed-position overlay (`fixed inset-0 z-50`) — safe to render from anywhere, including POS.

## Decisions

- New-customer trigger: search returns zero matches (not an explicit always-on button).
- Customer type source: persisted on the `Customer` record itself (new backend column), not inferred from bill history.
- Creation form scope: the full existing field set (Name, Phone, Email, GSTIN, Credit Limit) plus the new Type field, embedded in POS — not a stripped-down quick-add.
- Walk-in (no customer record) stays available: the create prompt can be dismissed, and billing proceeds as free-text walk-in exactly as today.
- Default type for a freshly created customer: **"new"**, editable before saving.

## Design

### Part 1 — Backend (`core-apis`)

- Extract `ECustomerType` out of `bill.entity.ts` into its own `infrastructure/persistence/entities/e-customer-type.ts` (matches this repo's `Enum → e-[name].ts` convention). `bill.entity.ts` imports it from there instead of declaring it inline.
- Add `customer_type` (`type: 'enum', enum: ECustomerType, nullable: true`, no default) to `CustomerEntity`, via `npm run migration:generate` — nullable so existing customers stay unclassified instead of silently defaulting.
- Add `customerType?: ECustomerType` to: `Customer` domain model, `CreateCustomerRequest` → `CreateCustomerCommand`, `UpdateCustomerRequest` → `UpdateCustomerCommand`, `CustomerResponse`. The AutoMapper profile (`customer.profile.ts`) already maps these classes property-by-property, so no new `createMap` calls are needed — only the new field on each class.
- `search-customers` and `get-customer` already return the fully mapped `Customer`/`CustomerResponse`, so `customerType` is included automatically once it exists on those DTOs.

### Part 2 — Frontend shared component (`ERP-Client`)

- Extract the existing Add/Edit Customer form out of `Customers/index.tsx` into `renderer/src/components/CustomerFormDrawer.tsx`: a self-contained component owning its own form state and the create/update mutations.
  - Props: `open: boolean`, `onClose: () => void`, `editing?: Customer | null`, `initialName?: string` (prefill for the name field), `onSaved: (customer: Customer) => void`.
  - Adds a **Customer Type** field to the form — the same 4-option dropdown already used in `POSTerminal.tsx`'s `CustomerTypeRow` (regular/new/shop/big_customer). Defaults to `"new"` when opened with no `editing` record (fresh creation); otherwise defaults to the record's existing `customerType`.
- `Customers/index.tsx` is rewritten to render `<CustomerFormDrawer open={drawerOpen} editing={editing} onClose={closeDrawer} onSaved={closeDrawer} />` in place of its inline `FormDrawer`/`Field` markup — same behavior as today, less code in that file.
- `types.ts`: add `customerType?: CustomerType | string | null` to the `Customer` interface.

### Part 3 — POS integration (`POSTerminal.tsx`)

- **Auto-fill on selection:** when the cashier picks a customer from the search-suggestions dropdown, read `c.customerType` directly off that search result item (already present in the payload from Part 1/2 — no extra API call) and call `setCustomerType(c.customerType || "regular")` alongside the existing `setCustomerId`/`setCustomerInfo`. The `CustomerTypeRow` dropdown remains editable afterward — changing it only affects this bill, never rewrites the customer's stored record.
- **New-customer trigger:** when `debouncedCustomerInfo.trim().length >= 2 && !customerId` and `customerSearch.items` is empty, render a row in the same suggestions panel: `No customer found for "<text>" — + Create customer`.
- **Create flow:** clicking it opens `<CustomerFormDrawer open initialName={customerInfo.trim()} onClose={() => setShowCreateCustomer(false)} onSaved={handleCustomerCreated} />`.
  - `handleCustomerCreated(customer)`: `setCustomerId(customer.id)`, `setCustomerInfo(formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id }))`, `setCustomerType(customer.customerType || "new")`, `setShowCustomerSuggestions(false)`, close the drawer. Bill lines/qty/other state untouched.
- **Walk-in preserved:** dismissing the prompt (closing the drawer, or just continuing to type/click elsewhere) leaves `customerId` empty — sale proceeds as a free-text walk-in exactly as today.

## Out of scope

- Bulk reclassification of existing customers (their `customer_type` stays `null` until edited).
- Any change to how `Bill.customerType` itself is stored or used for pricing/reporting — this only changes where the *default* value for that per-bill field comes from.
- Deriving type from purchase history/analytics.

## Testing

- Backend: unit test for `CreateCustomerCommandHandler`/`UpdateCustomerCommandHandler` covering `customerType` round-trip through the mapper; migration tested against a fresh DB per this repo's migration discipline.
- Frontend: no existing test harness covers `POSTerminal.tsx` or `Customers/index.tsx` — manual verification in the running app (search-select auto-fills type; empty search shows create prompt; created customer is auto-selected and billing continues; dismissing the prompt still allows walk-in).
