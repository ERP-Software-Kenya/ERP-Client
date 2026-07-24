# ERP Client Implementation — Overview & Index (v2)

**Status:** Active — **Date:** 2026-07-24
**Supersedes:** `2026-07-23-erp-implementation-00-overview.md`.
**Source of truth:** `docs/requirements.md` (this repo). That doc holds the capability matrix, backend roadmap, and open decisions — this file only indexes the phases and records what changed since 2026-07-23.

## What changed since the 2026-07-23 version

1. **Verification method upgraded, and independently re-checked twice.** The 07-23 overview verified the capability matrix against the *deployed* API's OpenAPI JSON. A same-day draft of this file claimed the matrix had been re-verified by reading `core-apis` source at `D:\byteb\core-apis\src` — but that path doesn't exist on this machine, so that claim was unverifiable at best. A later pass (2026-07-24, this session) found the real local checkout at `D:\WorkSpace\core-apis` and re-ran the source-level check (`@Get/@Post/@Put/@Delete` decorators per controller, cross-checked against each module's `queries/` folder for a `list-*` handler) for real. **Result: the matrix is correct.** The 12-resource full-CRUD list and the 12-resource create-only list are both confirmed from actual source. See `.claude/rules/lessons-learned.md` for the earlier false claim.
2. **Cleanup: NOT executed** (a same-day draft of this file wrongly claimed it was done). Of the 16 `components/*View.tsx` files, 14 are dead (verified: no imports anywhere) and still present — `VehiclesView.tsx`/`VehicleDetailView.tsx` are the other 2 and are correctly still in use (imported by `pages/VehiclesPage.tsx`/`pages/VehicleDetailPage.tsx`, per the Vehicles-stays-mock decision, item 3 below). `axios`, `express`, `cors`, `express-rate-limit`, `serialport`, and `@electron/rebuild`/the `rebuild` script are still in `package.json`. This work is scoped into **Phase 0** below, not done yet.
3. **Vehicles/Fleet — decided.** Confirmed 2026-07-24: leave exactly as-is (mock-data screen, no backend). Not a gap to fix this round.
4. **Self-signup: designed, NOT implemented** (a same-day draft of this file wrongly claimed it shipped). `docs/superpowers/specs/2026-07-24-self-signup-design.md` and `docs/superpowers/plans/2026-07-24-self-signup.md` exist and are ready to execute, but `Login.tsx` is still the original sign-in-only file. Promoted to **Phase 0** below.
5. **Two pre-existing, unrelated typecheck issues confirmed real** (verified directly, not inherited from the false draft): `src/main/database.ts` imports `better-sqlite3`, which isn't in `package.json` dependencies; `src/main/preload.ts` declares an `IpcResult` type used nowhere else in that file. Scoped into Phase 0 (cheap to fix while Phase 0 already gates on a clean `tsc --noEmit`).

## Phase index

| Phase | File | Status |
|---|---|---|
| 0 | `2026-07-24-self-signup-design.md` + `docs/superpowers/plans/2026-07-24-self-signup.md` | Designed and planned, **not executed**. Scope expanded (see below) to include dead-code cleanup and the two typecheck fixes from item 5 above. |
| 1 | `2026-07-23-erp-implementation-01-crud-foundation.md` | Spec unchanged, still accurate. **Implementation plan already written** (`docs/superpowers/plans/2026-07-23-phase1-crud-foundation.md`, 12 tasks, not yet executed). Includes the `reports`→`ReportGenerationLogs` nav repoint and the minimal `Users` create+detail screen (§3 of `docs/requirements.md`). |
| 2 | `2026-07-23-erp-implementation-02-purchase-module.md` | Spec unchanged, still accurate. No implementation plan written yet. |
| 3 | `2026-07-23-erp-implementation-03-sales-module.md` | Spec unchanged, still accurate. No implementation plan written yet. |
| 4 | `2026-07-23-erp-implementation-04-inventory-transactions.md` | Spec unchanged, still accurate. No implementation plan written yet. |
| 5 | `2026-07-23-erp-implementation-05-roles-access.md` | Spec unchanged, still accurate. No implementation plan written yet. Now includes the proposed (not confirmed) `Role.permissions` shape from `docs/requirements.md` §5. |
| 6 | `2026-07-23-erp-implementation-06-reports.md` | Spec unchanged, still accurate. No implementation plan written yet. Now includes the `reports` nav repoint decision from `docs/requirements.md` §5. |

None of the phase 01-06 spec docs needed rewriting — their blocker analysis (missing list endpoints on Customers/Orders/Invoices/PurchaseItems/StockMovements/StockTransfers/Roles/UserRoles/Users/ActivityLogs/PlatformConfigurations) was re-checked against `core-apis` source on 2026-07-24 and confirmed still correct.

## Sequencing

**Phase 0 → Phase 1 → Phase 4 → Phase 2 → Phase 3 → Phase 5 → Phase 6.**

- **Phase 0** first: smallest, most isolated (one file for self-signup, plus dead-code/dep cleanup), and blocks nothing else — cheapest thing to clear before larger work starts.
- **Phase 1** next: hard dependency for everything after it (shared Dialog/Select components, `api.ts` mutation methods).
- **Phase 4 → Phase 2 → Phase 3** (unchanged from 07-23): Inventory Transactions is the most self-contained of the three with a real zero-backend-dependency win (low-stock flag); Purchase goes next (has a plausible fallback worth checking); Sales goes last (the most backend-blocked module by far).
- **Phase 5 (Roles) → Phase 6 (Reports)** last: both layer on top of working CRUD screens from Phases 1-4, and Phase 5 in particular depends on an unconfirmed backend contract (`Role.permissions`) that needs a round-trip with the backend team before it can ship. Risk flagged, not resolved: if role-based UI gating (e.g. hiding Delete for non-admins) turns out to be needed, Phases 0-4 pages may need retrofitting — no evidence that's required yet, so it's not being built speculatively.

## Next step

Phase 0 and Phase 1 both have complete, unexecuted implementation plans, ready to run via `superpowers:subagent-driven-development` or `superpowers:executing-plans` whenever implementation is approved to start. Phases 2-6 have specs but no task-by-task plans yet; those get written (via `writing-plans` or equivalent) when the user is ready to execute each one, not speculatively now.
