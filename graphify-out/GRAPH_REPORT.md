# Graph Report - ERP-Client  (2026-07-30)

## Corpus Check
- 105 files · ~70,033 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 814 nodes · 1748 edges · 43 communities (35 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c9deb8f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sidebar.tsx
- graphify explain <concept>
- scripts
- graphify-out/wiki/index.md
- dependencies
- devDependencies
- graphify path <A> <B>
- compilerOptions
- graphify update .
- compilerOptions
- Users.tsx
- PurchaseItems.tsx
- graphify query <question>
- Content-Security-Policy meta tag
- Products.tsx
- buildUrl
- get
- UnpublishedStock.tsx
- Invoices.tsx
- StockTransfers.tsx
- UserRoles.tsx
- launch-electron.ts
- VehiclesView.tsx
- Login split layout — design
- /src/main.jsx entry script
- build-main.ts
- publish-release.ts
- Shared Frontend Layer Rewrite — Design
- Global Constraints
- api.ts
- button.tsx
- File map
- App.tsx
- POS / Billing — design
- Global Constraints
- Frontend ↔ Backend parity (section-by-section)
- Core-apis inventory endpoint audit
- File map
- AuditLog.tsx
- SalesDashboard.tsx
- Lessons Learned
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 38 edges
2. `Input` - 36 edges
3. `Field()` - 33 edges
4. `FormDrawer()` - 32 edges
5. `Complete endpoint catalog` - 29 edges
6. `usePagination()` - 28 edges
7. `FormSection()` - 19 edges
8. `get()` - 18 edges
9. `Products` - 17 edges
10. `ResourceSelect()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `CategoriesPage()` --references--> `Categories`  [EXTRACTED]
  renderer/src/pages/Categories.tsx → renderer/src/api.ts
- `POSTerminal()` --references--> `Products`  [EXTRACTED]
  renderer/src/pages/pos/POSTerminal.tsx → renderer/src/api.ts
- `ProductsPage()` --references--> `Products`  [EXTRACTED]
  renderer/src/pages/Products.tsx → renderer/src/api.ts
- `POSTerminal()` --references--> `Suppliers`  [EXTRACTED]
  renderer/src/pages/pos/POSTerminal.tsx → renderer/src/api.ts
- `SuppliersPage()` --references--> `Suppliers`  [EXTRACTED]
  renderer/src/pages/Suppliers.tsx → renderer/src/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (43 total, 8 thin omitted)

### Community 0 - "Sidebar.tsx"
Cohesion: 0.28
Nodes (5): Sidebar(), ALL_ITEMS, ModuleGroup, ModuleItem, MODULES

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (36): author, build, appId, directories, files, nsis, productName, publish (+28 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (31): class-variance-authority, @clerk/clerk-js, clsx, dotenv, lucide-react, dependencies, class-variance-authority, @clerk/clerk-js (+23 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (35): concurrently, cross-env, electron, electron-builder, esbuild, devDependencies, concurrently, cross-env (+27 more)

### Community 7 - "compilerOptions"
Cohesion: 0.09
Nodes (21): DOM.Iterable, src, compilerOptions, isolatedModules, jsx, lib, module, moduleResolution (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (24): node_modules, renderer, scripts/**/*.ts, src/main/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames (+16 more)

### Community 10 - "Users.tsx"
Cohesion: 0.09
Nodes (31): Stores, WarehouseDashboard(), buildReceiptLines(), CheckoutResult, CheckoutStep, CheckoutStepStatus, localRef(), PosLineInput (+23 more)

### Community 11 - "PurchaseItems.tsx"
Cohesion: 0.48
Nodes (5): Bills, PaymentTransactions, PurchaseOrders, BillDetail(), PurchaseDashboard()

### Community 12 - "graphify query <question>"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "Content-Security-Policy meta tag"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "Products.tsx"
Cohesion: 0.11
Nodes (24): Categories, Suppliers, useLinkProductSupplier(), useProductImages(), useProductSuppliers(), useUnlinkProductSupplier(), useUpdateProductSupplier(), useUploadProductImage() (+16 more)

### Community 15 - "buildUrl"
Cohesion: 0.05
Nodes (38): `activity-logs` (2 routes), `auth` (5 routes), `bills` (6 routes), `categories` (7 routes), Complete endpoint catalog, Core-apis full endpoint audit, Create + getById only (no list/search/update/delete), `customers` (2 routes) (+30 more)

### Community 16 - "get"
Cohesion: 0.09
Nodes (21): File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`), Global Constraints, Program context, Self-review notes, Shared Frontend Layer Rewrite Implementation Plan, Task 10: Migrate core CRUD list pages (ERPDataTable + useResourceMutations pattern), Task 11: Migrate create-only form pages (no table, just `useMutation` + optional `ResourceSelect`), Task 12: Migrate `Users.tsx` (+13 more)

### Community 17 - "UnpublishedStock.tsx"
Cohesion: 0.11
Nodes (30): useAddUnpublishedStock(), usePublishUnpublishedStock(), useRemoveLocationImage(), useStockMovement(), useUnpublishedStock(), useUnpublishedStockMovements(), useUploadLocationImage(), authHeader() (+22 more)

