---
name: add-create-only-resource-page
description: Use when adding UI for a core-apis resource that only supports create + get-by-id (no list, no update, no delete) — verify with verify-core-apis-capability first. Prevents building a fake table over an endpoint that structurally cannot list records.
---

# Add a Create-Only Resource Page

For resources confirmed create + get-by-id only — check `docs/requirements.md` §2 first. As of 2026-07-24 that's: ActivityLogs, Customers, Expenses, Invoices, Orders, PlatformConfigurations, PurchaseItems, Roles, StockMovements, StockTransfers, UserRoles, Users.

## Do not

Do not build an `ERPDataTable` or any list view for these. There is no API call that returns "all records" — a table here either renders permanently empty or requires a fragile client-side cache of every ID this session happened to create (a workaround, not a fix — see `docs/requirements.md` §3 point 3 and the Phase 2/3/4 specs' "no list endpoint" blockers for why this matters).

## What to build instead

1. **Create form** — same `Dialog` + form-field pattern as `add-crud-resource-page`, minus the table: a button that opens the create dialog directly (no `ERPDataTable` wrapper), using `<Resource>Api.create(body)` (via `makeResource`, not `makeMutableResource` — these don't get update/remove).
2. **Get-by-id detail view**, reachable only from somewhere that already has the ID — typically a relation on a full-CRUD resource (e.g. a Purchase Order detail screen linking to its `PurchaseItems` by ID it cached at creation time), not from a directory/nav entry with nothing to list.
3. **No edit/delete UI** — the backend doesn't support it. If a user needs to correct a mistake, that's a real workflow limitation of the current backend, not something to paper over client-side.

## Flag the gap, don't silently work around it

When this pattern blocks a real user need (e.g. Customers has no list, so there's no way to browse existing customers when creating an Order), name it explicitly as a backend ask rather than building an increasingly elaborate client-side workaround. The Phase 2/3/4/5 specs in `docs/superpowers/specs/` already enumerate the specific list-endpoint asks this creates — check there before re-deriving the same list.
