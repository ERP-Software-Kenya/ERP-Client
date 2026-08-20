# Graph Report - ERP-Client  (2026-08-13)

## Corpus Check
- 256 files · ~220,116 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2633 nodes · 5180 edges · 162 communities (147 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25f47567`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PageAccessContext.tsx
- graphify explain <concept>
- scripts
- graphify-out/wiki/index.md
- dependencies
- devDependencies
- graphify path <A> <B>
- compilerOptions
- graphify update .
- compilerOptions
- POSTerminal.tsx
- Trips/index.tsx
- graphify query <question>
- Content-Security-Policy meta tag
- ViewDrawer.tsx
- Context: Purchase Order Flow
- 2b. Backend changes (`core-apis/src/application/modules/categories/`)
- Administration User Management & Stock Transfer Redesign
- Login/index.tsx
- User Management
- Complete endpoint catalog
- launch-electron.ts
- VehiclesView.tsx
- POS billing UX, credit flow, settings, and split screens — design
- /src/main.jsx entry script
- build-main.ts
- publish-release.ts
- Core API changes needed by ERP-Client
- User Management — Frontend Implementation Guide
- types.ts
- usePagination
- server.cjs
- Senior Frontend
- Button
- http.ts
- Senior Prompt Engineer
- Sales v2 — Simple UI (POS + Documents + Approvals + Black Ledger)
- File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`)
- input.tsx
- SalesDashboard.tsx
- App.tsx
- ItemReturns/index.tsx
- HIGH PRIORITY
- Unify on Stores — design
- Global Constraints
- Orders/index.tsx
- Starting Point — read this before touching any file
- UX Polish — UUID Labels, Filters, POS Layout, Chrome
- Ledger
- ProductOnboardingWizard.tsx
- cn
- inventory/api/index.ts
- AuthContext.tsx
- Billing Module — Implementation Plan
- purchasing/types/index.ts
- FilterDropdown.tsx
- File map
- vite-env.d.ts
- ERP-Client Auto-Update (GitHub Private Releases)
- Recent-First Lookup UX (+ Polish Leftovers)
- Frontend Best Practices
- File map
- build
- Nextjs Optimization Guide
- SessionContext.tsx
- auto-updater.ts
- ErrorState.tsx
- React Patterns
- button.tsx
- CategoryDetailModal.tsx
- Using Git Worktrees
- formatEntityLabel
- inventory/types/index.ts
- PurchaseOrderDetail/index.tsx
- index.ts
- Global Constraints
- package.json
- Visual Companion Guide
- AuthBootScreen.tsx
- api.ts
- Topbar.tsx
- spotlight-search.mjs
- ProductImage
- nsis
- global.d.ts
- preload.ts
- Dashboard Redesign — Session Context
- Dashboard/index.tsx
- Global Constraints
- Sales v2 — Credit Sales & Black Sales/Inventory — design
- Code Review Reception
- Agentic System Design
- Llm Evaluation Frameworks
- Prompt Engineering Patterns
- Systematic Debugging
- File map
- useAuth
- core/types/index.ts
- Root Cause Tracing
- Maintenance/index.tsx
- fleet/types/index.ts
- BundleAnalyzer
- ComponentGenerator
- FrontendScaffolder
- ERP-Client Development Guidelines & Best Practices
- auth/types/index.ts
- Defense-in-Depth Validation
- Verification Before Completion
- Auth Rebuild: Login, Sign-up, Google OAuth — Design
- File map
- File Structure
- ERP-Client ↔ Core API alignment (client-only)
- ProductDetailView.tsx
- Subagent-Driven Development
- POS / Billing UX redesign — design
- POS billing: customer-type auto-fill + inline new-customer creation
- File map
- Login split layout — design
- AgentOrchestrator
- PromptOptimizer
- RagEvaluator
- Shared Frontend Layer Rewrite — Design
- Error State Pages — Design Spec
- Brainstorming Ideas Into Designs
- Search Skill: Spotlight Search
- Condition-Based Waiting
- Global Constraints
- File map
- resource.ts
- Context: Full Session Record — 2026-08-12
- File map
- POS / Billing — design
- InventoryDashboard.tsx
- buildSaleDocHtml.ts
- Part A — Roles & RBAC (core-apis)
- Global Constraints
- Global Constraints
- Global Constraints
- sales/types/index.ts
- Part D — POS stock awareness (NEW today)
- Frontend ↔ Backend parity (section-by-section)
- Core-apis inventory endpoint audit
- PurchaseDashboard.tsx
- Part B — Roles & page access (ERP-Client)
- Part C — POS UX refactor (prior design, implemented)
- Part E — Credit approvals flow
- File map
- A.7 Uncommitted backend hardening
- Complete file manifest
- Part H — Commit status & suggested grouping
- Part I — Verification checklist
- start-server.sh
- stop-server.sh
- spec-document-reviewer-prompt.md
- code-quality-reviewer-prompt.md
- implementer-prompt.md
- spec-reviewer-prompt.md
- find-polluter.sh

