# FE-only: Stores-first UX (hide Locations nav)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERP-Client only — prefer Stores in navigation; inventory cluster still calls Locations API (`locationId`) but labels pickers as Store; no `core-apis` changes.

**Architecture:** Option A from product decision 2026-07-30. Locations page stays routable (for creating places inventory needs) but is removed from the sidebar. Inventory UI copy says “Store” while wire format stays `locationId`.

**Tech Stack:** React, existing `Locations` / `Stores` client resources.

## Global Constraints

- **Do not modify anything under `/home/hitarth/ERP/core-apis`**
- Only change `ERP-Client`
- Do not commit unless the user explicitly asks
- Do not send Store UUIDs to inventory/stock endpoints (they still need Location UUIDs)
- Keep `/locations` route working (not in sidebar) so places can still be created

**Supersedes for execution:** `2026-07-30-unify-stores-phase1.md` (BE migrate) — deferred until core-apis work is allowed.

---

### Task 1: Hide Locations from sidebar

**Files:**
- Modify: `ERP-Client/renderer/src/config/modules.ts`

- [x] **Step 1:** Remove the Locations nav item (`key: 'locations'`, path `/locations`) from the Warehouse section. Keep the Stores item.
- [x] **Step 2:** Confirm no other MODULES entries link to `/locations`.
- [x] **Step 3:** Do not delete `Locations.tsx` or the App route yet.

---

### Task 2: Relabel inventory Location pickers as “Store”

**Files (only where user-visible “Location” means the place picker):**
- `ERP-Client/renderer/src/pages/Inventory.tsx`
- `ERP-Client/renderer/src/pages/InventoryDetail.tsx`
- `ERP-Client/renderer/src/pages/StockMovements.tsx`
- `ERP-Client/renderer/src/pages/UnpublishedStock.tsx`
- `ERP-Client/renderer/src/pages/ItemReturns.tsx` (restock place field only)
- `ERP-Client/renderer/src/pages/ProductLogs.tsx` (labels only)
- `ERP-Client/renderer/src/pages/dashboards/InventoryDashboard.tsx` (column header if it says Location)

- [x] **Step 1:** Keep `Locations.useList` / `Locations.useGet` and `locationId` in state/API payloads.
- [x] **Step 2:** Change visible labels from “Location” → “Store” (Field labels, table headers, placeholder text, empty hints).
- [x] **Step 3:** Where helpful, show location `type` (store/warehouse) in the option label: `` `${name} (${type})` ``.
- [x] **Step 4:** Add a discreet link or hint on Inventory create empty/missing places: “Create places at /locations” or `Navigate` link to `/locations` (page not in sidebar).
- [x] **Step 5:** Do **not** change StockTransfers / Orders / etc. that already correctly use `Stores` / `storeId`.

---

### Task 3: Docs + design note

**Files:**
- Modify: `ERP-Client/docs/superpowers/specs/2026-07-30-unify-stores-design.md` — add “FE-only interim” status note
- This plan file checkboxes

- [x] **Step 1:** Note that BE unify is deferred; client hides Locations nav and relabels pickers only.
- [x] **Step 2:** Grep that no files under `core-apis` were touched in this work.

---

## Verification

- Sidebar Warehouse shows Stores, not Locations
- `/locations` still loads if navigated manually
- Inventory create still posts `locationId` from Locations list
- No changes under `core-apis/`
