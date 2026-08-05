# Graph Report - ERP-Client  (2026-08-05)

## Corpus Check
- 161 files · ~123,039 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1397 nodes · 2805 edges · 92 communities (80 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- utils.ts
- graphify explain <concept>
- scripts
- graphify-out/wiki/index.md
- dependencies
- devDependencies
- graphify path <A> <B>
- compilerOptions
- graphify update .
- compilerOptions
- get
- BillDetail.tsx
- graphify query <question>
- Content-Security-Policy meta tag
- ProductDetailView.tsx
- Complete endpoint catalog
- File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`)
- Administration User Management & Stock Transfer Redesign
- Unify on Stores — design
- User Management
- File map
- launch-electron.ts
- VehiclesView.tsx
- Login split layout — design
- /src/main.jsx entry script
- build-main.ts
- publish-release.ts
- Shared Frontend Layer Rewrite — Design
- Global Constraints
- api.ts
- FormDrawer.tsx
- File map
- Products.tsx
- POS / Billing — design
- Global Constraints
- Frontend ↔ Backend parity (section-by-section)
- Core-apis inventory endpoint audit
- File map
- Bills.tsx
- SalesDashboard.tsx
- App.tsx
- ItemReturns.tsx
- HIGH PRIORITY
- Core API changes needed by ERP-Client
- Global Constraints
- button.tsx
- Starting Point — read this before touching any file
- UX Polish — UUID Labels, Filters, POS Layout, Chrome
- Ledger
- ProductOnboardingWizard.tsx
- Users.tsx
- UnpublishedStock.tsx
- AuthContext.tsx
- Billing Module — Implementation Plan
- 4-feature implementation TODO
- PurchaseOrderDetail.tsx
- File map
- vite-env.d.ts
- ERP-Client Auto-Update (GitHub Private Releases)
- Recent-First Lookup UX (+ Polish Leftovers)
- UserRolePills.tsx
- File map
- build
- cn
- ThemeContext.tsx
- auto-updater.ts
- ErrorState.tsx
- ERP-Client ↔ Core API alignment (client-only)
- Inventory.tsx
- CategoryDetailModal.tsx
- File map
- formatEntityLabel
- Error State Pages — Design Spec
- PurchaseOrderReceive.tsx
- index.ts
- Global Constraints
- package.json
- Global Constraints
- useAuth
- Locations.tsx
- AppLayout.tsx
- SidebarNav.tsx
- ProductImageUploader.tsx
- nsis
- global.d.ts
- preload.ts
- PRODUCT_IMAGE_MIME_TYPES
- Dashboard.tsx
- StockMovementOp
- LocationType

## God Nodes (most connected - your core abstractions)
1. `Button` - 51 edges
2. `formatEntityLabel()` - 50 edges
3. `get()` - 50 edges
4. `cn()` - 37 edges
5. `Input` - 34 edges
6. `usePagination()` - 30 edges
7. `Complete endpoint catalog` - 29 edges
8. `Field()` - 28 edges
9. `useRecentIds()` - 28 edges
10. `FormDrawer()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `CategoriesPage()` --indirect_call--> `useCategoryParents()`  [INFERRED]
  renderer/src/pages/Categories.tsx → renderer/src/api.ts
- `TriggerButton()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/FilterDropdown.tsx → renderer/src/lib/utils.ts
- `SearchBox()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/FilterDropdown.tsx → renderer/src/lib/utils.ts
- `OptionContent()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/FilterDropdown.tsx → renderer/src/lib/utils.ts
- `createWindow()` --calls--> `initAutoUpdater()`  [EXTRACTED]
  src/main/index.ts → src/main/auto-updater.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (92 total, 12 thin omitted)

### Community 0 - "utils.ts"
Cohesion: 0.21
Nodes (11): Sidebar(), SkeletonBox(), Step4Panel(), StepDot(), StepperTrack(), Tooltip(), ALL_ITEMS, ModuleGroup (+3 more)

### Community 2 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, build:main, build:renderer, dev, dev:electron, dev:main, dev:renderer (+5 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (33): class-variance-authority, @clerk/clerk-js, clsx, electron-log, electron-updater, lucide-react, dependencies, class-variance-authority (+25 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (35): concurrently, cross-env, electron, electron-builder, esbuild, devDependencies, concurrently, cross-env (+27 more)

### Community 7 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+16 more)

### Community 10 - "get"
Cohesion: 0.07
Nodes (50): useCancelStockTransfer(), authHeader(), buildUrl(), checkAuth(), configureApi(), del(), _getToken(), jsonHeaders() (+42 more)

### Community 11 - "BillDetail.tsx"
Cohesion: 0.33
Nodes (6): Customers, BillDetail(), money(), PAY_METHODS, BillStatus, PaymentMethod

### Community 12 - "graphify query <question>"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "Content-Security-Policy meta tag"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "ProductDetailView.tsx"
Cohesion: 0.17
Nodes (17): Categories, useProductImages(), useProductLogsByProduct(), ImageLightbox(), ImageLightboxProps, actionBadgeClass(), actionDotClass(), fmtCurrency() (+9 more)

### Community 15 - "Complete endpoint catalog"
Cohesion: 0.05
Nodes (38): `activity-logs` (2 routes), `auth` (5 routes), `bills` (6 routes), `categories` (7 routes), Complete endpoint catalog, Core-apis full endpoint audit, Create + getById only (no list/search/update/delete), `customers` (2 routes) (+30 more)

### Community 16 - "File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`)"
Cohesion: 0.07
Nodes (29): #0 — Purchase Orders create/update incomplete, #0b — Purchase Order line / related actions, #0c — Bills ↔ Purchase Order linkage missing, #0d — Payment transactions `orgId` vs `organizationId`, #0e — Item returns, #10 — Auth / tenancy on thin creates, #1 — Bills / POs list-search instability, #8 — Customers (and cascade) organizationId never set (+21 more)