## God Nodes (most connected - your core abstractions)
1. `get()` - 74 edges
2. `Button` - 56 edges
3. `formatEntityLabel()` - 54 edges
4. `cn()` - 49 edges
5. `Input` - 39 edges
6. `usePagination()` - 36 edges
7. `Field()` - 33 edges
8. `FormDrawer()` - 31 edges
9. `Complete endpoint catalog` - 29 edges
10. `useAuth()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `CategoriesPage()` --indirect_call--> `useCategoryParents()`  [INFERRED]
  renderer/src/pages/Categories/index.tsx → renderer/src/api.ts
- `Props` --references--> `Category`  [EXTRACTED]
  renderer/src/components/CategoryDetailModal.tsx → renderer/src/types.ts
- `CustomerFormDrawerProps` --references--> `Customer`  [EXTRACTED]
  renderer/src/components/CustomerFormDrawer.tsx → renderer/src/types.ts
- `TriggerButton()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/FilterDropdown.tsx → renderer/src/lib/utils.ts
- `SearchBox()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/FilterDropdown.tsx → renderer/src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (162 total, 15 thin omitted)

### Community 0 - "PageAccessContext.tsx"
Cohesion: 0.15
Nodes (16): PageAccess, PageAccessGate(), PageAccessRoute(), PageAccessRouteProps, ALL_ITEMS, ModuleGroup, ModuleItem, pageKeyForPath() (+8 more)

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
Nodes (21): DOM.Iterable, src, compilerOptions, isolatedModules, jsx, lib, module, moduleResolution (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (24): renderer, scripts/**/*.ts, src/main/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib (+16 more)

### Community 10 - "POSTerminal.tsx"
Cohesion: 0.05
Nodes (81): CUSTOMER_TYPE_OPTIONS, CustomerFormDrawer(), CustomerFormDrawerProps, emptyForm(), formFromCustomer(), FormState, useDebounce(), parseCreditApprovalError() (+73 more)

### Community 11 - "Trips/index.tsx"
Cohesion: 0.06
Nodes (44): FleetDrivers, FleetExpensesApi, FleetTrips, FleetVehicles, VehicleTypes, FleetDrivers, FleetTrips, FleetVehicles (+36 more)

### Community 12 - "graphify query <question>"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "Content-Security-Policy meta tag"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "ViewDrawer.tsx"
Cohesion: 0.33
Nodes (7): ImageLightbox(), ImageLightboxProps, FieldValue(), formatScalar(), isImageUrl(), NestedObject(), Props

### Community 15 - "Context: Purchase Order Flow"
Cohesion: 0.04
Nodes (44): 10. File Index, 1. POS Terminal Refactor (`renderer/src/pages/pos/POSTerminal.tsx`), 1a. What was requested, 1b. Imports removed, 1c. State and hooks removed, 1d. orgId derivation, 1e. Location auto-select simplified, 1f. Location DropdownMenu pattern (+36 more)

### Community 16 - "2b. Backend changes (`core-apis/src/application/modules/categories/`)"
Cohesion: 0.05
Nodes (43): 1. Products Module, 1a. What was requested, 1b. Backend changes (`core-apis`), 1c. Frontend changes (`renderer`), 2. Categories Module, 2a. What was requested, 2b. Backend changes (`core-apis/src/application/modules/categories/`), 2c. Frontend changes (`renderer`) (+35 more)

### Community 17 - "Administration User Management & Stock Transfer Redesign"
Cohesion: 0.12
Nodes (15): Administration User Management & Stock Transfer Redesign, Backend changes, Backend changes (`core-apis`), Context, Error handling, Error handling, Feature 1: User Management, Feature 2: Stock Transfer Redesign (+7 more)

### Community 18 - "Login/index.tsx"
Cohesion: 0.19
Nodes (11): LoginVisualPanel(), Label, labelVariants, clerkErrorMessage(), Login(), Mode, SecondFactorStrategy, clerkErrorMessage() (+3 more)

### Community 19 - "User Management"
Cohesion: 0.15
Nodes (12): ✅ Already done, Backend Requirements — User Management + Stock Transfer, ⬜ `DELETE /api/v1/auth/members/:id` — new, ⬜ `GET /api/v1/auth/members` — new, ⬜ `GET /api/v1/stock-transfers` — new, ⬜ `POST /api/v1/auth/invite` — fix, don't add, ⬜ `PUT /api/v1/stock-transfers/:id/complete` — fix existing, Setup for whoever/whatever implements this (+4 more)

### Community 20 - "Complete endpoint catalog"
Cohesion: 0.05
Nodes (38): `activity-logs` (2 routes), `auth` (5 routes), `bills` (6 routes), `categories` (7 routes), Complete endpoint catalog, Core-apis full endpoint audit, Create + getById only (no list/search/update/delete), `customers` (2 routes) (+30 more)

### Community 21 - "launch-electron.ts"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "VehiclesView.tsx"
Cohesion: 0.11
Nodes (17): ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM, MOCK_STORE (+9 more)

### Community 23 - "POS billing UX, credit flow, settings, and split screens — design"
Cohesion: 0.06
Nodes (34): After Approve, After Reject, Backend credit enforcement, Background, Credit search, Customer-type defaults, Decisions (locked), Discount application on POS (+26 more)

### Community 24 - "/src/main.jsx entry script"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

### Community 26 - "publish-release.ts"
Cohesion: 0.40
Nodes (4): envPath, pkg, pkgPath, root

### Community 27 - "Core API changes needed by ERP-Client"
Cohesion: 0.07
Nodes (29): #0 — Purchase Orders create/update incomplete, #0b — Purchase Order line / related actions, #0c — Bills ↔ Purchase Order linkage missing, #0d — Payment transactions `orgId` vs `organizationId`, #0e — Item returns, #10 — Auth / tenancy on thin creates, #1 — Bills / POs list-search instability, #8 — Customers (and cascade) organizationId never set (+21 more)

### Community 29 - "User Management — Frontend Implementation Guide"
Cohesion: 0.07
Nodes (27): 1. Architecture Overview, 2. New TypeScript Types, 3. API Hooks — `api.ts` additions, 4. Reusable Sub-components, 4a. `UserStatusBadge.tsx`, 4b. `UserRolePills.tsx`, 4c. `InviteUserDrawer.tsx`, 4d. `UpdateRolesDrawer.tsx` (+19 more)

### Community 30 - "types.ts"
Cohesion: 0.09
Nodes (85): Roles, UserRoles, ActivityLogs, notificationsBase, ProductSupplierLinkBody, ReportGenerationLogs, FuelTypes, VehicleBrands (+77 more)

### Community 31 - "usePagination"
Cohesion: 0.09
Nodes (41): Categories, Suppliers, useListActivityLogs(), ConfirmDialog(), ConfirmDialogProps, Column, DataTable(), DataTableProps (+33 more)

### Community 32 - "server.cjs"
Cohesion: 0.11
Nodes (26): broadcast(), clients, computeAcceptKey(), CONTENT_DIR, crypto, debounceTimers, decodeFrame(), encodeFrame() (+18 more)

### Community 33 - "Senior Frontend"
Cohesion: 0.07
Nodes (26): 1. Component Generator, 1. Setup and Configuration, 2. Bundle Analyzer, 2. Run Quality Checks, 3. Frontend Scaffolder, 3. Implement Best Practices, Best Practices Summary, Code Quality (+18 more)

### Community 34 - "Button"
Cohesion: 0.14
Nodes (17): ClerkUsers, Button, ClerkUsers, AssignOrgDrawer(), Props, EMPTY, InviteUserDrawer(), Props (+9 more)

### Community 35 - "http.ts"
Cohesion: 0.14
Nodes (23): useCancelStockTransfer(), useCompleteStockTransfer(), useUploadProductImage(), useCancelStockTransfer(), useCompleteStockTransfer(), useRemoveLocationImage(), useUnlinkProductSupplier(), useUpdateProductSupplier() (+15 more)

### Community 36 - "Senior Prompt Engineer"
Cohesion: 0.09
Nodes (22): 1. Prompt Engineering Patterns, 2. Llm Evaluation Frameworks, 3. Agentic System Design, Best Practices, Common Commands, Core Expertise, Development, Main Capabilities (+14 more)

### Community 37 - "Sales v2 — Simple UI (POS + Documents + Approvals + Black Ledger)"
Cohesion: 0.09
Nodes (22): Approach, Black behavior, Black Ledger page, Credit behavior, Design principle, Documents (Task 15 UI), Explicitly deferred, Files likely touched (+14 more)

### Community 38 - "File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`)"
Cohesion: 0.09
Nodes (21): File inventory (verified via `grep -rl "from '../api'"` across `renderer/src`), Global Constraints, Program context, Self-review notes, Shared Frontend Layer Rewrite Implementation Plan, Task 10: Migrate core CRUD list pages (ERPDataTable + useResourceMutations pattern), Task 11: Migrate create-only form pages (no table, just `useMutation` + optional `ResourceSelect`), Task 12: Migrate `Users.tsx` (+13 more)

