# Context: Products & Categories Implementation

**Session date:** 2026-08-02
**Branch shipped:** `feat/product-detail-view` → merged to main (PR #5)
**Also fixed on:** `feat/security-hardening-and-audit` (categories + security, in review)

This document is the complete implementation record for every change made to the
Products and Categories modules — backend scoping, frontend filters, table layout,
detail modal, and the bugs encountered along the way. Read this before touching
either module in a future session.

---

## 1. Products Module

### 1a. What was requested
- Scope the `search()` and `list()` endpoints so they only return products
  belonging to the logged-in user's organization.

### 1b. Backend changes (`core-apis`)

**Files changed (all in `core-apis/src/application/modules/products/`):**

#### `domain/product.filter.ts`
Added `organizationId` field with AutoMapper decorator:
```typescript
@AutoMap() public organizationId?: string;
```

#### `queries/list-products/list-products.query.ts`
Added same field (this query is the base; `SearchProductsQuery` extends it, so
the field cascades automatically):
```typescript
@AutoMap() public organizationId?: string;
```

#### `products.controller.ts`
Injected `@CurrentUser()` into `search()` and `list()` and applied the org filter:
```typescript
async search(
  @Query() query: SearchProductsRequest,
  @CurrentUser() user: AuthenticatedUser,
) {
  query.organizationId = user.organizationId;
  // ...
}

async list(
  @Query() query: ListProductsRequest,
  @CurrentUser() user: AuthenticatedUser,
) {
  query.organizationId = user.organizationId;
  // ...
}
```

`AuthenticatedUser` comes from the shared auth decorator already present in the
codebase — no new imports needed beyond `@CurrentUser`.

### 1c. Frontend changes (`renderer`)

#### `renderer/src/components/DataTable.tsx` — filter alignment
The `toolbar` prop previously rendered in its own row below the header. It was
moved **inline with the search bar and action buttons** on the same row, with a
"Filters:" label and a thin vertical divider separating filters from search:

```tsx
<div className="flex flex-wrap items-center gap-2">
  {toolbar && (
    <>
      <span className="text-xs font-medium text-muted-foreground">Filters:</span>
      {toolbar}
      <div className="h-5 w-px bg-border" />
    </>
  )}
  {/* search input, refresh button, add button follow */}
</div>
```

Any page that passes a `toolbar` prop automatically gets the "Filters:" label
and the divider — no per-page changes needed.

---

## 2. Categories Module

### 2a. What was requested
1. **Org scoping** — category controller should only return current user's org categories.
2. **Parent column** — replace the dash (`—`) with a meaningful badge:
   - No `parentId` → green **"Yes"** pill (this is a root/parent category)
   - Has `parentId` → blue pill showing the **parent category name**
3. **Filters** — Active/Inactive status filter + Parent/Sub-category type filter
4. **Detail modal** — clicking View opens a modal (not a drawer) matching the
   design: General Information section + System Metadata section

### 2b. Backend changes (`core-apis/src/application/modules/categories/`)

#### Two `CategoryFilter` types — CRITICAL architectural note

There are **two separate types** called `CategoryFilter` in this module. Getting
this wrong silently drops filter fields:

| File | Type | Used by |
|---|---|---|
| `domain/category.filter.ts` | Decorated class with `@AutoMap()` | AutoMapper (Request → Query → Domain filter) |
| `i-category.repo.ts` | Plain interface | Normalizer, `ICategoryRepo` interface, and the actual repo |

**Both must be kept in sync** whenever you add a new filter field. The normalizer
imports from `..` which resolves to `i-category.repo.ts`, NOT the domain class.

#### `domain/category.filter.ts`
```typescript
@AutoMap() public organizationId?: string;
@AutoMap() public hasParent?: boolean;
```

#### `i-category.repo.ts` (the one the normalizer actually imports)
```typescript
export interface CategoryFilter {
  name?: string;
  isActive?: boolean;
  parentId?: string | null;
  organizationId?: string;  // added
  hasParent?: boolean;       // added
}
```

#### `queries/list-categories/list-categories.query.ts`
```typescript
@AutoMap() public organizationId?: string;
@AutoMap() public hasParent?: boolean;
```

#### `queries/list-parent-categories/list-parent-categories.query.ts`
```typescript
@AutoMap() public organizationId?: string;
```

#### `models/requests/list-categories.request.ts`
Both `isActive` and `hasParent` need `@Transform` because query params arrive as
strings (`"true"` / `"false"`) but the domain expects booleans:

```typescript
@ApiPropertyOptional()
@IsOptional()
@Transform(({ value }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
})
@IsBoolean()
@AutoMap()
public isActive?: boolean;

@ApiPropertyOptional()
@IsOptional()
@Transform(({ value }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
})
@IsBoolean()
@AutoMap()
public hasParent?: boolean;
```

#### `models/requests/list-parent-categories.request.ts`
Same `@Transform` pattern added for `isActive`.

#### `helpers/category-filter.normalizer.ts`
Cleaned — only handles ordering defaults. **No TypeORM imports, no `any`.**
The normalizer does NOT set `parentId` for the `hasParent` case; that is handled
entirely inside the repo layer.

#### `infrastructure/persistence/repositories/category.repo.ts`

The `hasParent` filter cannot be expressed as a simple value in `createPartialWhere`
because it maps to `parentId = IsNull()` or `parentId = Not(IsNull())` — TypeORM
operators, not plain values. The pattern for this in the base repo is:

1. Add `hasParent` to `specialFilterFields` (tells `createPartialWhere` to skip it)
2. Handle it in `modifyFindOption` using TypeORM operators directly

```typescript
import { IsNull, Not, FindManyOptions } from 'typeorm';

public override get specialFilterFields(): (keyof PageableFilter<CategoryFilter>)[] {
  return [...super.specialFilterFields, 'hasParent'];
}

protected override modifyFindOption(
  findOpts: FindManyOptions<CategoryEntity>,
  filterObj: Filter<CategoryFilter> | PageableFilter<CategoryFilter>,
): void {
  if (filterObj.hasParent === true) {
    (findOpts.where as Record<string, unknown>).parentId = Not(IsNull());
  } else if (filterObj.hasParent === false) {
    (findOpts.where as Record<string, unknown>).parentId = IsNull();
  }
}
```

**Important:** Use `Record<string, unknown>` cast, never `any`. The user
explicitly rejected `(filter as any)`.

#### `categories.controller.ts`
All three list methods now scope to the user's org:

```typescript
async search(@Query() query: SearchCategoriesRequest, @CurrentUser() user: AuthenticatedUser) {
  query.organizationId = user.organizationId;
  // ...
}

async list(@Query() query: ListCategoriesRequest, @CurrentUser() user: AuthenticatedUser) {
  query.organizationId = user.organizationId;
  // ...
}

async listParents(@Query() query: ListParentCategoriesRequest, @CurrentUser() user: AuthenticatedUser) {
  query.organizationId = user.organizationId;
  // ...
}
```

### 2c. Frontend changes (`renderer`)

#### `renderer/src/components/CategoryDetailModal.tsx` (new file)

Reusable modal showing category details. Props:
```typescript
interface Props {
  category: Category | null;   // null = closed
  categoryName: Map<string, string>;   // id → display name (for parent lookup)
  orgName: Map<string, string>;        // id → org display name
  onClose: () => void;
  onEdit: (category: Category) => void;
}
```

Two sections:
- **General Information** — Name, Status (green/red dot), Parent Category, Organization, Description
- **System Metadata** — UUID in monospace code box, Created At, Last Updated

Footer has an **Edit Category** button that calls `onClose()` then `onEdit(category)`.

Status display pattern (used elsewhere too):
```tsx
<span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
<span className="font-medium">{isActive ? 'Active' : 'Inactive'}</span>
```

#### `renderer/src/pages/Categories.tsx`

**Parent column render logic** (corrected after initial wrong implementation):
```tsx
{
  key: 'parentId',
  label: 'Parent',
  render: (row) =>
    row.parentId ? (
      // Sub-category: show parent name in blue pill
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5
                       text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
        {categoryName.get(row.parentId) ?? formatEntityLabel({ id: row.parentId })}
      </span>
    ) : (
      // Root/parent category: green "Yes" pill
      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5
                       text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
        Yes
      </span>
    ),
},
```

**Filter state and memo:**
```typescript
const [statusFilter, setStatusFilter] = useState<string | null>(null);
const [typeFilter, setTypeFilter] = useState<string | null>(null);

const filters = useMemo(() => {
  const next: Record<string, string> = {};
  if (statusFilter) next.isActive = statusFilter;
  if (typeFilter !== null) next.hasParent = typeFilter;
  return Object.keys(next).length ? next : undefined;
}, [statusFilter, typeFilter]);
```

**Toolbar (passed to DataTable):**
```tsx
toolbar={
  <>
    <FilterDropdown
      label="Status"
      options={[
        { value: 'true',  label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ]}
      value={statusFilter}
      onChange={(v) => { setStatusFilter(v); setPage(1); }}
    />
    <FilterDropdown
      label="Type"
      options={[
        { value: 'false', label: 'Parent Categories' },
        { value: 'true',  label: 'Sub Categories' },
      ]}
      value={typeFilter}
      onChange={(v) => { setTypeFilter(v); setPage(1); }}
    />
  </>
}
```

Note: `value: 'false'` → Parent (no parent = `hasParent: false`),
`value: 'true'` → Sub-category (has parent = `hasParent: true`).

**ViewDrawer replaced with CategoryDetailModal:**
```tsx
<CategoryDetailModal
  category={viewRow}
  categoryName={categoryName}
  orgName={orgName}
  onClose={() => setViewRow(null)}
  onEdit={(cat) => { setViewRow(null); openEdit(cat); }}
/>
```

---

## 3. Bugs Encountered and Fixed

### Bug 1: `hasParent` filter silently dropped

**Symptom:** Selecting "Parent Categories" filter had no effect — all categories
still showed.

**Root cause:** The normalizer imports `CategoryFilter` from `..` (resolves to
`i-category.repo.ts`), NOT from `domain/category.filter.ts`. The `hasParent`
field was only added to the domain class, not the interface. Since the interface
didn't have the field, TypeScript silently ignored it at the normalizer boundary.

**Fix:** Added `hasParent?: boolean` and `organizationId?: string` to the
interface in `i-category.repo.ts`.

### Bug 2: Setting `parentId = null` in the normalizer didn't work

**Symptom:** Even after fixing the interface, the "Parent Categories" filter
returned no results or wrong results.

**Root cause:** Setting `parentId = null` directly on the filter object
conflicts with how `createPartialWhere` handles the field internally. When
`parentId` is explicitly `null`, the utility may not generate the correct
`WHERE parentId IS NULL` clause.

**Fix:** Moved both hasParent cases out of the normalizer entirely and into
`CategoryRepo.modifyFindOption` using TypeORM's `IsNull()` and `Not(IsNull())`
operators directly, combined with the `specialFilterFields` exclusion so
`createPartialWhere` never touches the field.

### Bug 3: Parent column showing "No" instead of parent name

**Symptom:** Sub-categories showed "No" in the Parent column instead of the
parent category name.

**Root cause:** Initial implementation: `row.parentId ? 'Yes' : 'No'` — reversed
the logic and didn't use the name lookup.

**Correct logic:**
- `row.parentId` exists → this is a sub-category → show parent name in blue pill
- `row.parentId` is null/undefined → this is a root (parent) category → show "Yes" in green pill

### Bug 4: `(filter as any).parentId` rejected

**Symptom:** User explicitly asked to not use `any` type casts.

**Fix:** Moved logic to `modifyFindOption` where the cast target is
`findOpts.where as Record<string, unknown>` which is semantically correct
(the where clause is a record of column conditions).

---

## 4. AutoMapper Filter Chain — Complete Flow

For any filter field to work end-to-end in this backend, it must appear in
**all five** of these locations:

```
HTTP Query Param (string)
       ↓ @Transform (string → boolean/type) in Request DTO
Request DTO (e.g. ListCategoriesRequest)
       ↓ AutoMapper: Request → Query
Query Class (e.g. ListCategoriesQuery) with @AutoMap()
       ↓ AutoMapper: Query → Domain Filter
Domain Filter Class (e.g. category.filter.ts) with @AutoMap()
       ↓ normalizer reads this interface:
i-category.repo.ts CategoryFilter interface (plain, no decorators)
       ↓ createPartialWhere OR modifyFindOption
TypeORM FindManyOptions (WHERE clause)
```

Missing any link in this chain = field silently ignored. The normalizer's
`CategoryFilter` (the interface in `i-category.repo.ts`) is the most common
place to forget because it looks like it should be derived automatically
from the domain class, but it is a completely separate type.

---

## 5. Reusable Components Used

### `FilterDropdown` (`renderer/src/components/FilterDropdown.tsx`)
Controlled dropdown for a nullable string filter value. Renders a "All" option
that sets value to `null` (clears filter). Used in Products and Categories.

```typescript
interface Props {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}
```

### `DataTable` (`renderer/src/components/DataTable.tsx`)
Generic paginated table. Key props relevant to filters and view:
- `toolbar?: React.ReactNode` — renders inline left of search with "Filters:" label
- `onView?: (row: T) => void` — shows View option in row actions menu
- `columns[].render` — custom cell renderer (used for the Parent column pill badges)

### `CategoryDetailModal` (`renderer/src/components/CategoryDetailModal.tsx`)
New component this session. Accepts `category: Category | null` — null closes
the modal. Needs `categoryName` and `orgName` Maps for ID → display name lookup.

---

## 6. Key Patterns for Future Reference

### Adding org scoping to a new controller endpoint
```typescript
// 1. Add organizationId to the domain filter class
@AutoMap() public organizationId?: string;

// 2. Add to the query class
@AutoMap() public organizationId?: string;

// 3. In the controller, inject @CurrentUser() and set it
async list(@Query() query: ListXyzRequest, @CurrentUser() user: AuthenticatedUser) {
  query.organizationId = user.organizationId;
  return this.queryBus.execute(...);
}
```

### Adding a new filter that maps to a TypeORM operator (IsNull, Not, Like, etc.)
```typescript
// 1. Add field to i-xyz.repo.ts interface (not just domain class)
// 2. Add field to domain filter class with @AutoMap()
// 3. Add field to query class with @AutoMap()
// 4. Add @Transform in request DTO if it comes as a string
// 5. In the repo:
public override get specialFilterFields() {
  return [...super.specialFilterFields, 'yourField'];
}
protected override modifyFindOption(findOpts, filterObj) {
  if (filterObj.yourField === true) {
    (findOpts.where as Record<string, unknown>).dbColumn = Not(IsNull());
  }
}
```

### Boolean filter from frontend
Frontend sends strings (`'true'` / `'false'`) via query params. Backend DTO
needs `@Transform` to convert before validation:
```typescript
@Transform(({ value }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
})
@IsBoolean()
@IsOptional()
@AutoMap()
public yourBooleanField?: boolean;
```

### Pill badge pattern (status / type labels in table cells)
```tsx
// Green pill
<span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5
                 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
  Label
</span>

// Blue (primary) pill
<span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5
                 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
  Label
</span>

// Red / destructive pill
<span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5
                 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
  Label
</span>
```

---

## 7. File Index (all touched files, both repos)

### `core-apis` (backend)
```
src/application/modules/products/
  domain/product.filter.ts                      ← organizationId added
  queries/list-products/list-products.query.ts  ← organizationId added
  products.controller.ts                        ← @CurrentUser() org scoping

src/application/modules/categories/
  domain/category.filter.ts                     ← organizationId, hasParent added
  i-category.repo.ts                            ← organizationId, hasParent added (CRITICAL)
  queries/list-categories/list-categories.query.ts          ← organizationId, hasParent
  queries/list-parent-categories/list-parent-categories.query.ts  ← organizationId
  models/requests/list-categories.request.ts    ← @Transform for isActive + hasParent
  models/requests/list-parent-categories.request.ts  ← @Transform for isActive
  helpers/category-filter.normalizer.ts         ← cleaned, no TypeORM imports, no any
  categories.controller.ts                      ← @CurrentUser() on search/list/listParents

src/infrastructure/persistence/repositories/
  category.repo.ts                              ← specialFilterFields + modifyFindOption
```

### `ERP-Client` (frontend)
```
renderer/src/
  components/DataTable.tsx          ← toolbar moved inline with search, "Filters:" label
  components/FilterDropdown.tsx     ← reused (already existed)
  components/CategoryDetailModal.tsx  ← NEW: category detail modal
  pages/Categories.tsx              ← parent column, status/type filters, modal wiring
```
