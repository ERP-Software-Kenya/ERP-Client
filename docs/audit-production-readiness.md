# ERP Client — Production Readiness Audit

**Date:** 2026-08-02
**Stack:** Electron 43 · React 19 · Vite 8 · TypeScript 7 · TanStack Query 5 · Clerk · Tailwind 4
**Total source files:** ~91 renderer + 6 main process
**Test coverage:** 0%
**CI/CD:** None

---

## Summary Table

| Area | Grade | Priority |
|---|---|---|
| Testing | F — 0 tests | Critical |
| CI/CD | F — none | Critical |
| Linting / Formatting | F — none | Critical |
| Security (PAT storage) | D | Critical |
| Folder structure | C — flat, mixed | High |
| API layer | C — monolithic 467-line file | High |
| Type definitions | C — monolithic 544-line file | High |
| Error boundaries | D — none at route level | High |
| Runtime validation | D — all `as T` casts | High |
| Custom hooks | D — 2 hooks for 44 pages | Medium |
| Form handling | C — all manual state | Medium |
| Electron hardening | Unknown — needs audit | Medium |
| Dead code | D — `static-server.ts`, stitch dir | Medium |
| Path aliases | C — declared but unused | Medium |
| Devtools | D — no RQ devtools | Low |
| i18n / a11y | F — none | Low |
| Error tracking | F — none | Low |

---

## CRITICAL — Must fix before any production release

### 1. Zero Tests

**What:** No test files exist anywhere. No framework (Vitest, Jest) in `package.json`. No `@testing-library/react`, no Playwright/Spectron for Electron e2e.

**Risk:** Any refactor, API change, or bug fix ships with no regression safety net.

**Fix:**
```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event
```

Minimum viable test surface: `lib/http.ts`, `lib/resource.ts`, `lib/entityLabel.ts`, `lib/auth-cache.ts`, and the `createResource` factory. These are pure logic — easy to test, highest payoff.

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:ui": "vitest --ui"
}
```

---

### 2. No CI/CD Pipeline

**What:** No `.github/workflows/` directory. No automated lint, type-check, or build on PRs. Releases are a manual `npm run dist` + `publish-release.ts` script.

**Risk:** Broken builds ship. Type errors survive into production. No audit trail of what was reviewed.

**Fix:** Create `.github/workflows/ci.yml`:
```yaml
on: [push, pull_request]
jobs:
  ci:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```

Add `typecheck` and `lint` scripts to `package.json`.

---

### 3. No ESLint / Prettier / Pre-commit Hooks

**What:** No `.eslintrc`, no `eslint.config.js`, no `.prettierrc`, no Husky, no lint-staged found anywhere.

**Risk:** Code style drifts across contributors. Obvious bugs (missing deps arrays in `useEffect`, unused vars, etc.) are not caught at commit time. TypeScript strict mode catches type errors but not React-specific misuse.

**Fix:**
```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier husky lint-staged
npx husky init
```

`package.json` additions:
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

---

### 4. GitHub PAT Stored Insecurely

**What:** Root `.env` contains a live GitHub PAT (`github_pat_11AXN7CLQ0...`). The Electron main process reads this for auto-update publishing. `.env` is gitignored but `ERP_CLIENT_APP_UPDATE_KEY` flows into the packaged app environment.

**Risk:** If the packaged binary is reverse-engineered (trivial with `asar extract`), the PAT is exposed. It has write access to the repository.

**Fix:** The update *check* token (read-only) belongs in the packaged app but should use a scoped read-only fine-grained PAT with only `Contents: Read`. The publish token should **never** be in the app — it belongs only in CI environment secrets. Split the two uses into separate keys with separate scopes.

---

## HIGH PRIORITY

### 5. Monolithic `api.ts` — 467 Lines, 30+ Resources

**What:** Every API resource — products, inventory, billing, vehicles, categories, roles, etc. — lives in one file.

**Problem:** Any change to one resource touches the entire module. Tree-shaking is defeated when anything imports from `api.ts`. New contributors have no idea where to add a new resource.

**Fix:** Split by domain:
```
renderer/src/api/
  index.ts          ← re-export everything (backwards compat)
  products.ts
  categories.ts
  inventory.ts
  billing.ts        ← Bills, Orders, Invoices, PurchaseOrders
  purchasing.ts     ← Suppliers, PurchaseItems
  stock.ts          ← StockMovements, StockTransfers, UnpublishedStock
  customers.ts
  fleet.ts          ← Vehicles
  platform.ts       ← Roles, Users, UserRoles, PlatformConfigurations
  organizations.ts
```

---

### 6. Monolithic `types.ts` — 544 Lines, 30+ Interfaces

**What:** All entity interfaces, enums, request shapes, and response shapes in one file. Also contains inline comments documenting backend bugs and field naming inconsistencies (`organizationId` vs `orgId`, snake_case vs camelCase) that should be tracked as issues, not buried in type definitions.

**Fix:** Mirror the API domain split:
```
renderer/src/types/
  index.ts          ← re-export all (backwards compat)
  product.ts
  inventory.ts
  billing.ts
  platform.ts
  common.ts         ← PaginatedResponse<T>, shared primitives