### Community 39 - "input.tsx"
Cohesion: 0.13
Nodes (16): Expenses, Locations, Props, SingleImageUploader(), Input, InputProps, EMPTY, ExpensesPage() (+8 more)

### Community 40 - "SalesDashboard.tsx"
Cohesion: 0.33
Nodes (4): Analytics, COLORS, fmt(), SalesDashboard()

### Community 41 - "App.tsx"
Cohesion: 0.04
Nodes (53): ActivityLogs, AppUpdates, AuditLog, BillDetail, Bills, BlackLedger, Categories, CreateOrganization (+45 more)

### Community 42 - "ItemReturns/index.tsx"
Cohesion: 0.09
Nodes (38): Organizations, useListCountries(), useListRoles(), useListUserDirectory(), useListUserRoles(), Field(), FormDrawer(), FormDrawerProps (+30 more)

### Community 43 - "HIGH PRIORITY"
Cohesion: 0.06
Nodes (33): 10. No Runtime Schema Validation (Zod), 11. Dead Code: `static-server.ts`, 12. `stitch_product_details_view/` at Repo Root, 13. No `@tanstack/react-query-devtools` in Dev, 14. No Form Library — Manual State on Every Form, 15. Only 2 Custom Hooks for 44 Pages, 16. No `engines` Field in `package.json`, 17. No Barrel Exports / Index Files (+25 more)

### Community 44 - "Unify on Stores — design"
Cohesion: 0.09
Nodes (21): API client, Backend changes, Current state (problem), Data migration, Decision, Frontend changes, Goal, Inventory cluster pages (+13 more)

### Community 45 - "Global Constraints"
Cohesion: 0.20
Nodes (9): Global Constraints, Self-Review Notes, Task 1: `org_member` schema migration, Task 2: Fix invite flow — allow inviting unregistered emails, actually send the email, Task 3: Reconcile pending invites on sign-in, sync phone, Task 4: List/search org members endpoint, Task 5: Frontend — real member table, wired to the new endpoint, Task 6: Pending-invites side panel (+1 more)

### Community 46 - "Orders/index.tsx"
Cohesion: 0.07
Nodes (51): Invoices, Orders, PlatformConfigurations, PurchaseItems, AdvancedIdLookup(), AdvancedIdLookupProps, FormSection(), RecentIdPicker() (+43 more)

### Community 47 - "Starting Point — read this before touching any file"
Cohesion: 0.25
Nodes (7): Global Constraints, Self-Review Notes, Starting Point — read this before touching any file, Stock Transfer Redesign Implementation Plan, Task 1: Destination inventory resolution + item logging on complete, Task 2: `GET /stock-transfers` list endpoint, Task 3: Finish the frontend — fix the broken complete call, wire real history

### Community 48 - "UX Polish — UUID Labels, Filters, POS Layout, Chrome"
Cohesion: 0.07
Nodes (26): Acceptance, Acceptance, Acceptance, Acceptance, Collapsed sidebar tooltips, Decisions (locked), Design, Design (+18 more)

### Community 49 - "Ledger"
Cohesion: 0.13
Nodes (13): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, 2026-07-30 — Packaged Electron stuck on blank screen (BrowserRouter + empty resources), 2026-08-03 — Shipped frontend SKU auto-gen UI ahead of the backend that was supposed to power it, 2026-08-13 — Claimed OAuth 2FA/device-trust session-resume fix that isn't in the repo, Entry format, Ledger, Lessons Learned, When to add an entry (+5 more)

