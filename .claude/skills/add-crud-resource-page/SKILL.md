---
name: add-crud-resource-page
description: Use when adding a full create/edit/delete UI for a core-apis resource that has list+create+update+delete support (verify with verify-core-apis-capability first). Encodes the established Dialog/Select/ERPDataTable/useResourceMutations pattern from renderer/src/pages/Organizations.tsx so new pages stay consistent instead of re-deriving the pattern each time.
---

# Add a Full-CRUD Resource Page

Only use this for resources confirmed full-CRUD (list + create + update + delete) — check `docs/requirements.md` §2 or re-verify with the `verify-core-apis-capability` skill first. As of 2026-07-24 that's: Bills, Categories, Inventory, ItemReturns, Notifications, Organizations, PaymentTransactions, Products, PurchaseOrders, ReportGenerationLogs, Stores, Suppliers.

## Prerequisite: shared infrastructure

The plan at `docs/superpowers/plans/2026-07-23-phase1-crud-foundation.md` builds this once, reused by every resource page:
- `api.ts`: `put`/`del` helpers + `makeMutableResource<T>()` (adds `.create`/`.update`/`.remove` to a resource client).
- `components/ui/dialog.tsx`, `components/ui/select.tsx` — Radix wrappers.
- `components/ConfirmDialog.tsx` — delete confirmation.
- `hooks/useResourceMutations.ts` — wires `useMutation` + toast + cache invalidation for create/update/remove in one call.
- `components/ResourceSelect.tsx` — generic "pick a related record" dropdown (for foreign-key fields like `organization_id`).

If these don't exist yet in the codebase, build them first (that plan has copy-pasteable code for all of them) — don't duplicate ad hoc per-page.

## Pattern for one resource page

Reference implementation: `renderer/src/pages/Organizations.tsx` (or `Stores.tsx`/`Categories.tsx` for one with a `ResourceSelect`/`CategorySelect` foreign-key field).

1. **`api.ts`**: switch the resource's export from `makeResource<T>` to `makeMutableResource<T>`.
2. **New page file** `renderer/src/pages/<Resource>.tsx`:
   - `useState` for dialog open/closed, the record being edited (`null` = creating), form fields, delete target.
   - `useResourceMutations(<Resource>Api, '<queryKey>', '<Label>')` for create/update/remove.
   - `<ERPDataTable>` with `onAdd`/`onEdit`/`onDelete` wired to open the dialog/set delete target — **not left as inert buttons** (the bug this pattern exists to prevent: `ModulePage.tsx`'s generic table has `onAdd`/`onEdit` with no handler at all).
   - `<Dialog>` containing a plain `<form>` with `<Input>`/`<Select>`/`<ResourceSelect>` per field, submitting via `createMutation.mutate`/`updateMutation.mutate`.
   - `<ConfirmDialog>` for delete.
3. **`App.tsx`**: remove the resource's key from `GENERIC_KEYS`, import the new page, add its `<Route>` inside the `ProtectedRoute` layout route.

## Rules from the locked Phase 1 design decisions

- Fully dedicated page per resource — no generic form renderer.
- Foreign-key fields use `ResourceSelect` (flat) or `CategorySelect` (hierarchical, for `parent_id`-style trees).
- Where a field's enum/shape is unverified against the live API, mark it with `// TODO: verify against live API` rather than guessing silently.
- Mutation errors surface the real backend response body (`readErrorBody` in `api.ts`'s `put`/`del`/`post`) — never a generic "Something went wrong."
- No test framework in this repo. Verification is: `npx tsc -p renderer/tsconfig.json --noEmit` (zero errors) + manual smoke test with `npm run dev` (`VITE_DEV_BYPASS_AUTH=true`).