```

---

### 7. `components/` Has No Feature Organization

**What:** 22 files at the root of `components/`. Feature-specific components (`ProductDetailView`, `ProductImageUploader`, `ProductOnboardingWizard`, `ProductSupplierLinksPanel`, `CategoryDetailModal`, `VehicleDetailView`, `VehiclesView`) live alongside generic ones (`DataTable`, `ConfirmDialog`, `FormDrawer`).

**Fix:**
```
components/
  ui/               ← shadcn primitives (keep as-is)
  layout/           ← AppLayout, Sidebar, Topbar (keep)
  auth/             ← AuthBootScreen, LoginVisualPanel (keep)
  errors/           ← ErrorState, ErrorIllustrations (keep)
  common/           ← DataTable, ConfirmDialog, FormDrawer, FilterDropdown,
                       ResourceSelect, RowActionsMenu, ViewDrawer, SimpleTable
  features/
    products/       ← ProductDetailView, ProductImageUploader,
                       ProductOnboardingWizard, ProductSupplierLinksPanel
    categories/     ← CategoryDetailModal
    fleet/          ← VehicleDetailView, VehiclesView
```

---

### 8. Pages Directory is Flat — 37 Root-Level Files

**What:** 44 page files sit in `pages/` root or two subdirectories (`dashboards/`, `pos/`). Fleet pages (`VehiclesPage.tsx`, `VehicleDetailPage.tsx`) break even that loose pattern.

**Fix:** Group by domain:
```
pages/
  auth/             ← Login, SSOCallback, SSOContinue, CreateOrganization
  dashboards/       ← (keep existing)
  products/         ← Products, Categories
  inventory/        ← Inventory, InventoryDetail, StockMovements,
                       StockTransfers, UnpublishedStock, ProductLogs
  purchasing/       ← PurchaseOrders, PurchaseOrderDetail, Bills, BillDetail,
                       Suppliers, PurchaseItems
  sales/            ← Orders, Invoices, Customers, PaymentTransactions, ItemReturns
  fleet/            ← VehiclesPage, VehicleDetailPage
  platform/         ← Roles, UserRoles, Users, PlatformConfigurations,
                       Organizations, Stores, Locations
  reports/          ← ActivityLogs, AuditLog, ReportGenerationLogs, Notifications
  pos/              ← (keep existing)
```

---

### 9. No Error Boundaries at Route Level

**What:** `<Suspense fallback={<RouteFallback />}>` wraps all routes for loading states, but there is no React `ErrorBoundary`. If any page component throws a runtime error, the entire app crashes to a white screen.

**Fix:** Wrap the `<Suspense>` block in an `ErrorBoundary` that renders `<ErrorState>` instead of crashing:
```tsx
<ErrorBoundary fallback={<ErrorState message="Something went wrong" />}>
  <Suspense fallback={<RouteFallback />}>
    <Routes>...</Routes>
  </Suspense>
</ErrorBoundary>
```

Install:
```bash
npm install react-error-boundary
```

---

### 10. No Runtime Schema Validation (Zod)

**What:** API responses are cast directly to typed interfaces with `as T` inside `readJsonBody`. If the backend returns an unexpected shape (null field, renamed key, missing field), TypeScript cannot catch this at runtime — it silently produces `undefined` values that surface as hard-to-diagnose UI bugs.

**Fix:**
```bash
npm install zod
```

Start with the most-used resources (Products, Categories, Inventory). A single `z.safeParse()` in `readJsonBody` with a dev-mode warning is sufficient — no need to throw on parse failure in production.

---

### 11. Dead Code: `static-server.ts`

**What:** `src/main/static-server.ts` (93 lines) exists but is not used in the current build configuration. It is compiled into the main process bundle regardless.

**Fix:** Delete the file. It adds build surface and maintenance burden without value.

---

### 12. `stitch_product_details_view/` at Repo Root

**What:** A working directory artifact (`stitch_product_details_view/` directory + `.zip`) lives at the repository root. Not gitignored consistently.

**Fix:** Delete both. Move any useful code into the proper feature directory. Add explicit entries to `.gitignore`:
```
stitch_product_details_view/
stitch_product_details_view.zip
*.zip
```

---

## MEDIUM PRIORITY

### 13. No `@tanstack/react-query-devtools` in Dev

**What:** TanStack Query ships excellent devtools for inspecting cache state, retries, and query status. Not installed.

**Fix:**
```bash
npm install -D @tanstack/react-query-devtools
```

Add to `main.tsx` inside `<QueryClientProvider>`:
```tsx
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

---

### 14. No Form Library — Manual State on Every Form

**What:** Every form uses `useState<FormState>` with manual `onChange` handlers. 20+ forms across pages. No field-level validation, no dirty tracking, no error display pattern.