### Community 50 - "ProductOnboardingWizard.tsx"
Cohesion: 0.11
Nodes (18): useCategoryParents(), useLinkProductSupplier(), useNextSku(), useProductSuppliers(), useUnlinkProductSupplier(), useUpdateProductSupplier(), Textarea, TextareaProps (+10 more)

### Community 51 - "cn"
Cohesion: 0.14
Nodes (18): Sidebar(), Tooltip(), Props, ROLE_COLORS, roleColor(), UserRolePills(), Props, UserStatusBadge() (+10 more)

### Community 52 - "inventory/api/index.ts"
Cohesion: 0.06
Nodes (42): useAddUnpublishedStock(), useProductLog(), usePublishUnpublishedStock(), useStockMovement(), useUnpublishedStock(), useUnpublishedStockList(), useUnpublishedStockMovements(), useListRoles() (+34 more)

### Community 53 - "AuthContext.tsx"
Cohesion: 0.19
Nodes (16): AuthContext, AuthContextType, AuthProvider(), ClerkResources, clerkUserIdFromSession(), DEV_USER, hydrateFromCache(), loadMe() (+8 more)

### Community 54 - "Billing Module — Implementation Plan"
Cohesion: 0.12
Nodes (16): Bill Number Generation, `BillEntity` — `core.bills` (redefine existing), Billing Module — Implementation Plan, `BillItemEntity` — `core.bill_items` (new), Context, `CustomerEntity` — `core.customers` (no column changes), Files Created / Modified Summary, Final Schema (+8 more)

### Community 55 - "purchasing/types/index.ts"
Cohesion: 0.09
Nodes (21): Bill, BillItem, BillStatus, CreateBillInput, CreateBillItemInput, CreatePurchaseOrderInput, CreatePurchaseOrderItemInput, EExpenseStatus (+13 more)

### Community 56 - "FilterDropdown.tsx"
Cohesion: 0.15
Nodes (17): BaseProps, FilterDropdownProps, FilterOption, groupOptions(), MultiProps, OptionContent(), SearchBox(), SingleProps (+9 more)

### Community 57 - "File map"
Cohesion: 0.12
Nodes (15): File map, Global Constraints, Placeholder / consistency check, Recent-First Lookup UX Implementation Plan, Spec coverage (self-review), Task 10: Final verification, Task 1: Shared Recent primitives, Task 2: Stock Transfers + Unpublished Stock — demote UUID (+7 more)

### Community 59 - "ERP-Client Auto-Update (GitHub Private Releases)"
Cohesion: 0.12
Nodes (15): Acceptance, Architecture, Behavior (match NFC / Kata), Components, Current baseline, Decisions (locked), Dev (this machine), Environment note (+7 more)

### Community 60 - "Recent-First Lookup UX (+ Polish Leftovers)"
Cohesion: 0.12
Nodes (15): Acceptance, Data flow, Decisions (locked), Design, Goal, Non-goals, Out of scope follow-ups (document only), Polish leftovers (scope B) (+7 more)

### Community 61 - "Frontend Best Practices"
Cohesion: 0.10
Nodes (20): Anti-Pattern 1, Anti-Pattern 2, Anti-Patterns to Avoid, Code Organization, Common Patterns, Conclusion, Frontend Best Practices, Further Reading (+12 more)

### Community 62 - "File map"
Cohesion: 0.14
Nodes (13): File map, Global Constraints, Placeholder / consistency check, Spec coverage (self-review), Task 1: Shared label helper + vertical actions + tooltip primitive, Task 2: Wave A — POS full-bleed layout, Task 3: DataTable filter toolbar + scrollbar on table body, Task 4: Wave C (priority) — Bills / Inventory / Products / Customers filters + names (+5 more)

### Community 63 - "build"
Cohesion: 0.14
Nodes (13): build, appId, directories, files, npmRebuild, productName, publish, win (+5 more)

### Community 64 - "Nextjs Optimization Guide"
Cohesion: 0.10
Nodes (20): Anti-Pattern 1, Anti-Pattern 2, Anti-Patterns to Avoid, Code Organization, Common Patterns, Conclusion, Further Reading, Guidelines (+12 more)

### Community 65 - "SessionContext.tsx"
Cohesion: 0.13
Nodes (16): deriveOrg(), deriveUser(), SessionContext, SessionContextValue, SessionOrg, SessionProvider(), SessionUser, initialState (+8 more)

### Community 66 - "auto-updater.ts"
Cohesion: 0.26
Nodes (11): cachedState, configureAuth(), getCheckIntervalMs(), initAutoUpdater(), send(), registerAppIpc(), AppUpdateSettings, DEFAULTS (+3 more)

### Community 67 - "ErrorState.tsx"
Cohesion: 0.23
Nodes (5): ERROR_COPY, ErrorStateType, ErrorIllustration(), ErrorState(), ErrorStateProps

### Community 68 - "React Patterns"
Cohesion: 0.10
Nodes (20): Anti-Pattern 1, Anti-Pattern 2, Anti-Patterns to Avoid, Code Organization, Common Patterns, Conclusion, Further Reading, Guidelines (+12 more)

### Community 69 - "button.tsx"
Cohesion: 0.09
Nodes (19): GuideModal(), GuideModalProps, GuideStep, ButtonProps, buttonVariants, CreateForm, GUIDE_STEPS, OpDef (+11 more)

### Community 70 - "CategoryDetailModal.tsx"
Cohesion: 0.24
Nodes (7): CategoryDetailModal(), formatDate(), Props, DialogContent, DialogFooter(), DialogHeader(), DialogTitle

### Community 71 - "Using Git Worktrees"
Cohesion: 0.10
Nodes (20): 1a. Native Worktree Tools (preferred), 1b. Git Worktree Fallback, Assuming directory location, Common Mistakes, Create the Worktree, Directory Selection, Fighting the harness, Overview (+12 more)

### Community 72 - "formatEntityLabel"
Cohesion: 0.09
Nodes (44): Bills, Customers, Products, useProductLogsByInventory(), useStockMovementsByInventory(), useStockOperation(), Inventory, Products (+36 more)

