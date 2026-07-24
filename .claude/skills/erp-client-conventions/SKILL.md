---
name: erp-client-conventions
description: Use whenever writing, reviewing, or planning code in this repo (core-erp-client) — tech stack, strict-TypeScript rules, the API-client/mutation pattern, error handling, and what's deliberately excluded (test framework, new dependencies, generic form renderer). Load this before erp-specific work starts; pair with verify-core-apis-capability and the add-*-resource-page skills for the actual build steps.
---

# ERP Client Conventions

This is the "how we build things here" reference for `core-erp-client`. It doesn't tell you how to build any specific page — see `verify-core-apis-capability`, `add-crud-resource-page`, `add-create-only-resource-page` for that. This is the stuff that applies everywhere.

## Stack

Electron desktop app. Renderer: React 19 + React Router 7 + TypeScript (strict) + TanStack Query 5 + Radix UI primitives + Tailwind v4 + `sonner` for toasts + `lucide-react` for icons. Main process: Node/Electron + `better-sqlite3` (local PIN accounts) + Clerk (`@clerk/clerk-js`) for cloud auth. Backend: `core-apis` (NestJS), source at `D:\WorkSpace\core-apis` (sibling repo), deployed at `https://core-apis-m03n.onrender.com` (Swagger: `/api/docs`).

## TypeScript is strict — treat it as a spec, not a suggestion

`renderer/tsconfig.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, target ES2022. Same expectation for the main-process `tsconfig.json`. A change isn't done until `npx tsc --noEmit` is clean on whichever tsconfig it touches — this project has no runtime test suite, so the type checker is the primary automated gate.

## The API client pattern

`renderer/src/api.ts` exports one client per resource via `makeResource<T>('/api/v1/<path>')`, which gives `.search()`/`.list()`/`.getById()`. There's a second factory, `makeMutableResource<T>()`, layered on top for resources that also support create/update/delete (built as part of Phase 1 — check whether it exists yet before assuming it). **Never hand-roll a `fetch`/`axios` call for a resource that already has (or should have) a client entry** — extend the factory pattern instead.

Before adding UI for any resource, run the `verify-core-apis-capability` skill (or check `docs/requirements.md` §2) to find out whether it's full-CRUD or create-only, then follow `add-crud-resource-page` or `add-create-only-resource-page` accordingly. Don't guess a resource's capability from `api.ts` or `types.ts` alone — both can be incomplete or stale.

## No generic form renderer

Each resource gets a dedicated page (`renderer/src/pages/<Resource>.tsx`) with a hand-written `Dialog` form. This was a deliberate architecture decision (locked 2026-07-23, see `docs/superpowers/specs/2026-07-23-erp-implementation-01-crud-foundation.md`), not an oversight — `ModulePage.tsx`'s generic dynamic-column table stays for anything not yet migrated, but new work doesn't add to it.

## Error handling

Surface the backend's real response body, verbatim, via `toast.error(...)`. Never collapse an error into a generic "Something went wrong" — that's the difference between a user who can act on a message and one who has to ask you what broke. Clerk errors specifically use the `error?.errors?.[0]?.longMessage || error?.message || fallback` chain already established in `Login.tsx`.

## No test framework — and don't add one

No jest/vitest/playwright is configured, and this isn't an oversight to "fix." Verification is `tsc --noEmit` (both tsconfigs, as applicable) plus manual click-through with `npm run dev` (`VITE_DEV_BYPASS_AUTH=true` to skip Clerk during local iteration). If a change is non-trivial (a branch, a parser, a money/security path), leave one runnable check — but that's a project convention for careful changes, not a mandate to bring in a test runner.

## Don't add dependencies

Every UI primitive needed so far (dialogs, selects, dropdowns, toasts, icons, charts, forms) is already installed. Reach for what's there before adding a package. If something genuinely isn't covered, say so explicitly and ask — don't add a dependency inside an unrelated task.

## Known pre-existing issues — tracked, not yours to silently fix

These are real, confirmed (not to be re-litigated), and scoped into Phase 0 (`docs/superpowers/plans/2026-07-24-self-signup.md`) unless you're specifically executing that phase:
- 14 dead `components/*View.tsx` files (`BillsView`, `CategoriesView`, `ChangePasswordView`, `DashboardView`, `InventoryView`, `NotificationsView`, `OrganizationsView`, `PaymentsView`, `ProductsView`, `PurchaseOrdersView`, `SetPinView`, `SettingsView`, `StoresView`, `SuppliersView`) — zero importers, safe to delete. `VehiclesView.tsx`/`VehicleDetailView.tsx` are NOT dead (still imported by `pages/VehiclesPage.tsx`/`pages/VehicleDetailPage.tsx`) — leave those two alone.
- `axios`, `express`, `cors`, `express-rate-limit`, `serialport`, `@electron/rebuild` in `package.json` — zero imports anywhere in `src/` or `renderer/src/`.
- `better-sqlite3` is imported in `src/main/database.ts` but missing from `package.json` dependencies (works today only because it's hoisted transitively — fragile).
- `IpcResult` type in `src/main/preload.ts` is declared and never used elsewhere in that file.
- Vehicles/Fleet screen runs entirely on in-memory mock data (`VehiclesView.tsx`'s `MOCK_STORE`) — no backend entity exists for it. **Decided 2026-07-24: leave as-is.** Do not "fix" it into a real API-backed screen without an explicit decision to do so — that would mean inventing a backend that doesn't exist.

## Source of truth hierarchy

When docs, `api.ts`/`types.ts`, and actual `core-apis` source disagree, source wins — always re-verify against `D:\WorkSpace\core-apis` (or the live Swagger docs if that path is ever unavailable) rather than trusting a prior spec doc. See `.claude/rules/lessons-learned.md` for why this rule exists: a same-day doc once claimed source-level verification and completed work that neither the source nor the working tree backed up.
