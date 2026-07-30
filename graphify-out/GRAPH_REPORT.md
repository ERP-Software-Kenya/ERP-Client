# Graph Report - ERP-Client  (2026-07-29)

## Corpus Check
- 84 files · ~34,497 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 588 nodes · 1430 edges · 31 communities (20 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eaa47d61`
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
- ipc-handlers.ts
- graphify query <question>
- Content-Security-Policy meta tag
- App.tsx
- launch-electron.ts
- VehiclesView.tsx
- /src/main.jsx entry script
- build-main.ts
- publish-release.ts
- api.ts
- Inventory.tsx
- AuthContext.tsx
- Lessons Learned
- LockScreen.tsx
- LoginScreen.tsx
- SetupScreen.tsx
- vite-env.d.ts
- mockData.ts
- global.d.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 31 edges
2. `DialogHeader()` - 29 edges
3. `DialogFooter()` - 29 edges
4. `DialogContent` - 28 edges
5. `DialogTitle` - 28 edges
6. `Label` - 28 edges
7. `useResourceMutations()` - 28 edges
8. `Input` - 27 edges
9. `getDb()` - 25 edges
10. `setupIpcHandlers()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `NavItem` --references--> `Tab`  [EXTRACTED]
  renderer/src/components/SidebarNav.tsx → renderer/src/types.ts
- `UserFormData` --references--> `AppUserRole`  [EXTRACTED]
  renderer/src/components/UsersManagement.tsx → renderer/src/types.ts
- `VehicleFormData` --references--> `Vehicle`  [EXTRACTED]
  renderer/src/components/VehiclesView.tsx → renderer/src/types.ts
- `Sidebar()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/layout/Sidebar.tsx → renderer/src/lib/utils.ts
- `Bills()` --calls--> `useResourceMutations()`  [EXTRACTED]
  renderer/src/pages/Bills.tsx → renderer/src/hooks/useResourceMutations.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (31 total, 11 thin omitted)

### Community 0 - "Sidebar.tsx"
Cohesion: 0.28
Nodes (5): Sidebar(), ALL_ITEMS, ModuleGroup, ModuleItem, MODULES

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (36): author, build, appId, directories, files, nsis, productName, publish (+28 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (39): bcryptjs, better-sqlite3, class-variance-authority, @clerk/clerk-js, clsx, dotenv, electron-log, electron-updater (+31 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (43): concurrently, cross-env, electron, electron-builder, esbuild, devDependencies, concurrently, cross-env (+35 more)

### Community 7 - "compilerOptions"
Cohesion: 0.09
Nodes (21): DOM.Iterable, src, compilerOptions, isolatedModules, jsx, lib, module, moduleResolution (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (24): node_modules, renderer, scripts/**/*.ts, src/main/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames (+16 more)

### Community 10 - "ipc-handlers.ts"
Cohesion: 0.15
Nodes (38): adminResetPassword(), changePassword(), createUser(), deactivateUser(), getUserById(), getUsers(), hasUsers(), login() (+30 more)

### Community 12 - "graphify query <question>"
Cohesion: 0.67
Nodes (3): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify query <question>

### Community 13 - "Content-Security-Policy meta tag"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 19 - "App.tsx"
Cohesion: 0.05
Nodes (55): ActivityLogs, Categories, Expenses, Inventory, Orders, Organizations, Products, Roles (+47 more)

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
Cohesion: 0.05
Nodes (60): authHeader(), buildUrl(), Customers, del(), get(), _getToken(), headers(), Invoices (+52 more)

### Community 31 - "Inventory.tsx"
Cohesion: 0.07
Nodes (78): Bills, PaymentTransactions, PurchaseItems, PurchaseOrders, Suppliers, ConfirmDialog(), ConfirmDialogProps, Column (+70 more)

### Community 33 - "AuthContext.tsx"
Cohesion: 0.10
Nodes (25): configureApi(), App(), Topbar(), ProtectedRoute(), AuthContext, AuthContextType, AuthProvider(), ClerkResources (+17 more)

### Community 49 - "Lessons Learned"
Cohesion: 0.33
Nodes (5): 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo, Entry format, Ledger, Lessons Learned, When to add an entry

### Community 51 - "LockScreen.tsx"
Cohesion: 0.40
Nodes (3): KEYS, LockScreen(), Props

## Knowledge Gaps
- **235 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._