### Community 73 - "inventory/types/index.ts"
Cohesion: 0.10
Nodes (20): Category, ItemReturn, Location, LocationType, Product, ProductImage, ProductImageUploadUrl, ProductLog (+12 more)

### Community 74 - "PurchaseOrderDetail/index.tsx"
Cohesion: 0.18
Nodes (13): PurchaseOrders, PurchaseOrders, getErrorMessage(), canMarkOrdered(), canVerify(), fmt(), fmtDate(), PurchaseOrderDetail() (+5 more)

### Community 75 - "index.ts"
Cohesion: 0.33
Nodes (7): createWindow(), gotLock, MIME, resolveSafePath(), serveFile(), startStaticServer(), stopStaticServer()

### Community 76 - "Global Constraints"
Cohesion: 0.25
Nodes (7): ERP-Client Auto-Update Implementation Plan, Global Constraints, Spec coverage, Task 1: Dependencies + main settings + logger + auto-updater, Task 2: Preload + build-main + index wiring, Task 3: Renderer UI — banner, App Updates page, nav/route, Task 4: Verification

### Community 77 - "package.json"
Cohesion: 0.25
Nodes (7): author, description, license, main, name, type, version

### Community 78 - "Visual Companion Guide"
Cohesion: 0.10
Nodes (19): Browser Events Format, Cards (visual designs), Cleaning Up, CSS Classes Available, Design Tips, File Naming, How It Works, Mock elements (wireframe building blocks) (+11 more)

### Community 79 - "AuthBootScreen.tsx"
Cohesion: 0.33
Nodes (6): AuthBootPhase, AuthBootScreen(), ORDER, Props, STEPS, stepState()

### Community 80 - "api.ts"
Cohesion: 0.08
Nodes (26): ActivityLogs, billsBase, customersBase, ExpensesApi, FuelTypes, ItemReturns, notificationsBase, PRODUCT_IMAGE_MIME_TYPES (+18 more)

### Community 81 - "Topbar.tsx"
Cohesion: 0.21
Nodes (7): Notifications, Topbar(), formatSpeed(), UpdateBanner(), UpdateState, useTheme(), Notifications

### Community 82 - "spotlight-search.mjs"
Cohesion: 0.21
Nodes (19): dedupeHits(), detectIntent(), filterNoise(), gatherStoryFiles(), main(), parseArgs(), parseAstIndexSearch(), parseAstIndexSymbol() (+11 more)

### Community 83 - "ProductImage"
Cohesion: 0.50
Nodes (3): PendingImage, ProductImageUploaderProps, ProductImage

### Community 84 - "nsis"
Cohesion: 0.50
Nodes (4): nsis, allowToChangeInstallationDirectory, differentialPackage, oneClick

### Community 87 - "Dashboard Redesign — Session Context"
Cohesion: 0.10
Nodes (19): 3 Tabs, Animation System, Architecture, Backend endpoints needed for full real data, Card entry (`useFadeIn` hook + `AnimFade` wrapper), Chart animations (Recharts built-in), Chart Inventory, Component Map (Dashboard/index.tsx) (+11 more)

### Community 88 - "Dashboard/index.tsx"
Cohesion: 0.10
Nodes (24): PaymentTransactions, StockTransfers, useInventoryValuation(), useSession(), PaymentTransactions, StockTransfers, AnimFade(), C (+16 more)

### Community 89 - "Global Constraints"
Cohesion: 0.11
Nodes (18): Global Constraints, Sales v2 — Credit Sales & Black Sales/Inventory Implementation Plan, Self-Review Notes, Task 10: Black ledger read endpoint + mark-commission-paid, Task 11: Frontend — `types.ts` + `api.ts` extensions, Task 12: `POSTerminal.tsx` — sale type, customer type, credit display, payment timing, hold/draft, Task 13: `POSTerminal.tsx` — Black mode UI (charged price, facilitator, commission), Task 14: Pending Approvals page + Black Ledger page (+10 more)

### Community 90 - "Sales v2 — Credit Sales & Black Sales/Inventory — design"
Cohesion: 0.11
Nodes (18): Background, `BillEntity` — new columns, Black sale flow, `CommissionPayable` — new table, Credit flow, `CreditApprovalRequest` — new table, `CustomerCreditTransaction` — new table, `CustomerEntity` — new columns (+10 more)

### Community 91 - "Code Review Reception"
Cohesion: 0.11
Nodes (17): Acknowledging Correct Feedback, Code Review Reception, Common Mistakes, Forbidden Responses, From External Reviewers, From your human partner, GitHub Thread Replies, Gracefully Correcting Your Pushback (+9 more)

### Community 92 - "Agentic System Design"
Cohesion: 0.12
Nodes (16): Advanced Patterns, Agentic System Design, Best Practices, Code Quality, Core Principles, Further Reading, Overview, Pattern 1: Distributed Processing (+8 more)

### Community 93 - "Llm Evaluation Frameworks"
Cohesion: 0.12
Nodes (16): Advanced Patterns, Best Practices, Code Quality, Core Principles, Further Reading, Llm Evaluation Frameworks, Overview, Pattern 1: Distributed Processing (+8 more)

### Community 94 - "Prompt Engineering Patterns"
Cohesion: 0.12
Nodes (16): Advanced Patterns, Best Practices, Code Quality, Core Principles, Further Reading, Overview, Pattern 1: Distributed Processing, Pattern 2: Real-Time Systems (+8 more)

### Community 95 - "Systematic Debugging"
Cohesion: 0.12
Nodes (15): Common Rationalizations, Overview, Phase 1: Root Cause Investigation, Phase 2: Pattern Analysis, Phase 3: Hypothesis and Testing, Phase 4: Implementation, Quick Reference, Red Flags - STOP and Follow Process (+7 more)