### Community 18 - "Invoices.tsx"
Cohesion: 0.09
Nodes (21): API client, Backend changes, Current state (problem), Data migration, Decision, Frontend changes, Goal, Inventory cluster pages (+13 more)

### Community 19 - "StockTransfers.tsx"
Cohesion: 0.09
Nodes (33): Inventory, ItemReturns, Locations, Products, StockTransfers, useCancelStockTransfer(), useCompleteStockTransfer(), useProductLog() (+25 more)

### Community 20 - "UserRoles.tsx"
Cohesion: 0.12
Nodes (15): File map, Global Constraints, Plan self-review, Spec coverage checklist, Task 10: End-to-end verification, Task 1: Store entity — type + imageKey, Task 2: Migration — store columns + inventory FK cutover, Task 3: Stores application layer — real create/update + type (+7 more)

### Community 21 - "launch-electron.ts"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "VehiclesView.tsx"
Cohesion: 0.11
Nodes (19): ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM, MOCK_STORE (+11 more)

### Community 23 - "Login split layout — design"
Cohesion: 0.18
Nodes (10): Accessibility, Components / files, Goal, Layout, Left panel (visual), Login split layout — design, Non-goals, Right panel (auth) (+2 more)

### Community 24 - "/src/main.jsx entry script"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

### Community 27 - "Shared Frontend Layer Rewrite — Design"
Cohesion: 0.20
Nodes (9): Architecture, Current state (verified by reading each file), Data flow example (`Products.tsx`), Error handling, Out of scope, Program context, Rollout & verification, Shared Frontend Layer Rewrite — Design (+1 more)

### Community 29 - "Global Constraints"
Cohesion: 0.22
Nodes (8): FE-only full parity pass (sales → purchase → warehouse → remaining), Global Constraints, Task 1: `createCreateOnlyResource` + wire thin APIs, Task 2: Sales — Customers, Orders, Invoices, Task 3: Purchase — POs, items, bills, payments, Task 4: Warehouse polish, Task 5: Remaining — dead APIs + demo audit, Task 6: Verify

### Community 30 - "api.ts"
Cohesion: 0.05
Nodes (60): ActivityLogs, Customers, Expenses, Invoices, Orders, OrgAddresses, PlatformConfigurations, ProductSupplierLinkBody (+52 more)

### Community 31 - "button.tsx"
Cohesion: 0.05
Nodes (101): Notifications, Organizations, PurchaseItems, ReportGenerationLogs, ConfirmDialog(), ConfirmDialogProps, Column, DataTable() (+93 more)

### Community 32 - "File map"
Cohesion: 0.25
Nodes (7): File map, Global Constraints, Login Split Layout Implementation Plan, Spec coverage (self-review), Task 1: Login visual CSS, Task 2: LoginVisualPanel component, Task 3: Wire split layout into Login.tsx

### Community 33 - "App.tsx"
Cohesion: 0.07
Nodes (41): Users, App(), LoginVisualPanel(), Topbar(), ProtectedRoute(), Label, labelVariants, AuthContext (+33 more)

### Community 34 - "POS / Billing — design"
Cohesion: 0.25
Nodes (7): Architecture, Decisions (locked), Frontend, Goal, Non-goals, POS / Billing — design, Verification

### Community 35 - "Global Constraints"
Cohesion: 0.29
Nodes (6): FE-only: Stores-first UX (hide Locations nav), Global Constraints, Task 1: Hide Locations from sidebar, Task 2: Relabel inventory Location pickers as “Store”, Task 3: Docs + design note, Verification

### Community 36 - "Frontend ↔ Backend parity (section-by-section)"
Cohesion: 0.33
Nodes (5): Cross-cutting FE issues (extra, not asked), Frontend ↔ Backend parity (section-by-section), Open questions (do not assume), Section matrix, Suggested work order (proposal only — confirm)

### Community 37 - "Core-apis inventory endpoint audit"
Cohesion: 0.33
Nodes (5): Confirmed missing (Section 7 of frontend inventory API guide), Core-apis inventory endpoint audit, Frontend stance for sub-project 3, Present and usable, Proposed backend fixes (awaiting approval — not implemented)

### Community 38 - "File map"
Cohesion: 0.40
Nodes (4): File map, POS / Billing Implementation Plan (ERP-Client only), Task 1: Checkout orchestrator, Task 2: POSTerminal page + nav + route

### Community 39 - "AuditLog.tsx"
Cohesion: 0.40
Nodes (3): ACTION_COLORS, DEMO_LOGS, DemoLogEntry

### Community 49 - "Lessons Learned"
Cohesion: 0.33
Nodes (5): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, Entry format, Ledger, Lessons Learned, When to add an entry

## Knowledge Gaps
- **394 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+389 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Button` connect `button.tsx` to `App.tsx`, `StockTransfers.tsx`, `Products.tsx`, `UnpublishedStock.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _394 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._