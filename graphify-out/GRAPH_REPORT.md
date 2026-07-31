# Graph Report - ERP-Client  (2026-07-31)

## Corpus Check
- 123 files · ~76,062 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1000 nodes · 1960 edges · 64 communities (55 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ce97607`
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
- Global Constraints
- ThemeContext.tsx
- resource.ts
- File map
- POS / Billing — design
- ProductsPage
- ProductSupplierLinksPanel.tsx
- Global Constraints
- Lessons Learned
- Global Constraints
- Frontend ↔ Backend parity (section-by-section)
- Core-apis inventory endpoint audit
- InventoryDashboard.tsx
- SidebarNav.tsx
- Locations.tsx
- File map
- ProductImageUploader.tsx
- vite-env.d.ts
- useProductLogsByInventory
- useRemoveLocationImage
- global.d.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 41 edges
2. `Input` - 35 edges
3. `Complete endpoint catalog` - 29 edges
4. `FormDrawer()` - 28 edges
5. `Field()` - 28 edges
6. `usePagination()` - 28 edges
7. `get()` - 23 edges
8. `FormSection()` - 19 edges
9. `ResourceSelect()` - 18 edges
10. `cn()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `OrganizationsPage()` --calls--> `usePagination()`  [EXTRACTED]
  renderer/src/pages/Organizations.tsx → renderer/src/hooks/usePagination.ts
- `PaymentTransactionsPage()` --calls--> `usePagination()`  [EXTRACTED]
  renderer/src/pages/PaymentTransactions.tsx → renderer/src/hooks/usePagination.ts
- `ReportGenerationLogsPage()` --calls--> `usePagination()`  [EXTRACTED]
  renderer/src/pages/ReportGenerationLogs.tsx → renderer/src/hooks/usePagination.ts
- `InventoryDashboard()` --references--> `Inventory`  [EXTRACTED]
  renderer/src/pages/dashboards/InventoryDashboard.tsx → renderer/src/api.ts
- `POSTerminal()` --references--> `Inventory`  [EXTRACTED]
  renderer/src/pages/pos/POSTerminal.tsx → renderer/src/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (64 total, 9 thin omitted)

### Community 0 - "Sidebar.tsx"
Cohesion: 0.06
Nodes (27): Bills, PaymentTransactions, PurchaseOrders, ERROR_COPY, ErrorStateType, ErrorIllustration(), ErrorState(), ErrorStateProps (+19 more)

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (43): author, build, appId, directories, files, npmRebuild, nsis, productName (+35 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (29): class-variance-authority, @clerk/clerk-js, clsx, lucide-react, dependencies, class-variance-authority, @clerk/clerk-js, clsx (+21 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (35): concurrently, cross-env, electron, electron-builder, esbuild, devDependencies, concurrently, cross-env (+27 more)

### Community 7 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+16 more)

### Community 10 - "Users.tsx"
Cohesion: 0.10
Nodes (31): buildReceiptLines(), CheckoutResult, CheckoutStep, CheckoutStepStatus, findInventory(), localRef(), PosLineInput, PosReceipt (+23 more)

### Community 11 - "PurchaseItems.tsx"
Cohesion: 0.04
Nodes (43): ActivityLogs, AuditLog, BillDetail, Bills, Categories, CreateOrganization, Customers, Dashboard (+35 more)

### Community 12 - "graphify query <question>"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "Content-Security-Policy meta tag"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "Products.tsx"
Cohesion: 0.14
Nodes (21): ActivityLogs, Locations, Products, FormSection(), ListResource, ResourceSelect(), ResourceSelectProps, SelectContent (+13 more)

### Community 15 - "buildUrl"
Cohesion: 0.05
Nodes (38): `activity-logs` (2 routes), `auth` (5 routes), `bills` (6 routes), `categories` (7 routes), Complete endpoint catalog, Core-apis full endpoint audit, Create + getById only (no list/search/update/delete), `customers` (2 routes) (+30 more)

### Community 16 - "get"
Cohesion: 0.07
Nodes (29): #0 — Purchase Orders create/update incomplete, #0b — Purchase Order line / related actions, #0c — Bills ↔ Purchase Order linkage missing, #0d — Payment transactions `orgId` vs `organizationId`, #0e — Item returns, #10 — Auth / tenancy on thin creates, #1 — Bills / POs list-search instability, #8 — Customers (and cascade) organizationId never set (+21 more)

### Community 17 - "UnpublishedStock.tsx"
Cohesion: 0.27
Nodes (17): useAddUnpublishedStock(), usePublishUnpublishedStock(), useStockMovement(), useUnpublishedStock(), useUnpublishedStockMovements(), authHeader(), buildUrl(), del() (+9 more)

### Community 18 - "Invoices.tsx"
Cohesion: 0.13
Nodes (16): PlatformConfigurations, Field(), FormDrawer(), FormDrawerProps, copyId(), EMPTY_FORM, FormState, InvoicesPage() (+8 more)

### Community 19 - "StockTransfers.tsx"
Cohesion: 0.07
Nodes (47): Inventory, StockTransfers, useCancelStockTransfer(), useCompleteStockTransfer(), useStockMovementsByInventory(), useStockOperation(), SimpleColumn, SimpleTable() (+39 more)

### Community 20 - "UserRoles.tsx"
Cohesion: 0.09
Nodes (21): File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`), Global Constraints, Program context, Self-review notes, Shared Frontend Layer Rewrite Implementation Plan, Task 10: Migrate core CRUD list pages (ERPDataTable + useResourceMutations pattern), Task 11: Migrate create-only form pages (no table, just `useMutation` + optional `ResourceSelect`), Task 12: Migrate `Users.tsx` (+13 more)

### Community 21 - "launch-electron.ts"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "VehiclesView.tsx"
Cohesion: 0.11
Nodes (17): ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM, MOCK_STORE (+9 more)

### Community 23 - "Login split layout — design"
Cohesion: 0.09
Nodes (21): API client, Backend changes, Current state (problem), Data migration, Decision, Frontend changes, Goal, Inventory cluster pages (+13 more)

### Community 24 - "/src/main.jsx entry script"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

### Community 27 - "Shared Frontend Layer Rewrite — Design"
Cohesion: 0.14
Nodes (15): Organizations, Stores, Input, InputProps, copyId(), CustomersPage(), EMPTY_FORM, FormState (+7 more)

### Community 29 - "Global Constraints"
Cohesion: 0.14
Nodes (16): Suppliers, useDebounce(), usePagination(), EMPTY_FORM, EMPTY_RESTOCK, FormState, ItemReturnsPage(), RestockForm (+8 more)

### Community 30 - "api.ts"
Cohesion: 0.07
Nodes (43): Customers, Expenses, Invoices, ItemReturns, Notifications, Orders, ProductSupplierLinkBody, PurchaseItems (+35 more)

### Community 31 - "button.tsx"
Cohesion: 0.12
Nodes (27): Categories, ConfirmDialog(), ConfirmDialogProps, Column, DataTable(), DataTableProps, getCellValue(), Button (+19 more)

### Community 32 - "File map"
Cohesion: 0.12
Nodes (15): File map, Global Constraints, Plan self-review, Spec coverage checklist, Task 10: End-to-end verification, Task 1: Store entity — type + imageKey, Task 2: Migration — store columns + inventory FK cutover, Task 3: Stores application layer — real create/update + type (+7 more)

### Community 33 - "App.tsx"
Cohesion: 0.06
Nodes (46): Users, AuthBootPhase, AuthBootScreen(), ORDER, Props, STEPS, stepState(), LoginVisualPanel() (+38 more)

### Community 34 - "POS / Billing — design"
Cohesion: 0.19
Nodes (11): ImageLightbox(), ImageLightboxProps, FieldValue(), formatScalar(), isImageUrl(), NestedObject(), Props, EMPTY_FORM (+3 more)

### Community 35 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Architecture, Components / files, Constraints (verified), Data flow — category parents, Data flow — product images, ERP-Client ↔ Core API alignment (client-only), Error handling, Goal (+3 more)

### Community 36 - "Frontend ↔ Backend parity (section-by-section)"
Cohesion: 0.18
Nodes (10): Accessibility, Components / files, Goal, Layout, Left panel (visual), Login split layout — design, Non-goals, Right panel (auth) (+2 more)

### Community 37 - "Core-apis inventory endpoint audit"
Cohesion: 0.18
Nodes (10): Error State Pages Implementation Plan, File map, Global Constraints, Spec coverage (self-review), Task 1: Error copy + illustrations + ErrorState, Task 2: ErrorBoundary + OfflineGate + main wiring, Task 3: NotFound route + App wiring (boundary + offline + 404), Task 4: Shared tables use ErrorState for load failures (+2 more)

### Community 38 - "File map"
Cohesion: 0.20
Nodes (9): Architecture, Current state (verified by reading each file), Data flow example (`Products.tsx`), Error handling, Out of scope, Program context, Rollout & verification, Shared Frontend Layer Rewrite — Design (+1 more)

### Community 39 - "AuditLog.tsx"
Cohesion: 0.20
Nodes (9): Components & wiring, Decisions (locked), Error State Pages — Design Spec, Error types, Goal, Out of scope, Risks / assumptions, Success criteria (+1 more)

### Community 41 - "Global Constraints"
Cohesion: 0.22
Nodes (8): FE-only full parity pass (sales → purchase → warehouse → remaining), Global Constraints, Task 1: `createCreateOnlyResource` + wire thin APIs, Task 2: Sales — Customers, Orders, Invoices, Task 3: Purchase — POs, items, bills, payments, Task 4: Warehouse polish, Task 5: Remaining — dead APIs + demo audit, Task 6: Verify

### Community 42 - "ThemeContext.tsx"
Cohesion: 0.25
Nodes (7): initialState, Theme, ThemeContext, ThemeProvider(), ThemeProviderProps, ThemeProviderState, queryClient

### Community 43 - "resource.ts"
Cohesion: 0.22
Nodes (6): QueryParams, createCreateOnlyResource(), createResource(), SearchParams, SearchResult, PaginatedResponse

### Community 44 - "File map"
Cohesion: 0.25
Nodes (7): File map, Global Constraints, Login Split Layout Implementation Plan, Spec coverage (self-review), Task 1: Login visual CSS, Task 2: LoginVisualPanel component, Task 3: Wire split layout into Login.tsx

### Community 45 - "POS / Billing — design"
Cohesion: 0.25
Nodes (7): Architecture, Decisions (locked), Frontend, Goal, Non-goals, POS / Billing — design, Verification

### Community 46 - "ProductsPage"
Cohesion: 0.25
Nodes (8): PRODUCT_IMAGE_MIME_TYPES, useCategoryParents(), useProductImagePresignedUpload(), useProductImages(), useUploadProductImage(), CategoriesPage(), ProductsPage(), revokePending()

### Community 47 - "ProductSupplierLinksPanel.tsx"
Cohesion: 0.39
Nodes (7): useLinkProductSupplier(), useProductSuppliers(), useUnlinkProductSupplier(), useUpdateProductSupplier(), EMPTY_SUPPLIER_FORM, ProductSupplierLinksPanel(), SupplierLinkForm

### Community 48 - "Global Constraints"
Cohesion: 0.29
Nodes (6): FE-only: Stores-first UX (hide Locations nav), Global Constraints, Task 1: Hide Locations from sidebar, Task 2: Relabel inventory Location pickers as “Store”, Task 3: Docs + design note, Verification

### Community 49 - "Lessons Learned"
Cohesion: 0.25
Nodes (7): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, 2026-07-30 — Packaged Electron stuck on blank screen (BrowserRouter + empty resources), 2026-07-31 — Packaged Google OAuth failed on app:// custom scheme, Entry format, Ledger, Lessons Learned, When to add an entry

### Community 50 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Client API Alignment Implementation Plan, Global Constraints, Task 1: Remove OrgAddresses / UserAddresses, Task 2: Wire category parents + clean Vehicles API export, Task 3: Dual product image upload (multipart + presigned), Task 4: Verification

### Community 51 - "Frontend ↔ Backend parity (section-by-section)"
Cohesion: 0.33
Nodes (5): Cross-cutting FE issues (extra, not asked), Frontend ↔ Backend parity (section-by-section), Open questions (do not assume), Section matrix, Suggested work order (proposal only — confirm)

### Community 52 - "Core-apis inventory endpoint audit"
Cohesion: 0.33
Nodes (5): Confirmed missing (Section 7 of frontend inventory API guide), Core-apis inventory endpoint audit, Frontend stance for sub-project 3, Present and usable, Proposed backend fixes (awaiting approval — not implemented)

### Community 53 - "InventoryDashboard.tsx"
Cohesion: 0.53
Nodes (4): useInventoryLowStock(), useInventoryValuation(), formatValuation(), InventoryDashboard()

### Community 54 - "SidebarNav.tsx"
Cohesion: 0.40
Nodes (4): NAV_ITEMS, NavItem, Props, SidebarNav()

### Community 55 - "Locations.tsx"
Cohesion: 0.40
Nodes (5): EMPTY_FORM, FormState, PendingImage, TYPE_OPTIONS, LocationType

### Community 56 - "File map"
Cohesion: 0.40
Nodes (4): File map, POS / Billing Implementation Plan (ERP-Client only), Task 1: Checkout orchestrator, Task 2: POSTerminal page + nav + route

### Community 57 - "ProductImageUploader.tsx"
Cohesion: 0.50
Nodes (4): PendingImage, ProductImageUploader(), ProductImageUploaderProps, ProductImage

### Community 59 - "useProductLogsByInventory"
Cohesion: 0.50
Nodes (4): useProductLog(), useProductLogsByInventory(), useProductLogsByProduct(), ProductLogsPage()

### Community 60 - "useRemoveLocationImage"
Cohesion: 0.67
Nodes (3): useRemoveLocationImage(), useUploadLocationImage(), LocationsPage()

## Knowledge Gaps
- **489 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+484 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button` connect `button.tsx` to `Sidebar.tsx`, `App.tsx`, `POS / Billing — design`, `Products.tsx`, `ProductSupplierLinksPanel.tsx`, `Invoices.tsx`, `StockTransfers.tsx`, `Locations.tsx`, `Shared Frontend Layer Rewrite — Design`, `Global Constraints`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.tsx` to `StockTransfers.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `cn()` connect `Sidebar.tsx` to `App.tsx`, `Products.tsx`, `Invoices.tsx`, `Shared Frontend Layer Rewrite — Design`, `button.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _489 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05877551020408163 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.04609929078014184 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._