### Community 96 - "File map"
Cohesion: 0.12
Nodes (15): File map, Global Constraints, Plan self-review, Spec coverage checklist, Task 10: End-to-end verification, Task 1: Store entity — type + imageKey, Task 2: Migration — store columns + inventory FK cutover, Task 3: Stores application layer — real create/update + type (+7 more)

### Community 97 - "useAuth"
Cohesion: 0.22
Nodes (12): CreditApprovals, SessionRoute(), ProtectedRoute(), useAuth(), BlackLedgerPage(), fmt(), BlackLedger(), PendingApprovals() (+4 more)

### Community 98 - "core/types/index.ts"
Cohesion: 0.12
Nodes (15): ACTIVITY_LOG_ACTIONS, ActivityLog, City, Country, InventoryItem, InventorySummaryData, Notification, Organization (+7 more)

### Community 99 - "Root Cause Tracing"
Cohesion: 0.13
Nodes (14): 1. Observe the Symptom, 2. Find Immediate Cause, 3. Ask: What Called This?, 4. Keep Tracing Up, 5. Find Original Trigger, Adding Stack Traces, Finding Which Test Causes Pollution, Key Principle (+6 more)

### Community 100 - "Maintenance/index.tsx"
Cohesion: 0.15
Nodes (11): FleetMaintenanceApi, MaintenanceTypes, FormSelect(), FormSelectProps, SelectOption, FleetMaintenanceApi, MaintenanceTypes, EMPTY (+3 more)

### Community 101 - "fleet/types/index.ts"
Cohesion: 0.14
Nodes (13): FleetDriver, FleetDriverStatus, FleetMaintenance, FleetTrip, FleetTripStatus, FleetVehicle, FleetVehicleStatus, FuelTypeRef (+5 more)

### Community 102 - "BundleAnalyzer"
Cohesion: 0.22
Nodes (7): BundleAnalyzer, main(), Main class for bundle analyzer functionality, Execute the main functionality, Validate the target path exists and is accessible, Perform the main analysis or operation, Generate and display the report

### Community 103 - "ComponentGenerator"
Cohesion: 0.22
Nodes (7): ComponentGenerator, main(), Main class for component generator functionality, Execute the main functionality, Validate the target path exists and is accessible, Perform the main analysis or operation, Generate and display the report

### Community 104 - "FrontendScaffolder"
Cohesion: 0.22
Nodes (7): FrontendScaffolder, main(), Main class for frontend scaffolder functionality, Execute the main functionality, Validate the target path exists and is accessible, Perform the main analysis or operation, Generate and display the report

### Community 105 - "ERP-Client Development Guidelines & Best Practices"
Cohesion: 0.15
Nodes (12): 1. Architecture Overview, 2. Folder Structure Best Practices, 3. Maintaining Code & Logic, 4. UI & Styling (Tailwind + Radix), 5. What We HAVE To Do (The DOs), 6. What We DO NOT Have To Do (The DONTs), Building Components, Component Logic (+4 more)

### Community 106 - "auth/types/index.ts"
Cohesion: 0.15
Nodes (12): AssignOrgPayload, ClerkInvitation, ClerkOrganization, ClerkUser, ClerkUserListResponse, ClerkUserRolesResponse, InviteUserPayload, PageAccessConfig (+4 more)

### Community 107 - "Defense-in-Depth Validation"
Cohesion: 0.17
Nodes (11): Applying the Pattern, Defense-in-Depth Validation, Example from Session, Key Insight, Layer 1: Entry Point Validation, Layer 2: Business Logic Validation, Layer 3: Environment Guards, Layer 4: Debug Instrumentation (+3 more)

### Community 108 - "Verification Before Completion"
Cohesion: 0.17
Nodes (11): Common Failures, Key Patterns, Overview, Rationalization Prevention, Red Flags - STOP, The Bottom Line, The Gate Function, The Iron Law (+3 more)

### Community 109 - "Auth Rebuild: Login, Sign-up, Google OAuth — Design"
Cohesion: 0.17
Nodes (11): Auth Rebuild: Login, Sign-up, Google OAuth — Design, Backend design (`core-apis`), Context, Data flow — Google OAuth with existing 2FA user (the bug being fixed), Dropped vs. kept (per requirements gathering), Error handling, Frontend design, Out of scope (+3 more)

### Community 110 - "File map"
Cohesion: 0.17
Nodes (11): File map, Global Constraints, Risks, Sales v2 Simple UI Implementation Plan, Spec coverage check, Task 1: Payment methods + checkout receipt fields, Task 2: POS progressive UI (layout, credit meter, black columns, delivery), Task 3: Print documents + success actions (+3 more)

### Community 111 - "File Structure"
Cohesion: 0.17
Nodes (11): Auth OAuth 2FA Frontend Fix Implementation Plan, File Structure, Global Constraints, Self-Review, Task 1: `auth-flow.ts` orchestration module, Task 2: Rewrite `SSOCallback` to close the OAuth 2FA gap, Task 3: `VerifySecondFactor` page, Task 4: `SignIn` page (`/login`) (+3 more)

### Community 112 - "ERP-Client ↔ Core API alignment (client-only)"
Cohesion: 0.17
Nodes (11): Architecture, Components / files, Constraints (verified), Data flow — category parents, Data flow — product images, ERP-Client ↔ Core API alignment (client-only), Error handling, Goal (+3 more)

### Community 113 - "ProductDetailView.tsx"
Cohesion: 0.29
Nodes (10): useProductImages(), useProductLogsByProduct(), actionBadgeClass(), actionDotClass(), fmtCurrency(), fmtDate(), fmtTimeAgo(), formatAction() (+2 more)

### Community 114 - "Subagent-Driven Development"
Cohesion: 0.18
Nodes (10): Advantages, Example Workflow, Handling Implementer Status, Integration, Model Selection, Prompt Templates, Red Flags, Subagent-Driven Development (+2 more)

