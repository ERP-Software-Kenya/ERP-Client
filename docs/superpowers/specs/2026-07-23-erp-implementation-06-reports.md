# Phase 6 — Reports

**Depends on:** Phases 2–4 producing real transactional data to report on (this phase is low-value until then — building report screens against empty/stub data doesn't prove anything).
**Spec sections referenced:** §7 (Reports — spec itself says "named now, detailed later," i.e. this was always meant to be the least-detailed phase).

## 1. Goal

Spec §7 names: Stock Balance, Stock Ledger, Reorder Report, Purchase Register, Sales Register, Receivable Ageing, Payable Ageing, Tax Summary (GST filing).

## 2. Current state

- Nav has a `'reports'` key pointing at a nonexistent `Api.Reports` (overview doc §3 — silently renders empty, not even a real stub).
- `ReportGenerationLog` resource exists with full CRUD (Phase 1) — this looks like it's meant to track *runs* of report generation (a job log: report_type, status), not to serve report *data* itself. No resource in the OpenAPI spec appears to return computed report data (no `/reports/stock-balance` or similar endpoint exists).

## 3. Reality check — most of these reports can't be "fetched," they have to be computed client-side from list endpoints, and several of those list endpoints don't exist yet

| Report | Buildable? | Why |
|---|---|---|
| Stock Balance | **Yes, now** — `Inventory.list()` already gives quantity per product/store. | |
| Stock Ledger | Blocked — needs StockMovements list endpoint (Phase 4 blocker). | |
| Reorder Report | **Yes, now** — filter `Inventory.list()` where `quantity < min_quantity` (same computation as Phase 4's low-stock flag, just presented as a report view instead of a table badge). | |
| Purchase Register | Partially — `PurchaseOrders.list()` exists; register would need line-item detail per Phase 2's unresolved blocker. | |
| Sales Register | Blocked — Orders/Invoices have no list endpoint at all (Phase 3 blocker). | |
| Receivable Ageing | Blocked — needs Invoice list + Customer list, neither exists (Phase 3 blocker). | |
| Payable Ageing | Partially — needs Bill list (exists) + due dates (exists) + Payment linkage (Phase 2's open question). | |
| Tax Summary (GST) | Blocked — no tax engine exists at all (overview doc §1), nothing to summarize. | |

## 4. Recommendation

Don't build a "Reports" module as its own thing yet. Two of the eight (Stock Balance, Reorder Report) are just filtered/reshaped views of data Phase 1/4 already exposes — build those now, cheaply, as they need zero new backend work. Leave the `'reports'` nav entry pointing at just these two for now rather than a broken empty page. Everything else in this phase is downstream of Phase 2/3/4's blockers being resolved — revisit once those land.

`ReportGenerationLog` itself (the job-log resource) only makes sense to build a UI for once there's an actual async report-generation job on the backend to log — right now it'd be a CRUD screen for a log that nothing writes to. Confirm whether that's planned before spending time on it.

## 5. Open questions for this phase

- Is `ReportGenerationLog` meant to back an async report-export job (e.g., "generate PDF, check back later"), and if so, is that job implemented anywhere yet? If not, this resource's UI has no real purpose to build against today.
- Should the eventual Tax Summary report wait for the full Tax Group engine (overview doc, backend roadmap item), or is a simpler GST-shaped placeholder wanted sooner? Given tax computation is core to what's being summarized, doing this before the tax engine exists seems premature — flagging rather than assuming.

## 6. Done when

- [ ] Stock Balance report view built (Inventory.list, grouped/filtered by store).
- [ ] Reorder report view built (Inventory.list filtered by quantity < min_quantity).
- [ ] Nav `'reports'` entry no longer silently empty — points at the above two, with the remaining six explicitly listed as "pending backend work" in-app (not hidden, so nobody thinks they were forgotten) or hidden with a tooltip explaining why, whichever the user prefers.
- [ ] Remaining six reports tracked as blocked, revisited after Phases 2–4 blockers close.
