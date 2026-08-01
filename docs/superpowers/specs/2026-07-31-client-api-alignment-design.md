# ERP-Client ↔ Core API alignment (client-only)

**Date:** 2026-07-31  
**Status:** Implemented (2026-07-31)  
**Scope:** ERP-Client only — no Core API changes  
**Approach:** Dual upload (multipart primary + optional presigned R2 path)

---

## Goal

Align the ERP renderer with live Core APIs by removing fake address modules, wiring the unused `categories/parents` endpoint, exposing the product image presigned-upload path in the UI, and cleaning the unused Vehicles API export — while keeping the Vehicles mock UI.

## Non-goals

- Any changes under `core-apis/`
- Enabling disabled create flows blocked by known backend issues (Customers, Orders, Invoices, PurchaseItems, etc.)
- Wiring AuditLog list (no list endpoint on Core API)
- Replacing multipart gallery upload as the sole path
- Removing Vehicles pages, routes, nav, mock store, or `Vehicle` types

---

## Constraints (verified)

| Fact | Implication |
|------|-------------|
| `GET /api/v1/org-addresses` and `/user-addresses` do not exist (404) | Remove stub pages and dead `createResource` exports |
| `GET /api/v1/vehicles` does not exist; UI uses in-memory `MOCK_STORE` | Keep UI; remove unused `Vehicles` export from `api.ts` only |
| `GET /api/v1/categories/parents` returns root categories | Use for parent picker in `CategorySelect` |
| `GET /api/v1/products/:id/image/presigned-url` returns `{ uploadUrl, key, publicUrl }` | Client may PUT file to `uploadUrl` |
| No Core API “confirm” / `imageKey` endpoint; multipart `POST .../images` is the only path that writes `product_images` | Presigned path must not expect gallery refresh; UI must warn clearly |
| Auth on domain APIs is Clerk bearer | Existing `http.ts` auth stays; R2 PUT uses signed URL only (no Clerk header) |

---

## Architecture

```
Remove: OrgAddresses / UserAddresses (page, route, nav, api, types)
Keep:   Vehicles UI + types; drop dead Vehicles createResource
Wire:   useCategoryParents → CategorySelect
Wire:   useProductImagePresignedUpload → Products / ProductImageUploader (secondary path)
Keep:   useUploadProductImage (multipart) as default gallery path
```

### Data flow — category parents

1. `CategorySelect` calls `useCategoryParents()` → `GET /api/v1/categories/parents`
2. Options are root categories only (API intent: parent selector when creating sub-categories)
3. “None (top level)” remains for no parent
4. `excludeId` still filters the category being edited
5. Full category tree via `Categories.useList()` is **not** required for this control after the switch

### Data flow — product images

**Default (gallery):** unchanged — `POST /api/v1/products/:id/images` multipart → invalidate `['products', id, 'images']`.

**Direct R2 (secondary):**

1. Require an existing product id (edit mode, or after create — same as today for uploads)
2. `GET /api/v1/products/:id/image/presigned-url?mimeType=<enum>`
3. `PUT uploadUrl` with raw body and `Content-Type` matching that mimeType
4. Toast success; optionally surface `publicUrl` / `key` in the toast or a small notice
5. **Do not** invalidate gallery queries expecting a new row (none will appear)
6. Amber banner: uploaded to storage only; not linked in product gallery until Core API adds confirm

Allowed mimeTypes (must match Core API enum):  
`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/bmp`, `image/tiff`, `image/svg+xml`.

Reject other file types in the client before calling the API.

---

## Components / files

| Path | Change |
|------|--------|
| `renderer/src/pages/OrgAddresses.tsx` | Delete |
| `renderer/src/pages/UserAddresses.tsx` | Delete |
| `renderer/src/App.tsx` | Remove org/user-address lazy imports and routes |
| `renderer/src/config/modules.ts` | Remove Administration nav items `org-addresses`, `user-addresses` |
| `renderer/src/api.ts` | Remove `OrgAddresses`, `UserAddresses`, `Vehicles` exports; add `useCategoryParents`, `useProductImagePresignedUpload` (or equivalent helpers) |
| `renderer/src/types.ts` | Remove `OrgAddress`, `UserAddress`; add `ProductImageUploadUrl` (or inline type in api); keep `Vehicle` |
| `renderer/src/components/CategorySelect.tsx` | Prefer parents endpoint over `Categories.useList()` |
| `renderer/src/components/ProductImageUploader.tsx` | Dual-mode UI: default multipart pick + optional “Direct upload (R2)” + amber limitation notice |
| `renderer/src/pages/Products.tsx` | Wire secondary upload handler; keep multipart as default |

Vehicles: no page/nav/route changes.

---

## Error handling

- Parents load failure: empty parent options + existing muted empty select behavior (no crash); optional toast only if the product already uses toast-on-error patterns for similar selects
- Presigned GET failure: toast error; no PUT
- R2 PUT failure (non-2xx): toast error with status/message if available
- Unsupported mime: toast and skip request
- Multipart failures: unchanged

---

## Testing / verification

1. Nav: Org Addresses / User Addresses gone; Vehicles still present
2. Routes `#/org-addresses` and `#/user-addresses` no longer registered
3. Categories create/edit: parent dropdown loads from parents API (network tab)
4. Products edit: multipart upload still adds gallery thumbnails
5. Products edit: Direct R2 upload succeeds (network: GET presigned + PUT) and shows warning that gallery will not update
6. `api.ts` has no `/api/v1/vehicles`, `/org-addresses`, or `/user-addresses` strings
7. Typecheck / lint on touched files

---

## Risks

1. **Presigned UX confusion** — users may think gallery should update; mitigated by amber banner and keeping multipart default.
2. **Presigned overwrites** — Core API keys objects as `products/{id}/image` (singular); repeated direct uploads may overwrite the same R2 object; document in UI notice.
3. **CORS on R2 PUT** — if browser PUT to R2 fails due to CORS, client cannot fix without Core API/storage config; surface clear error toast.
4. **Parent-only list** — parents endpoint returns roots only; deep nested parent picking that previously used full list + indent will change to roots-only (matches API summary). Explicit product decision: accept roots-only parent selector.