### Community 115 - "POS / Billing UX redesign — design"
Cohesion: 0.18
Nodes (10): Architecture, Context, Data flow, Error handling, Friction points being fixed, Goal, Layout changes, Non-goals (+2 more)

### Community 116 - "POS billing: customer-type auto-fill + inline new-customer creation"
Cohesion: 0.18
Nodes (10): Current state (verified in code), Decisions, Design, Out of scope, Part 1 — Backend (`core-apis`), Part 2 — Frontend shared component (`ERP-Client`), Part 3 — POS integration (`POSTerminal.tsx`), POS billing: customer-type auto-fill + inline new-customer creation (+2 more)

### Community 117 - "File map"
Cohesion: 0.18
Nodes (10): Error State Pages Implementation Plan, File map, Global Constraints, Spec coverage (self-review), Task 1: Error copy + illustrations + ErrorState, Task 2: ErrorBoundary + OfflineGate + main wiring, Task 3: NotFound route + App wiring (boundary + offline + 404), Task 4: Shared tables use ErrorState for load failures (+2 more)

### Community 118 - "Login split layout — design"
Cohesion: 0.18
Nodes (10): Accessibility, Components / files, Goal, Layout, Left panel (visual), Login split layout — design, Non-goals, Right panel (auth) (+2 more)

### Community 119 - "AgentOrchestrator"
Cohesion: 0.29
Nodes (5): AgentOrchestrator, main(), Production-grade agent orchestrator, Validate configuration, Main processing logic

### Community 120 - "PromptOptimizer"
Cohesion: 0.29
Nodes (5): main(), PromptOptimizer, Production-grade prompt optimizer, Validate configuration, Main processing logic

### Community 121 - "RagEvaluator"
Cohesion: 0.29
Nodes (5): main(), RagEvaluator, Production-grade rag evaluator, Validate configuration, Main processing logic

### Community 122 - "Shared Frontend Layer Rewrite — Design"
Cohesion: 0.20
Nodes (9): Architecture, Current state (verified by reading each file), Data flow example (`Products.tsx`), Error handling, Out of scope, Program context, Rollout & verification, Shared Frontend Layer Rewrite — Design (+1 more)

### Community 123 - "Error State Pages — Design Spec"
Cohesion: 0.20
Nodes (9): Components & wiring, Decisions (locked), Error State Pages — Design Spec, Error types, Goal, Out of scope, Risks / assumptions, Success criteria (+1 more)

### Community 124 - "Brainstorming Ideas Into Designs"
Cohesion: 0.22
Nodes (8): After the Design, Anti-Pattern: "This Is Too Simple To Need A Design", Brainstorming Ideas Into Designs, Checklist, Key Principles, Process Flow, The Process, Visual Companion

### Community 125 - "Search Skill: Spotlight Search"
Cohesion: 0.22
Nodes (8): Modes, Notes, Output contract, Primary commands, Query guidance, Requirements, Search Skill: Spotlight Search, What this skill runs

### Community 126 - "Condition-Based Waiting"
Cohesion: 0.22
Nodes (8): Common Mistakes, Condition-Based Waiting, Core Pattern, Implementation, Overview, Quick Patterns, When Arbitrary Timeout IS Correct, When to Use

### Community 127 - "Global Constraints"
Cohesion: 0.22
Nodes (8): FE-only full parity pass (sales → purchase → warehouse → remaining), Global Constraints, Task 1: `createCreateOnlyResource` + wire thin APIs, Task 2: Sales — Customers, Orders, Invoices, Task 3: Purchase — POs, items, bills, payments, Task 4: Warehouse polish, Task 5: Remaining — dead APIs + demo audit, Task 6: Verify

### Community 128 - "File map"
Cohesion: 0.22
Nodes (8): File map, Global Constraints, POS Phase 1 — Qty, inline rate, View Bill Implementation Plan, Spec coverage (Phase 1 only), Task 1: One qty control, Task 2: Inline Rate, remove pencil, Task 3: Bill → receipt helper + print/download, Task 4: Receipt-style View Bill + BillDetail print/download

### Community 129 - "resource.ts"
Cohesion: 0.22
Nodes (6): QueryParams, createCreateOnlyResource(), createResource(), SearchParams, SearchResult, PaginatedResponse

### Community 130 - "Context: Full Session Record — 2026-08-12"
Cohesion: 0.25
Nodes (7): Context: Full Session Record — 2026-08-12, Executive summary, Part F — Dashboard live data, Part G — API module cleanup, Part J — Risks & follow-ups, Part K — Related docs, Part L — Line counts (POS module)

### Community 131 - "File map"
Cohesion: 0.25
Nodes (7): File map, Global Constraints, Login Split Layout Implementation Plan, Spec coverage (self-review), Task 1: Login visual CSS, Task 2: LoginVisualPanel component, Task 3: Wire split layout into Login.tsx

### Community 132 - "POS / Billing — design"
Cohesion: 0.25
Nodes (7): Architecture, Decisions (locked), Frontend, Goal, Non-goals, POS / Billing — design, Verification

### Community 133 - "InventoryDashboard.tsx"
Cohesion: 0.32
Nodes (6): useInventoryLowStock(), Analytics, AnalyticsTab(), COLORS, fmt(), InventoryDashboard()

### Community 134 - "buildSaleDocHtml.ts"
Cohesion: 0.50
Nodes (7): buildSaleDocHtml(), esc(), fmt(), fmtDate(), linesTable(), SaleDocKind, titleFor()

### Community 135 - "Part A — Roles & RBAC (core-apis)"
Cohesion: 0.29
Nodes (7): A.1 System roles (`ERole` enum — unchanged, 5 values), A.2 Role tiers applied in guards, A.3 Commits (chronological), A.4 Key fix — roles & user-roles controllers (committed `c9c8f8d`), A.5 Guard pattern (reuse only — no new auth mechanism), A.6 RBAC coverage test, Part A — Roles & RBAC (core-apis)

