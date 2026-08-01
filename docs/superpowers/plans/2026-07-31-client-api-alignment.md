# Client API Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove fake address modules, wire `categories/parents` and product image presigned upload (secondary), and drop the unused Vehicles API export — ERP-Client only.

**Architecture:** Multipart remains the gallery upload path. Presigned GET→PUT is a secondary “Direct R2” path with an amber limitation banner. CategorySelect uses root parents from Core API. Org/User address stubs are deleted; Vehicles mock UI stays.

**Tech Stack:** React, TanStack Query, existing `renderer/src/lib/http.ts` helpers, TypeScript.

## Global Constraints

- No changes under `core-apis/`
- Keep Vehicles pages, routes, nav, `MOCK_STORE`, and `Vehicle` type
- Do not enable disabled Customers/Orders/Invoices creates
- Presigned path must not expect gallery invalidation to show new rows
- Allowed image mimeTypes: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/bmp`, `image/tiff`, `image/svg+xml`

---

### Task 1: Remove OrgAddresses / UserAddresses

**Files:**
- Delete: `renderer/src/pages/OrgAddresses.tsx`
- Delete: `renderer/src/pages/UserAddresses.tsx`
- Modify: `renderer/src/App.tsx` — remove lazy imports and routes
- Modify: `renderer/src/config/modules.ts` — remove two Administration nav items
- Modify: `renderer/src/api.ts` — remove `OrgAddresses` / `UserAddresses` exports and type imports
- Modify: `renderer/src/types.ts` — remove `OrgAddress` / `UserAddress` interfaces

- [ ] **Step 1:** Delete both page files; strip App routes/imports; strip modules nav; strip api + types.
- [ ] **Step 2:** Grep for `OrgAddress|UserAddress|org-addresses|user-addresses` — zero hits under `renderer/src`.
- [ ] **Step 3:** Commit `fix: remove stub org/user address modules with no Core API`

---

### Task 2: Wire category parents + clean Vehicles API export

**Files:**
- Modify: `renderer/src/api.ts` — remove `Vehicles` createResource; add `useCategoryParents`
- Modify: `renderer/src/components/CategorySelect.tsx` — use parents hook
- Keep: Vehicles UI files untouched

**Interfaces:**
- Produces: `useCategoryParents(): UseQueryResult<Category[]>` → `GET /api/v1/categories/parents`

```ts
export function useCategoryParents(enabled = true) {
  return useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: () => get<Category[]>('/api/v1/categories/parents'),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
```

CategorySelect: map parents to options (filter `excludeId`); keep “None (top level)”; drop indented tree from full list.

- [ ] **Step 1:** Implement hook + CategorySelect switch; remove Vehicles from api.ts (keep Vehicle type import only if still needed — remove if unused).
- [ ] **Step 2:** Grep `Vehicles` import from api — none; VehiclesView still uses MOCK_STORE.
- [ ] **Step 3:** Commit `feat: wire category parents and drop unused Vehicles API client`

---

### Task 3: Dual product image upload (multipart + presigned)

**Files:**
- Modify: `renderer/src/types.ts` — add `ProductImageUploadUrl`
- Modify: `renderer/src/api.ts` — add `useProductImagePresignedUpload`
- Modify: `renderer/src/components/ProductImageUploader.tsx` — secondary R2 control + amber banner
- Modify: `renderer/src/pages/Products.tsx` — wire handler when `editing?.id` present

**Interfaces:**
```ts
export interface ProductImageUploadUrl {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

// mutation: { productId: string; file: File }
// 1) get<ProductImageUploadUrl>(`/api/v1/products/${id}/image/presigned-url`, { mimeType })
// 2) fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': mimeType } })
// Do NOT invalidate product images query
```

UI: amber notice about storage-only + overwrite of `products/{id}/image`; button/input “Direct upload (R2)” only when `editing` (product id exists). Default file input stays multipart/pending queue.

- [ ] **Step 1:** Types + mutation + uploader props + Products handler.
- [ ] **Step 2:** Typecheck touched package (`cd renderer && npx tsc --noEmit` or project script).
- [ ] **Step 3:** Commit `feat: add optional product image presigned R2 upload path`

---

### Task 4: Verification

- [ ] Grep: no `/api/v1/org-addresses`, `/user-addresses`, `/vehicles` in `api.ts`
- [ ] Grep: `categories/parents` and `image/presigned-url` present
- [ ] Vehicles routes/nav still present
- [ ] Spec checklist in `docs/superpowers/specs/2026-07-31-client-api-alignment-design.md` satisfied
