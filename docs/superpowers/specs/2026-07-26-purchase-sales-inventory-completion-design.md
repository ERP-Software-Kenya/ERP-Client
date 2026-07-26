# Purchase / Sales / Inventory — Full Completion Design

**Status:** Approved — **Date:** 2026-07-26
**Scope:** Purchase module, Sales module, Inventory-transactions module only. Phase 1 foundation resources (Products, Categories, Stores, Suppliers, Organizations, Notifications, ReportGenerationLogs) are explicitly out of scope for this round — confirmed with user.
**Repos touched:** `core-erp-client` only. `core-apis` is diagnosed (run locally, read, reproduced) but not modified — that's a separate team's repo.

## Problem

`docs/core-apis-fixes.md` (written earlier the same day, 2026-07-26) documents that almost every write endpoint across Purchase, Sales, and Inventory-transactions returns `500` against the deployed backend. The existing client UI for all three modules was already built and shipped in a disabled state pending backend fixes. Two items in that audit are marked "confirmed symptom, unconfirmed root cause" (8-of-12 list-500s; `stock-transfers` create-500) because they were diagnosed by reading source only. That method already produced one wrong conclusion this session — `stock-transfers` looked clean from source and 500'd live anyway — so no remaining "confirmed root cause" label in scope should be trusted until it's backed by a real stack trace, not just an inference.

The user wants: (1) a complete, evidence-backed list of everything broken or missing in `core-apis` for these three modules, and (2) the `core-erp-client` side implemented as fully and correctly as the current (buggy) backend allows — nothing left un-checked or silently wrong.

## Approach

Two sequential phases.

### Phase A — Live diagnostic of core-apis (read-only)

Run `core-apis` locally via its `docker-compose.development.yml` against a throwaway test org/DB. For every Purchase/Sales/Inventory-transactions resource (not just the two currently "unconfirmed" ones — re-verify all of them live, since source-only "confirmed" has already been wrong once):

- Call list/search and create (and update/delete where they exist) with valid payloads.
- Capture the real server-side stack trace/log line for every failure, not just the generic 500 body.
- Re-check response shapes for every working GET/list/get-by-id call against what `types.ts` currently assumes (field names, embedded relations, enums).
- Note anything not yet in `core-apis-fixes.md` found along the way (e.g. an endpoint that works but returns different fields than assumed).

Output: `docs/core-apis-fixes.md` rewritten/extended for the Purchase/Sales/Inventory entries, each backed by an actual stack trace or a confirmed-working live call — no remaining "unconfirmed root cause" or "confirmed by inference" labels for anything in scope.

If local setup itself is blocked (missing env secrets, DB seed issues, etc.), that blocker gets reported to the user rather than silently falling back to source-only inference.

### Phase B — Client completeness pass

For every resource in scope (PurchaseOrders, PurchaseItems, Bills, purchase-side ItemReturns; Customers, Orders, Invoices, sales-side ItemReturns; StockMovements, StockTransfers, Inventory):

1. **Types**: reconcile `renderer/src/types.ts` against Phase A's confirmed real DTO shapes.
2. **Forms**: enable any create/update path Phase A proves genuinely works; keep disabled anything genuinely broken, with the disabled message naming the specific confirmed bug (not a generic "backend issue" note).
3. **Coverage**: fill any resource in scope that has no page yet, or is missing list/detail/create pieces the backend actually supports.
4. **Verify**: `tsc --noEmit`, production build (renderer + main), and an Electron/Playwright smoke test covering every touched page (create where enabled, view/list where available, confirm disabled states show correct messaging).

## Non-goals

- No `core-apis` source changes.
- No Phase 1 (foundation) resource changes.
- No speculative UI for endpoints confirmed schema-only with no API (`OrderItemEntity`, `StockTransferItemEntity`) beyond clearly stating the gap — building a fake table over data the API can't return is explicitly what `add-create-only-resource-page` guards against.

## Deliverables

1. Updated `docs/core-apis-fixes.md` — every Purchase/Sales/Inventory entry evidence-backed.
2. Client changes across the in-scope pages/types, committed.
3. Passing `tsc --noEmit`, production build, and smoke test evidence reported to the user (not just claimed).