### Community 136 - "Global Constraints"
Cohesion: 0.29
Nodes (6): FE-only: Stores-first UX (hide Locations nav), Global Constraints, Task 1: Hide Locations from sidebar, Task 2: Relabel inventory Location pickers as “Store”, Task 3: Docs + design note, Verification

### Community 137 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Client API Alignment Implementation Plan, Global Constraints, Task 1: Remove OrgAddresses / UserAddresses, Task 2: Wire category parents + clean Vehicles API export, Task 3: Dual product image upload (multipart + presigned), Task 4: Verification

### Community 138 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, POS customer-type auto-fill + inline creation — Implementation Plan, Self-Review, Task 1: Backend — `customerType` on the Customer record, Task 2: Frontend — extract `CustomerFormDrawer`, Task 3: POS integration

### Community 139 - "sales/types/index.ts"
Cohesion: 0.29
Nodes (6): Customer, Invoice, Order, RevenueTrendPoint, SalesSummaryData, TopCustomer

### Community 140 - "Part D — POS stock awareness (NEW today)"
Cohesion: 0.33
Nodes (6): D.1 Data source, D.2 Availability rules (`posStock.ts`), D.3 StockBadge component, D.4 Validation gates, D.5 Types, Part D — POS stock awareness (NEW today)

### Community 141 - "Frontend ↔ Backend parity (section-by-section)"
Cohesion: 0.33
Nodes (5): Cross-cutting FE issues (extra, not asked), Frontend ↔ Backend parity (section-by-section), Open questions (do not assume), Section matrix, Suggested work order (proposal only — confirm)

### Community 142 - "Core-apis inventory endpoint audit"
Cohesion: 0.33
Nodes (5): Confirmed missing (Section 7 of frontend inventory API guide), Core-apis inventory endpoint audit, Frontend stance for sub-project 3, Present and usable, Proposed backend fixes (awaiting approval — not implemented)

### Community 143 - "PurchaseDashboard.tsx"
Cohesion: 0.40
Nodes (3): COLORS, fmt(), PurchaseDashboard()

### Community 144 - "Part B — Roles & page access (ERP-Client)"
Cohesion: 0.40
Nodes (5): B.1 Frontend role gates, B.2 PageAccessGate — route-level enforcement (NEW), B.3 Auth behavior change — 401 vs 403, B.4 Error message utilities (NEW — `lib/api-error.ts`), Part B — Roles & page access (ERP-Client)

### Community 145 - "Part C — POS UX refactor (prior design, implemented)"
Cohesion: 0.40
Nodes (5): C.1 Architecture, C.2 UX fixes delivered, C.3 Data flow (unchanged principles), C.4 Non-goals (explicit), Part C — POS UX refactor (prior design, implemented)

### Community 146 - "Part E — Credit approvals flow"
Cohesion: 0.40
Nodes (5): E.1 Checkout — credit over limit (`checkout.ts`), E.2 Pending Approvals page — rich cards (`PendingApprovals.tsx`), E.3 Black Ledger (`BlackLedger.tsx`), E.4 Held Sales panel (`HeldSalesPanel.tsx`), Part E — Credit approvals flow

### Community 147 - "File map"
Cohesion: 0.40
Nodes (4): File map, POS / Billing Implementation Plan (ERP-Client only), Task 1: Checkout orchestrator, Task 2: POSTerminal page + nav + route

### Community 148 - "A.7 Uncommitted backend hardening"
Cohesion: 0.50
Nodes (4): A.7 Uncommitted backend hardening, Global exception filter (NEW), Inventory API — black pool field, Organization scoping helper (NEW)

### Community 149 - "Complete file manifest"
Cohesion: 0.50
Nodes (4): Complete file manifest, core-apis — committed (10 commits, already in git), core-apis — uncommitted (working tree), ERP-Client — uncommitted (all of today's frontend work)

### Community 151 - "Part H — Commit status & suggested grouping"
Cohesion: 0.67
Nodes (3): core-apis, ERP-Client, Part H — Commit status & suggested grouping

### Community 152 - "Part I — Verification checklist"
Cohesion: 0.67
Nodes (3): ERP-Client, Part I — Verification checklist, RBAC (core-apis)

## Knowledge Gaps
- **1371 isolated node(s):** `crypto`, `http`, `fs`, `path`, `OPCODES` (+1366 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get()` connect `inventory/api/index.ts` to `resource.ts`, `useAuth`, `http.ts`, `InventoryDashboard.tsx`, `button.tsx`, `formatEntityLabel`, `ItemReturns/index.tsx`, `POSTerminal.tsx`, `Orders/index.tsx`, `api.ts`, `ProductDetailView.tsx`, `ProductOnboardingWizard.tsx`, `AuthContext.tsx`, `Dashboard/index.tsx`, `types.ts`, `usePagination`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `ErrorState.tsx`, `Maintenance/index.tsx`, `button.tsx`, `CategoryDetailModal.tsx`, `input.tsx`, `ItemReturns/index.tsx`, `Orders/index.tsx`, `ProductDetailView.tsx`, `Login/index.tsx`, `ProductOnboardingWizard.tsx`, `FilterDropdown.tsx`, `Dashboard/index.tsx`, `usePagination`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Button` connect `Button` to `PageAccessContext.tsx`, `POSTerminal.tsx`, `Trips/index.tsx`, `ViewDrawer.tsx`, `Login/index.tsx`, `usePagination`, `input.tsx`, `ItemReturns/index.tsx`, `Orders/index.tsx`, `ProductOnboardingWizard.tsx`, `AuthContext.tsx`, `FilterDropdown.tsx`, `ErrorState.tsx`, `button.tsx`, `CategoryDetailModal.tsx`, `formatEntityLabel`, `PurchaseOrderDetail/index.tsx`, `Maintenance/index.tsx`, `ProductDetailView.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `crypto`, `http`, `fs` to the rest of the system?**
  _1371 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PageAccessContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._