**Fix:** Adopt `react-hook-form` + `zod` resolver (pairs with the Zod addition above):
```bash
npm install react-hook-form @hookform/resolvers
```

The existing `<FormDrawer>` wrapper is the right abstraction — only the form internals need to change.

---

### 15. Only 2 Custom Hooks for 44 Pages

**What:** `useDebounce` and `usePagination` are the only custom hooks. Many repeated patterns across page components are not extracted: the `filters` memo pattern, the `openEdit`/`openCreate`/`closeDrawer` state triplet, the `deleteTarget` confirm-dialog pattern.

**Fix:** Extract at minimum:
- `useCrudDrawer<T>()` — open/close, editing state, form reset
- `useFilters()` — filter state + automatic page reset on filter change
- `useConfirmDelete<T>()` — deleteTarget state + confirm handler

These patterns appear in at least 15 pages each.

---

### 16. No `engines` Field in `package.json`

**What:** No minimum Node.js or npm version specified. Developers on older runtimes get cryptic build errors.

**Fix:**
```json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=10.0.0"
}
```

---

### 17. No Barrel Exports / Index Files

**What:** Imports use deep relative paths (`../../components/DataTable`) instead of module-level imports (`@/components`). Reorganizing any directory breaks dozens of imports across the codebase.

**Fix:** Add `index.ts` barrel files at each subdirectory after the folder restructure. Enforce with `eslint-plugin-import`.

---

### 18. TypeScript `@/` Path Alias Declared but Never Used

**What:** `renderer/tsconfig.json` declares `"paths": { "@/*": ["./src/*"] }` but `vite.config.ts` does not wire the alias, and all imports throughout the codebase use relative paths.

**Fix:** Add to `vite.config.ts`:
```typescript
resolve: {
  alias: { '@': path.resolve(__dirname, 'renderer/src') }
}
```

Then migrate relative imports progressively. The payoff compounds with the folder reorganization.

---

### 19. snake_case / camelCase Type Inconsistency

**What:** `types.ts` documents this itself — some API fields are snake_case (`registration_number`, `report_type`, `fuel_level`) while others are camelCase. This inconsistency leaks into every component that touches those types.

**Fix:** Use `zod` transforms to normalize all API responses to camelCase at the HTTP boundary. This isolates the inconsistency to schema files and removes it from all component code.

---

### 20. Electron Security Hardening — Needs Audit

Based on the file listing, the following should be verified in `src/main/index.ts` and confirmed correct:

- `contextIsolation: true` (required — preload IPC bridge only)
- `nodeIntegration: false` (required)
- `sandbox: true` (recommended for renderer)
- `webSecurity: true` (must not be disabled)
- `Content-Security-Policy` header set on the loaded HTML
- `will-navigate` event handler to block navigation to `http://` URLs
- `setWindowOpenHandler` to block renderer-initiated popup windows

---

## LOW PRIORITY / NICE TO HAVE

### 21. No Sentry / Error Tracking

Runtime errors in the packaged Electron app are invisible to the team. Add `@sentry/electron` to capture crashes from both the main process and renderer in one SDK integration.

### 22. No Storybook

With 38 components and growing, a component catalog prevents duplication and documents expected prop shapes. Storybook 8 supports Vite natively with a single `npx storybook@latest init` command.

### 23. No Accessibility Audit

No `aria-label`, `role`, or keyboard navigation patterns visible in the custom component layer. Radix UI primitives handle accessibility by default, but custom components (`DataTable`, `SidebarNav`) need a pass with `eslint-plugin-jsx-a11y`.

### 24. POS Terminal Likely Needs Zustand

`pages/pos/` has its own `checkout.ts` logic. A POS session (cart state, payment state, receipt preview) is complex enough that React Context will cause excessive re-renders across the terminal UI. Recommend `zustand` scoped to the POS route.

### 25. No Structured Logging in Renderer

`electron-log` is installed in the main process but renderer usage is unclear. User-facing errors (API failures, auth errors) in the packaged app should be written to the log file that `electron-log` manages, so support can request the log file from users when debugging field issues.

---

## Top 3 Actions for Maximum ROI

1. **Add Vitest + write tests for `lib/`** — unblocks safe refactoring of everything else
2. **Add ESLint + Husky + GitHub Actions CI** — catches regressions before they merge
3. **Split `api.ts` and `types.ts` by domain** — scales with the team and enables tree-shaking

---

## Current Branch Snapshot

```
renderer/src/
├── components/      38 files (22 at root, no feature grouping)
├── pages/           44 files (37 at root)
├── lib/             7 files
├── hooks/           2 files
├── services/        1 file
├── context/         2 files
├── config/          1 file
├── api.ts           467 lines (monolithic)
└── types.ts         544 lines (monolithic)

src/main/            6 files (Electron main process)
scripts/             3 files (build + release scripts)

Tests:               0
CI workflows:        0
Lint config:         0
```