### Community 17 - "Administration User Management & Stock Transfer Redesign"
Cohesion: 0.12
Nodes (15): Administration User Management & Stock Transfer Redesign, Backend changes, Backend changes (`core-apis`), Context, Error handling, Error handling, Feature 1: User Management, Feature 2: Stock Transfer Redesign (+7 more)

### Community 18 - "Unify on Stores — design"
Cohesion: 0.15
Nodes (17): SessionRoute(), LoginVisualPanel(), ProtectedRoute(), Label, labelVariants, useAuth(), clerk, CreateOrganization() (+9 more)

### Community 19 - "User Management"
Cohesion: 0.15
Nodes (12): ✅ Already done, Backend Requirements — User Management + Stock Transfer, ⬜ `DELETE /api/v1/auth/members/:id` — new, ⬜ `GET /api/v1/auth/members` — new, ⬜ `GET /api/v1/stock-transfers` — new, ⬜ `POST /api/v1/auth/invite` — fix, don't add, ⬜ `PUT /api/v1/stock-transfers/:id/complete` — fix existing, Setup for whoever/whatever implements this (+4 more)

### Community 20 - "File map"
Cohesion: 0.09
Nodes (21): File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`), Global Constraints, Program context, Self-review notes, Shared Frontend Layer Rewrite Implementation Plan, Task 10: Migrate core CRUD list pages (ERPDataTable + useResourceMutations pattern), Task 11: Migrate create-only form pages (no table, just `useMutation` + optional `ResourceSelect`), Task 12: Migrate `Users.tsx` (+13 more)

### Community 21 - "launch-electron.ts"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "VehiclesView.tsx"
Cohesion: 0.10
Nodes (18): RowActionsMenu(), ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM (+10 more)

### Community 23 - "Login split layout — design"
Cohesion: 0.09
Nodes (21): API client, Backend changes, Current state (problem), Data migration, Decision, Frontend changes, Goal, Inventory cluster pages (+13 more)

### Community 24 - "/src/main.jsx entry script"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

### Community 26 - "publish-release.ts"
Cohesion: 0.40
Nodes (4): envPath, pkg, pkgPath, root

### Community 27 - "Shared Frontend Layer Rewrite — Design"
Cohesion: 0.12
Nodes (15): File map, Global Constraints, Plan self-review, Spec coverage checklist, Task 10: End-to-end verification, Task 1: Store entity — type + imageKey, Task 2: Migration — store columns + inventory FK cutover, Task 3: Stores application layer — real create/update + type (+7 more)

### Community 29 - "Global Constraints"
Cohesion: 0.28
Nodes (12): clearRecentIds(), emit(), EMPTY_RECENT, listeners, pushRecentId(), readEntries(), RecentIdEntry, removeRecentId() (+4 more)

### Community 30 - "api.ts"
Cohesion: 0.05
Nodes (59): billsBase, customersBase, Expenses, inventoryBase, Invoices, ItemReturns, Notifications, Orders (+51 more)

### Community 31 - "FormDrawer.tsx"
Cohesion: 0.10
Nodes (40): ConfirmDialog(), Column, DataTable(), getCellValue(), FormDrawer(), Props, SingleImageUploader(), Button (+32 more)

### Community 32 - "File map"
Cohesion: 0.17
Nodes (11): Architecture, Components / files, Constraints (verified), Data flow — category parents, Data flow — product images, ERP-Client ↔ Core API alignment (client-only), Error handling, Goal (+3 more)

### Community 33 - "Products.tsx"
Cohesion: 0.18
Nodes (10): Accessibility, Components / files, Goal, Layout, Left panel (visual), Login split layout — design, Non-goals, Right panel (auth) (+2 more)

### Community 34 - "POS / Billing — design"
Cohesion: 0.18
Nodes (10): Error State Pages Implementation Plan, File map, Global Constraints, Spec coverage (self-review), Task 1: Error copy + illustrations + ErrorState, Task 2: ErrorBoundary + OfflineGate + main wiring, Task 3: NotFound route + App wiring (boundary + offline + 404), Task 4: Shared tables use ErrorState for load failures (+2 more)

### Community 35 - "Global Constraints"
Cohesion: 0.20
Nodes (9): Architecture, Current state (verified by reading each file), Data flow example (`Products.tsx`), Error handling, Out of scope, Program context, Rollout & verification, Shared Frontend Layer Rewrite — Design (+1 more)

### Community 36 - "Frontend ↔ Backend parity (section-by-section)"
Cohesion: 0.20
Nodes (9): Components & wiring, Decisions (locked), Error State Pages — Design Spec, Error types, Goal, Out of scope, Risks / assumptions, Success criteria (+1 more)

### Community 37 - "Core-apis inventory endpoint audit"
Cohesion: 0.22
Nodes (8): FE-only full parity pass (sales → purchase → warehouse → remaining), Global Constraints, Task 1: `createCreateOnlyResource` + wire thin APIs, Task 2: Sales — Customers, Orders, Invoices, Task 3: Purchase — POs, items, bills, payments, Task 4: Warehouse polish, Task 5: Remaining — dead APIs + demo audit, Task 6: Verify

### Community 38 - "File map"
Cohesion: 0.25
Nodes (7): File map, Global Constraints, Login Split Layout Implementation Plan, Spec coverage (self-review), Task 1: Login visual CSS, Task 2: LoginVisualPanel component, Task 3: Wire split layout into Login.tsx

### Community 39 - "Bills.tsx"
Cohesion: 0.12
Nodes (19): Locations, useDebounce(), truncateId(), BillsPage(), EMPTY_FORM, FormState, money(), partyLabel() (+11 more)

### Community 41 - "App.tsx"
Cohesion: 0.04
Nodes (45): ActivityLogs, AppUpdates, AuditLog, BillDetail, Bills, Categories, CreateOrganization, Customers (+37 more)

### Community 42 - "ItemReturns.tsx"
Cohesion: 0.14
Nodes (24): Organizations, useListCountries(), ORG_ROLES, Field(), ListResource, ResourceSelect(), ResourceSelectProps, SelectContent (+16 more)

### Community 43 - "HIGH PRIORITY"
Cohesion: 0.06
Nodes (33): 10. No Runtime Schema Validation (Zod), 11. Dead Code: `static-server.ts`, 12. `stitch_product_details_view/` at Repo Root, 13. No `@tanstack/react-query-devtools` in Dev, 14. No Form Library — Manual State on Every Form, 15. Only 2 Custom Hooks for 44 Pages, 16. No `engines` Field in `package.json`, 17. No Barrel Exports / Index Files (+25 more)

### Community 44 - "Core API changes needed by ERP-Client"
Cohesion: 0.25
Nodes (7): Architecture, Decisions (locked), Frontend, Goal, Non-goals, POS / Billing — design, Verification

### Community 45 - "Global Constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, Self-Review Notes, Task 1: `org_member` schema migration, Task 2: Fix invite flow — allow inviting unregistered emails, actually send the email, Task 3: Reconcile pending invites on sign-in, sync phone, Task 4: List/search org members endpoint, Task 5: Frontend — real member table, wired to the new endpoint, Task 6: Pending-invites side panel (+1 more)

### Community 46 - "button.tsx"
Cohesion: 0.09
Nodes (47): ActivityLogs, AdvancedIdLookup(), AdvancedIdLookupProps, FormDrawerProps, FormSection(), RecentIdPicker(), RecentIdPickerProps, RecentRecords() (+39 more)

### Community 47 - "Starting Point — read this before touching any file"
Cohesion: 0.25
Nodes (7): Global Constraints, Self-Review Notes, Starting Point — read this before touching any file, Stock Transfer Redesign Implementation Plan, Task 1: Destination inventory resolution + item logging on complete, Task 2: `GET /stock-transfers` list endpoint, Task 3: Finish the frontend — fix the broken complete call, wire real history

### Community 48 - "UX Polish — UUID Labels, Filters, POS Layout, Chrome"
Cohesion: 0.07
Nodes (26): Acceptance, Acceptance, Acceptance, Acceptance, Collapsed sidebar tooltips, Decisions (locked), Design, Design (+18 more)

### Community 49 - "Ledger"
Cohesion: 0.25
Nodes (7): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, 2026-07-30 — Packaged Electron stuck on blank screen (BrowserRouter + empty resources), 2026-08-03 — Shipped frontend SKU auto-gen UI ahead of the backend that was supposed to power it, Entry format, Ledger, Lessons Learned, When to add an entry

### Community 50 - "ProductOnboardingWizard.tsx"
Cohesion: 0.13
Nodes (11): useCategoryParents(), useNextSku(), useUploadProductImage(), PendingImg, ProductOnboardingWizard(), Step, STEP_LABELS, UNITS (+3 more)

### Community 51 - "Users.tsx"
Cohesion: 0.13
Nodes (20): ClerkUsers, AssignOrgDrawer(), Props, EMPTY, InviteUserDrawer(), Props, PRESET_ROLES, Props (+12 more)

### Community 52 - "UnpublishedStock.tsx"
Cohesion: 0.11
Nodes (24): useAddUnpublishedStock(), useListRoles(), useListUserDirectory(), useProductLog(), useProductLogsByInventory(), usePublishUnpublishedStock(), useStockMovement(), useUnpublishedStock() (+16 more)

### Community 53 - "AuthContext.tsx"
Cohesion: 0.24
Nodes (14): AuthContext, AuthContextType, AuthProvider(), ClerkResources, clerkUserIdFromSession(), DEV_USER, hydrateFromCache(), loadMe() (+6 more)

### Community 54 - "Billing Module — Implementation Plan"
Cohesion: 0.12
Nodes (16): Bill Number Generation, `BillEntity` — `core.bills` (redefine existing), Billing Module — Implementation Plan, `BillItemEntity` — `core.bill_items` (new), Context, `CustomerEntity` — `core.customers` (no column changes), Files Created / Modified Summary, Final Schema (+8 more)

### Community 55 - "4-feature implementation TODO"
Cohesion: 0.33
Nodes (5): 4-feature implementation TODO, ✅ Done, 🔴 Fix first — live regression, ⬜ Stock transfer redesign — not started, ⬜ User management — not started

### Community 56 - "PurchaseOrderDetail.tsx"
Cohesion: 0.10
Nodes (25): DataTableProps, BaseProps, FilterDropdown(), FilterDropdownProps, FilterOption, groupOptions(), MultiProps, OptionContent() (+17 more)

### Community 57 - "File map"
Cohesion: 0.12
Nodes (15): File map, Global Constraints, Placeholder / consistency check, Recent-First Lookup UX Implementation Plan, Spec coverage (self-review), Task 10: Final verification, Task 1: Shared Recent primitives, Task 2: Stock Transfers + Unpublished Stock — demote UUID (+7 more)

### Community 59 - "ERP-Client Auto-Update (GitHub Private Releases)"
Cohesion: 0.12
Nodes (15): Acceptance, Architecture, Behavior (match NFC / Kata), Components, Current baseline, Decisions (locked), Dev (this machine), Environment note (+7 more)

### Community 60 - "Recent-First Lookup UX (+ Polish Leftovers)"
Cohesion: 0.12
Nodes (15): Acceptance, Data flow, Decisions (locked), Design, Goal, Non-goals, Out of scope follow-ups (document only), Polish leftovers (scope B) (+7 more)

### Community 61 - "UserRolePills.tsx"
Cohesion: 0.39
Nodes (7): useLinkProductSupplier(), useProductSuppliers(), useUnlinkProductSupplier(), useUpdateProductSupplier(), EMPTY_SUPPLIER_FORM, ProductSupplierLinksPanel(), SupplierLinkForm

### Community 62 - "File map"
Cohesion: 0.14
Nodes (13): File map, Global Constraints, Placeholder / consistency check, Spec coverage (self-review), Task 1: Shared label helper + vertical actions + tooltip primitive, Task 2: Wave A — POS full-bleed layout, Task 3: DataTable filter toolbar + scrollbar on table body, Task 4: Wave C (priority) — Bills / Inventory / Products / Customers filters + names (+5 more)

### Community 63 - "build"
Cohesion: 0.14
Nodes (13): build, appId, directories, files, npmRebuild, productName, publish, win (+5 more)

### Community 64 - "cn"
Cohesion: 0.29
Nodes (6): FE-only: Stores-first UX (hide Locations nav), Global Constraints, Task 1: Hide Locations from sidebar, Task 2: Relabel inventory Location pickers as “Store”, Task 3: Docs + design note, Verification

### Community 65 - "ThemeContext.tsx"
Cohesion: 0.18
Nodes (10): Topbar(), initialState, Theme, ThemeContext, ThemeProvider(), ThemeProviderProps, ThemeProviderState, useTheme() (+2 more)

### Community 66 - "auto-updater.ts"
Cohesion: 0.26
Nodes (11): cachedState, configureAuth(), getCheckIntervalMs(), initAutoUpdater(), send(), registerAppIpc(), AppUpdateSettings, DEFAULTS (+3 more)

### Community 67 - "ErrorState.tsx"
Cohesion: 0.23
Nodes (5): ERROR_COPY, ErrorStateType, ErrorIllustration(), ErrorState(), ErrorStateProps

### Community 68 - "ERP-Client ↔ Core API alignment (client-only)"
Cohesion: 0.29
Nodes (6): Client API Alignment Implementation Plan, Global Constraints, Task 1: Remove OrgAddresses / UserAddresses, Task 2: Wire category parents + clean Vehicles API export, Task 3: Dual product image upload (multipart + presigned), Task 4: Verification

### Community 69 - "Inventory.tsx"
Cohesion: 0.10
Nodes (18): Inventory, Products, useInventoryLowStock(), useInventoryValuation(), GuideModal(), GuideModalProps, GuideStep, formatValuation() (+10 more)

### Community 70 - "CategoryDetailModal.tsx"
Cohesion: 0.23
Nodes (9): CategoryDetailModal(), formatDate(), Props, ConfirmDialogProps, DialogContent, DialogFooter(), DialogHeader(), DialogTitle (+1 more)

### Community 71 - "File map"
Cohesion: 0.33
Nodes (5): Cross-cutting FE issues (extra, not asked), Frontend ↔ Backend parity (section-by-section), Open questions (do not assume), Section matrix, Suggested work order (proposal only — confirm)

### Community 72 - "formatEntityLabel"
Cohesion: 0.14
Nodes (15): useStockMovementsByInventory(), useStockOperation(), useAutoSelectFirst(), EMPTY_META, EMPTY_OP, InventoryDetailPage(), MetaForm, STOCK_OPS (+7 more)

### Community 73 - "Error State Pages — Design Spec"
Cohesion: 0.33
Nodes (5): Confirmed missing (Section 7 of frontend inventory API guide), Core-apis inventory endpoint audit, Frontend stance for sub-project 3, Present and usable, Proposed backend fixes (awaiting approval — not implemented)

### Community 74 - "PurchaseOrderReceive.tsx"
Cohesion: 0.18
Nodes (8): Bills, PaymentTransactions, PurchaseOrders, Suppliers, canVerify(), PurchaseOrderReceive(), STATUS_CONFIG, PurchaseOrderStatus

### Community 75 - "index.ts"
Cohesion: 0.33
Nodes (7): createWindow(), gotLock, MIME, resolveSafePath(), serveFile(), startStaticServer(), stopStaticServer()

### Community 76 - "Global Constraints"
Cohesion: 0.25
Nodes (7): ERP-Client Auto-Update Implementation Plan, Global Constraints, Spec coverage, Task 1: Dependencies + main settings + logger + auto-updater, Task 2: Preload + build-main + index wiring, Task 3: Renderer UI — banner, App Updates page, nav/route, Task 4: Verification

### Community 77 - "package.json"
Cohesion: 0.25
Nodes (7): author, description, license, main, name, type, version

### Community 78 - "Global Constraints"
Cohesion: 0.40
Nodes (4): File map, POS / Billing Implementation Plan (ERP-Client only), Task 1: Checkout orchestrator, Task 2: POSTerminal page + nav + route

### Community 79 - "useAuth"
Cohesion: 0.33
Nodes (6): AuthBootPhase, AuthBootScreen(), ORDER, Props, STEPS, stepState()

### Community 80 - "Locations.tsx"
Cohesion: 0.40
Nodes (5): useListCities(), useListStates(), useRemoveLocationImage(), useUploadLocationImage(), LocationsPage()

### Community 81 - "AppLayout.tsx"
Cohesion: 0.47
Nodes (3): formatSpeed(), UpdateBanner(), UpdateState

### Community 82 - "SidebarNav.tsx"
Cohesion: 0.40
Nodes (4): NAV_ITEMS, NavItem, Props, SidebarNav()

### Community 83 - "ProductImageUploader.tsx"
Cohesion: 0.50
Nodes (3): PendingImage, ProductImageUploaderProps, ProductImage

### Community 84 - "nsis"
Cohesion: 0.50
Nodes (4): nsis, allowToChangeInstallationDirectory, differentialPackage, oneClick

### Community 88 - "Dashboard.tsx"
Cohesion: 0.67
Nodes (3): StockTransfers, useCompleteStockTransfer(), StockTransfersPage()

## Knowledge Gaps
- **681 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+676 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button` connect `FormDrawer.tsx` to `ErrorState.tsx`, `Inventory.tsx`, `CategoryDetailModal.tsx`, `Bills.tsx`, `formatEntityLabel`, `ItemReturns.tsx`, `BillDetail.tsx`, `button.tsx`, `ProductDetailView.tsx`, `ProductOnboardingWizard.tsx`, `Users.tsx`, `Unify on Stores — design`, `UnpublishedStock.tsx`, `PurchaseOrderDetail.tsx`, `PendingInvitesPanel.tsx`, `UserRolePills.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `cn()` connect `utils.ts` to `ErrorState.tsx`, `CategoryDetailModal.tsx`, `ItemReturns.tsx`, `button.tsx`, `ProductDetailView.tsx`, `ProductOnboardingWizard.tsx`, `Unify on Stores — design`, `Users.tsx`, `PurchaseOrderDetail.tsx`, `FormDrawer.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `formatEntityLabel()` connect `button.tsx` to `Inventory.tsx`, `Bills.tsx`, `formatEntityLabel`, `ItemReturns.tsx`, `BillDetail.tsx`, `get`, `ProductDetailView.tsx`, `UnpublishedStock.tsx`, `FormDrawer.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _681 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._