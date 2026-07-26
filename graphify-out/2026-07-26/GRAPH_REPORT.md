# Graph Report - core-erp-client  (2026-07-26)

## Corpus Check
- 93 files · ~62,817 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 1372 edges · 49 communities (37 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `116c799d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vehicles Module
- Electron Main & Build Scripts
- API Client & Categories
- Runtime Dependencies
- Dev Dependencies
- Inventory & Products (ERPDataTable)
- Renderer TS Config
- Domain Types
- Root TS Config
- Electron Builder Config
- core-apis — Fixes Needed
- Graphify Workflow Docs
- index.html CSP & Fonts
- ModulePage.tsx
- Dashboard.tsx
- Suppliers Module
- Electron Launcher Script
- API Request Helpers
- App Entry Mount
- Build Main Script
- Release Publish Script
- Phase 1 — CRUD Foundation Implementation Plan
- types.ts
- Login.tsx
- AuthContext.tsx
- ERP Client Conventions
- Design
- ERP Client Implementation — Overview & Index
- Phase 3 — Sales Module
- Phase 4 — Inventory Transactions
- Phase 1 — CRUD Foundation
- Phase 2 — Purchase Module
- ERP Client — Requirements (authoritative)
- Phase 0: Self-Signup + Cleanup Implementation Plan
- Phase 5 — Roles & Access
- Phase 6 — Reports
- Lessons Learned
- ERP Client Implementation — Overview & Index (v2)
- LockScreen.tsx
- Add a Create-Only Resource Page
- Add a Full-CRUD Resource Page
- Verify core-apis Capability Before Building
- LoginScreen.tsx
- SetupScreen.tsx
- vite-env.d.ts
- mockData.ts
- global.d.ts

## God Nodes (most connected - your core abstractions)
1. `useResourceMutations()` - 28 edges
2. `getDb()` - 25 edges
3. `Phase 1 — CRUD Foundation Implementation Plan` - 25 edges
4. `setupIpcHandlers()` - 24 edges
5. `Button` - 21 edges
6. `DialogHeader()` - 19 edges
7. `DialogFooter()` - 19 edges
8. `DialogContent` - 18 edges
9. `DialogTitle` - 18 edges
10. `Input` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Sidebar()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/layout/Sidebar.tsx → renderer/src/lib/utils.ts
- `ERPDataTable()` --calls--> `useDebounce()`  [EXTRACTED]
  renderer/src/components/ERPDataTable.tsx → renderer/src/hooks/useDebounce.ts
- `NavItem` --references--> `Tab`  [EXTRACTED]
  renderer/src/components/SidebarNav.tsx → renderer/src/types.ts
- `UserFormData` --references--> `AppUserRole`  [EXTRACTED]
  renderer/src/components/UsersManagement.tsx → renderer/src/types.ts
- `VehicleFormData` --references--> `Vehicle`  [EXTRACTED]
  renderer/src/components/VehiclesView.tsx → renderer/src/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (49 total, 12 thin omitted)

### Community 2 - "Electron Main & Build Scripts"
Cohesion: 0.05
Nodes (36): author, build, appId, directories, files, nsis, productName, publish (+28 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (39): bcryptjs, better-sqlite3, class-variance-authority, @clerk/clerk-js, clsx, dotenv, electron-log, electron-updater (+31 more)

### Community 5 - "Dev Dependencies"
Cohesion: 0.05
Nodes (43): concurrently, cross-env, electron, electron-builder, esbuild, devDependencies, concurrently, cross-env (+35 more)

### Community 7 - "Renderer TS Config"
Cohesion: 0.09
Nodes (21): DOM.Iterable, src, compilerOptions, isolatedModules, jsx, lib, module, moduleResolution (+13 more)

### Community 9 - "Root TS Config"
Cohesion: 0.08
Nodes (24): node_modules, renderer, scripts/**/*.ts, src/main/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames (+16 more)

### Community 10 - "Electron Builder Config"
Cohesion: 0.15
Nodes (38): adminResetPassword(), changePassword(), createUser(), deactivateUser(), getUserById(), getUsers(), hasUsers(), login() (+30 more)

### Community 11 - "core-apis — Fixes Needed"
Cohesion: 0.12
Nodes (16): 0. [BUG, confirmed] `PurchaseOrder` DTOs strip every real field down to `name`, 0b. [BUG, confirmed] `POST /purchase-items` will 500 — DTO/entity field mismatch, 0c. [BUG, confirmed] `POST /bills` will 500 — DTO/entity field mismatch, 0d. [BUG, confirmed] `POST /payment-transactions` will 500 — `orgId` vs `organizationId`, 0e. [Partially resolved] `ItemReturns` DTO/entity/domain-model is clean — but create still 500s live; `orderId` is Orders-only, 1. [BUG, unconfirmed root cause] 8 of 12 full-CRUD resources 500 on new orgs, 2. [BUG, confirmed] `POST /stock-movements` will 500 — DTO/entity field mismatch, 3. [BUG, confirmed symptom, unconfirmed root cause] `POST /stock-transfers` 500s live (+8 more)

### Community 12 - "Graphify Workflow Docs"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "index.html CSP & Fonts"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "ModulePage.tsx"
Cohesion: 0.20
Nodes (8): Sidebar(), ALL_ITEMS, ModuleGroup, ModuleItem, MODULES, useDebounce(), getApiClient(), ModulePage()

### Community 20 - "Suppliers Module"
Cohesion: 0.06
Nodes (32): 1.1 What this system does, 1.2 Core design decisions locked in from your answers, 1. Overview, 2.1 Unit Library, 2.2 Item Master, 2.3 Tax Group (Dynamic Tax Engine), 2.4 Batch / Serial / Expiry (Optional, per item), 2.5 Location Master (+24 more)

### Community 21 - "Electron Launcher Script"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "API Request Helpers"
Cohesion: 0.11
Nodes (19): Vehicles, ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM (+11 more)

### Community 24 - "App Entry Mount"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

### Community 29 - "Phase 1 — CRUD Foundation Implementation Plan"
Cohesion: 0.08
Nodes (25): Global Constraints, Phase 1 — CRUD Foundation Implementation Plan, Task 10: Stores page — full CRUD, Task 11: Categories page — full CRUD with hierarchy picker, Task 12: Products page — rewire to real CRUD, Task 13: Suppliers page — full CRUD, Task 14: PurchaseOrders page — full CRUD (basic shell only, no line items), Task 15: Bills page — full CRUD (+17 more)

### Community 30 - "types.ts"
Cohesion: 0.05
Nodes (60): ActivityLogs, buildUrl(), Customers, del(), Expenses, get(), _getToken(), headers() (+52 more)

### Community 31 - "Login.tsx"
Cohesion: 0.06
Nodes (95): Bills, Categories, Inventory, Organizations, PaymentTransactions, Products, PurchaseOrders, StockMovements (+87 more)

### Community 33 - "AuthContext.tsx"
Cohesion: 0.09
Nodes (26): configureApi(), App(), GENERIC_KEYS, Topbar(), ProtectedRoute(), AuthContext, AuthContextType, AuthProvider() (+18 more)

### Community 36 - "ERP Client Conventions"
Cohesion: 0.18
Nodes (10): Don't add dependencies, ERP Client Conventions, Error handling, Known pre-existing issues — tracked, not yours to silently fix, No generic form renderer, No test framework — and don't add one, Source of truth hierarchy, Stack (+2 more)

### Community 37 - "Design"
Cohesion: 0.18
Nodes (10): Decisions made during brainstorming, Design, Downstream flow (already built, no changes needed), Error handling, Files touched, Known follow-up (not built now), Problem, Self-Signup (Clerk) — Design (+2 more)

### Community 38 - "ERP Client Implementation — Overview & Index"
Cohesion: 0.20
Nodes (9): 1. Why this differs from `inventory_management_spec.md`, 2. What the app already has right, structurally, 3. What's actually implemented today (verified by reading routed code, not the unused legacy files), 4. Endpoint capability matrix (verified against live OpenAPI, 2026-07-23), 5. Cross-phase foundation work (built once in Phase 1, reused everywhere), 6. Open items — resolved 2026-07-23, 7. Phase 1 decisions (confirmed 2026-07-23), 8. Implementation sequencing & verification strategy (confirmed 2026-07-23, second session) (+1 more)

### Community 39 - "Phase 3 — Sales Module"
Cohesion: 0.20
Nodes (9): 1. Goal, 2. Current state — this is the most backend-constrained phase, 3. What to actually build now vs. what's blocked, 4. Screens & interactions (scoped to what's buildable), 5. Business rules from spec §5.3 — status, 6. Recommendation, 7. Open questions for this phase, 8. Done when (+1 more)

### Community 40 - "Phase 4 — Inventory Transactions"
Cohesion: 0.20
Nodes (9): 1. Goal, 2. Current state, 3. The blocker, same shape as Phases 2/3, 4. Screens & interactions, 5. Business rules from spec §3.3 — status, 6. Recommendation, 7. Open questions for this phase — resolved 2026-07-25 by reading `core-apis` source directly, 8. Done when (+1 more)

### Community 41 - "Phase 1 — CRUD Foundation"
Cohesion: 0.22
Nodes (8): 1. Goal, 2. Current state (verified in code), 3. Data model per resource (fields from `types.ts`, cross-checked against OpenAPI path existence — field-level detail in the OpenAPI schemas themselves is unreliable/under-annotated, so `types.ts` is treated as ground truth here), 4. Screens & interactions, 5. Foundation work (build once, here), 6. Decisions (confirmed with user 2026-07-23), 7. Done when, Phase 1 — CRUD Foundation

### Community 42 - "Phase 2 — Purchase Module"
Cohesion: 0.22
Nodes (8): 1. Goal, 2. Current state, 3. The core blocker: no way to list Purchase Items for a PO, 4. Screens & interactions, 5. Business rules from spec §4.3 — implementable now vs. blocked, 6. Open questions for this phase — resolved 2026-07-26 by reading `core-apis` source directly, then live-testing, 7. Done when, Phase 2 — Purchase Module

### Community 44 - "ERP Client — Requirements (authoritative)"
Cohesion: 0.25
Nodes (7): 1. Why this doc exists, and how it relates to `inventory_management_spec.md`, 2. Current backend capability (verified from `core-apis` source, 2026-07-24), 3. What "fully functional" means for this round, 4. Backend roadmap (from `inventory_management_spec.md`, not built, not dropped), 5. Decisions (confirmed with user, 2026-07-24), 6. Auth architecture (as it exists today, for reference), ERP Client — Requirements (authoritative)

### Community 45 - "Phase 0: Self-Signup + Cleanup Implementation Plan"
Cohesion: 0.25
Nodes (7): Follow-up (not part of this plan), Global Constraints, Phase 0: Self-Signup + Cleanup Implementation Plan, Task 1: Add sign-up + email-verification modes to Login.tsx, Task 2: Delete dead `*View.tsx` components, Task 3: Remove unused runtime/dev dependencies, Task 4: Fix the two preexisting typecheck gaps

### Community 46 - "Phase 5 — Roles & Access"
Cohesion: 0.25
Nodes (7): 1. Goal, 2. Current state, 3. What to actually build now vs. blocked, 4. Recommendation, 5. Open questions for this phase, 6. Done when, Phase 5 — Roles & Access

### Community 47 - "Phase 6 — Reports"
Cohesion: 0.25
Nodes (7): 1. Goal, 2. Current state, 3. Reality check — most of these reports can't be "fetched," they have to be computed client-side from list endpoints, and several of those list endpoints don't exist yet, 4. Recommendation, 5. Open questions for this phase, 6. Done when, Phase 6 — Reports

### Community 49 - "Lessons Learned"
Cohesion: 0.33
Nodes (5): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, Entry format, Ledger, Lessons Learned, When to add an entry

### Community 50 - "ERP Client Implementation — Overview & Index (v2)"
Cohesion: 0.33
Nodes (5): ERP Client Implementation — Overview & Index (v2), Next step, Phase index, Sequencing, What changed since the 2026-07-23 version

### Community 51 - "LockScreen.tsx"
Cohesion: 0.40
Nodes (3): KEYS, LockScreen(), Props

### Community 52 - "Add a Create-Only Resource Page"
Cohesion: 0.40
Nodes (4): Add a Create-Only Resource Page, Do not, Flag the gap, don't silently work around it, What to build instead

### Community 53 - "Add a Full-CRUD Resource Page"
Cohesion: 0.40
Nodes (4): Add a Full-CRUD Resource Page, Pattern for one resource page, Prerequisite: shared infrastructure, Rules from the locked Phase 1 design decisions

### Community 54 - "Verify core-apis Capability Before Building"
Cohesion: 0.40
Nodes (4): The check, Verify core-apis Capability Before Building, When the answer is "no list endpoint exists", Why this matters

## Knowledge Gaps
- **381 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+376 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Electron Main & Build Scripts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Electron Main & Build Scripts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _381 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Electron Main & Build Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Renderer TS Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._