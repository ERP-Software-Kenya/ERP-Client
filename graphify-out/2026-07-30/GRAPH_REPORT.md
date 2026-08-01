# Graph Report - ERP-Client  (2026-07-30)

## Corpus Check
- 85 files · ~38,597 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 594 nodes · 1459 edges · 32 communities (25 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `208ba581`
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
- /src/main.jsx entry script
- build-main.ts
- publish-release.ts
- api.ts
- button.tsx
- App.tsx
- Lessons Learned
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 37 edges
2. `Input` - 34 edges
3. `useResourceMutations()` - 34 edges
4. `Field()` - 32 edges
5. `FormDrawer()` - 31 edges
6. `ERPDataTable()` - 20 edges
7. `ResourceSelect()` - 18 edges
8. `ConfirmDialog()` - 16 edges
9. `Column` - 16 edges
10. `SelectTrigger` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Inventory()` --calls--> `useResourceMutations()`  [EXTRACTED]
  renderer/src/pages/Inventory.tsx → renderer/src/hooks/useResourceMutations.ts
- `WarehouseDashboard()` --references--> `Stores`  [EXTRACTED]
  renderer/src/pages/dashboards/WarehouseDashboard.tsx → renderer/src/api.ts
- `Products()` --calls--> `uploadProductImage()`  [EXTRACTED]
  renderer/src/pages/Products.tsx → renderer/src/api.ts
- `Products()` --calls--> `linkProductSupplier()`  [EXTRACTED]
  renderer/src/pages/Products.tsx → renderer/src/api.ts
- `Products()` --calls--> `unlinkProductSupplier()`  [EXTRACTED]
  renderer/src/pages/Products.tsx → renderer/src/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (32 total, 7 thin omitted)

### Community 0 - "Sidebar.tsx"
Cohesion: 0.38
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
Cohesion: 0.08
Nodes (20): Expenses, Orders, Organizations, Stores, Users, FormSection(), WarehouseDashboard(), EMPTY_FORM (+12 more)

### Community 11 - "PurchaseItems.tsx"
Cohesion: 0.12
Nodes (16): Bills, PaymentTransactions, PurchaseItems, PurchaseOrders, BillDetail(), EMPTY_PAYMENT_FORM, PaymentFormState, PurchaseDashboard() (+8 more)

### Community 12 - "graphify query <question>"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "Content-Security-Policy meta tag"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "Products.tsx"
Cohesion: 0.15
Nodes (16): listProductImages(), listProductSuppliers(), updateProductSupplier(), ImageLightbox(), ImageLightboxProps, Textarea, TextareaProps, EMPTY_FORM (+8 more)

### Community 15 - "buildUrl"
Cohesion: 0.19
Nodes (16): authHeader(), buildUrl(), cancelStockTransfer(), completeStockTransfer(), del(), getStockTransfer(), _getToken(), headers() (+8 more)

### Community 16 - "get"
Cohesion: 0.22
Nodes (11): get(), getInventoryLowStock(), getInventoryValuation(), getProductLog(), getStockMovement(), Inventory, listProductLogsByInventory(), listProductLogsByProduct() (+3 more)

### Community 17 - "UnpublishedStock.tsx"
Cohesion: 0.36
Nodes (7): addUnpublishedStock(), getUnpublishedStock(), linkProductSupplier(), listUnpublishedStockMovements(), post(), publishUnpublishedStock(), UnpublishedStockPage()

### Community 18 - "Invoices.tsx"
Cohesion: 0.33
Nodes (5): Invoices, EMPTY_FORM, FormState, Invoices(), Invoice

### Community 19 - "StockTransfers.tsx"
Cohesion: 0.06
Nodes (45): ActivityLogs, Categories, Locations, performStockOperation(), Products, Roles, StockTransfers, buildIndentedList() (+37 more)

### Community 20 - "UserRoles.tsx"
Cohesion: 0.33
Nodes (5): UserRoles, EMPTY_FORM, FormState, UserRoles(), UserRole

### Community 21 - "launch-electron.ts"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "VehiclesView.tsx"
Cohesion: 0.11
Nodes (20): Vehicles, ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM (+12 more)

### Community 24 - "/src/main.jsx entry script"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

### Community 30 - "api.ts"
Cohesion: 0.10
Nodes (28): makeMutableResource(), makeResource(), Notifications, OrgAddresses, QueryParams, ReportGenerationLogs, SearchParams, UserAddresses (+20 more)

### Community 31 - "button.tsx"
Cohesion: 0.07
Nodes (66): ItemReturns, Suppliers, ConfirmDialog(), ConfirmDialogProps, Column, ERPDataTable(), getCellValue(), Props (+58 more)

### Community 33 - "App.tsx"
Cohesion: 0.05
Nodes (48): configureApi(), Customers, PlatformConfigurations, App(), Topbar(), ProtectedRoute(), Label, labelVariants (+40 more)

### Community 49 - "Lessons Learned"
Cohesion: 0.33
Nodes (5): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, Entry format, Ledger, Lessons Learned, When to add an entry

## Knowledge Gaps
- **238 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+233 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `useResourceMutations()` connect `button.tsx` to `StockTransfers.tsx`, `Products.tsx`, `buildUrl`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _238 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._