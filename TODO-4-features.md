# 4-feature implementation TODO

Spans both `ERP-Client` and `core-apis`. Delete this file once all four are done — it's a working checklist, not permanent documentation.

Verified against actual code 2026-08-04 (not memory/prior-session claims, which were wrong once already for SKU).

## 🔴 Fix first — live regression
**SKU auto-generation** broke product creation: `ProductOnboardingWizard.tsx` sends `sku: undefined` and relies on `GET /products/next-sku`, which doesn't exist. Every product created since commit `7aadbe5` has **no SKU**.
- [ ] Backend: `sku.helper.ts` (prefix + sequence), `get-next-sku` query+handler, `GET /products/next-sku`, auto-gen in `create-product.command-handler.ts`, unique constraint migration
- [ ] Verify frontend preview + create flow actually works end to end

## ⬜ Stock transfer redesign — not started
- [ ] Backend: `GET /stock-transfers` list, `GET /inventory/by-product/:id`, populate `StockTransferItemEntity` on complete
- [ ] Frontend: replace `StockTransfers.tsx` drawer with product-first modal + success animation + history list

## ⬜ User management — not started
- [ ] Backend: nullable `org_member.userId`, `invitedEmail`/`invitedAt` columns, invite-by-email for unregistered users, list/search members endpoints, phone sync from Clerk
- [ ] Frontend: `Users.tsx` real table (currently shows "API gap" placeholder)

## ✅ Done
- Location dashboard — 4 stat cards + bar chart + product filter (`ERP-Client` commit `015aa7f`)
