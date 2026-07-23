# Graph Report - .  (2026-07-23)

## Corpus Check
- Corpus is ~14,317 words - fits in a single context window. You may not need a graph.

## Summary
- 363 nodes · 543 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.95)
- Token cost: 900 input · 1,600 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell & Providers|App Shell & Providers]]
- [[_COMMUNITY_Vehicles Module|Vehicles Module]]
- [[_COMMUNITY_Electron Main & Build Scripts|Electron Main & Build Scripts]]
- [[_COMMUNITY_API Client & Categories|API Client & Categories]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Inventory & Products (ERPDataTable)|Inventory & Products (ERPDataTable)]]
- [[_COMMUNITY_Renderer TS Config|Renderer TS Config]]
- [[_COMMUNITY_Domain Types|Domain Types]]
- [[_COMMUNITY_Root TS Config|Root TS Config]]
- [[_COMMUNITY_Electron Builder Config|Electron Builder Config]]
- [[_COMMUNITY_Dashboard & Organizations|Dashboard & Organizations]]
- [[_COMMUNITY_Graphify Workflow Docs|Graphify Workflow Docs]]
- [[_COMMUNITY_index.html CSP & Fonts|index.html CSP & Fonts]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_Bills Module|Bills Module]]
- [[_COMMUNITY_Notifications Module|Notifications Module]]
- [[_COMMUNITY_Payments Module|Payments Module]]
- [[_COMMUNITY_Purchase Orders Module|Purchase Orders Module]]
- [[_COMMUNITY_Stores Module|Stores Module]]
- [[_COMMUNITY_Suppliers Module|Suppliers Module]]
- [[_COMMUNITY_Electron Launcher Script|Electron Launcher Script]]
- [[_COMMUNITY_API Request Helpers|API Request Helpers]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_App Entry Mount|App Entry Mount]]
- [[_COMMUNITY_Build Main Script|Build Main Script]]
- [[_COMMUNITY_Release Publish Script|Release Publish Script]]
- [[_COMMUNITY_Vite Env Types|Vite Env Types]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 15 edges
3. `scripts` - 14 edges
4. `ERPDataTable()` - 14 edges
5. `useAuth()` - 9 edges
6. `build` - 8 edges
7. `cn()` - 6 edges
8. `Vehicle` - 6 edges
9. `useDebounce()` - 5 edges
10. `Tab` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ERPDataTable()` --calls--> `useDebounce()`  [EXTRACTED]
  renderer/src/components/ERPDataTable.tsx → renderer/src/hooks/useDebounce.ts
- `NavItem` --references--> `Tab`  [EXTRACTED]
  renderer/src/components/SidebarNav.tsx → renderer/src/types.ts
- `VehicleFormData` --references--> `Vehicle`  [EXTRACTED]
  renderer/src/components/VehiclesView.tsx → renderer/src/types.ts
- `VehicleModalProps` --references--> `Vehicle`  [EXTRACTED]
  renderer/src/components/VehiclesView.tsx → renderer/src/types.ts
- `Sidebar()` --calls--> `cn()`  [EXTRACTED]
  renderer/src/components/layout/Sidebar.tsx → renderer/src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify CLI command set (query/path/explain/update)** — claude_graphify_query_command, claude_graphify_path_command, claude_graphify_explain_command, claude_graphify_update_command [INFERRED 0.85]
- **CSP-allowed external origins** — renderer_index_content_security_policy, renderer_index_core_apis_backend, renderer_index_warehouse_ops_desk, renderer_index_openstreetmap, renderer_index_unsplash, renderer_index_google_fonts [EXTRACTED 1.00]

## Communities (29 total, 4 thin omitted)

### Community 0 - "App Shell & Providers"
Cohesion: 0.07
Nodes (39): ProtectedRoute(), ALL_ITEMS, ModuleGroup, ModuleItem, MODULES, AuthContext, AuthContextType, AuthProvider() (+31 more)

### Community 1 - "Vehicles Module"
Cohesion: 0.10
Nodes (20): ActiveTab, MAINTENANCE_STATUS_COLORS, MOCK_VEHICLES, Props, STATUS_CONFIG, VehicleDetailView(), EMPTY_FORM, MOCK_STORE (+12 more)

### Community 2 - "Electron Main & Build Scripts"
Cohesion: 0.08
Nodes (22): gotLock, author, description, license, main, name, scripts, build (+14 more)

### Community 3 - "API Client & Categories"
Cohesion: 0.09
Nodes (18): COLUMNS, ActivityLogs, Categories, Customers, Expenses, Invoices, ItemReturns, Orders (+10 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, axios, bcryptjs, class-variance-authority, @clerk/clerk-js, clsx, cors, dotenv (+16 more)

### Community 5 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, concurrently, cross-env, electron, electron-builder, @electron/rebuild, esbuild, react (+14 more)

### Community 6 - "Inventory & Products (ERPDataTable)"
Cohesion: 0.16
Nodes (11): Column, ERPDataTable(), Props, COLUMNS, COLUMNS, Inventory(), Products(), Inventory (+3 more)

### Community 7 - "Renderer TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+10 more)

### Community 8 - "Domain Types"
Cohesion: 0.11
Nodes (17): ActivityLog, AppSettings, Customer, Expense, Invoice, ItemReturn, Order, PaginatedResponse (+9 more)

### Community 9 - "Root TS Config"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 10 - "Electron Builder Config"
Cohesion: 0.14
Nodes (14): build, appId, directories, files, nsis, productName, publish, win (+6 more)

### Community 11 - "Dashboard & Organizations"
Cohesion: 0.18
Nodes (6): Props, StatCardProps, Stats, COLUMNS, Organizations, Organization

### Community 12 - "Graphify Workflow Docs"
Cohesion: 0.25
Nodes (8): Graphify Knowledge Graph Workflow, graphify explain <concept>, graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify-out/wiki/index.md, graphify path <A> <B>, graphify query <question>, graphify update .

### Community 13 - "index.html CSP & Fonts"
Cohesion: 0.25
Nodes (8): Content-Security-Policy meta tag, core-apis-m03n.onrender.com (backend API), Google Fonts service, Inter font family, JetBrains Mono font family, OpenStreetMap embed (frame-src), Unsplash images (img-src), warehouse-ops-desk.preview.emergentagent.com

### Community 14 - "Sidebar Navigation"
Cohesion: 0.43
Nodes (5): NAV_ITEMS, NavItem, Props, AppUserRole, Tab

### Community 15 - "Bills Module"
Cohesion: 0.33
Nodes (4): COLUMNS, STATUS_CLASS, Bills, Bill

### Community 16 - "Notifications Module"
Cohesion: 0.33
Nodes (4): COLUMNS, TYPE_CLASS, Notifications, Notification

### Community 17 - "Payments Module"
Cohesion: 0.33
Nodes (4): COLUMNS, STATUS_CLASS, PaymentTransactions, PaymentTransaction

### Community 18 - "Purchase Orders Module"
Cohesion: 0.33
Nodes (4): COLUMNS, STATUS_CLASS, PurchaseOrders, PurchaseOrder

### Community 19 - "Stores Module"
Cohesion: 0.40
Nodes (3): COLUMNS, Stores, Store

### Community 20 - "Suppliers Module"
Cohesion: 0.40
Nodes (3): COLUMNS, Suppliers, Supplier

### Community 21 - "Electron Launcher Script"
Cohesion: 0.40
Nodes (4): args, child, electronPath, require

### Community 22 - "API Request Helpers"
Cohesion: 0.50
Nodes (5): buildUrl(), get(), _getToken(), headers(), post()

### Community 24 - "App Entry Mount"
Cohesion: 0.67
Nodes (3): Core ERP Client (app), /src/main.jsx entry script, #root mount element

## Knowledge Gaps
- **192 isolated node(s):** `name`, `description`, `type`, `main`, `dev` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Electron Main & Build Scripts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Electron Main & Build Scripts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `description`, `type` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.06721215663354763 - nodes in this community are weakly interconnected._
- **Should `Vehicles Module` be split into smaller, more focused modules?**
  _Cohesion score 0.09846153846153846 - nodes in this community are weakly interconnected._
- **Should `Electron Main & Build Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `API Client & Categories` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._