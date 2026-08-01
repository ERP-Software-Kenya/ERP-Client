# POS / Billing Implementation Plan (ERP-Client only)

> **For agentic workers:** Implement task-by-task. No `core-apis/` edits.

**Goal:** Port ERP System POS / Billing into ERP-Client and wire existing APIs with visible step errors.

**Architecture:** Full-page POS UI under `/pos`. Checkout orchestrator calls existing `post()` endpoints sequentially and returns `steps[]`.

**Tech Stack:** React, React Query resource hooks for lists, `post` from `lib/http` for checkout steps.

**Global Constraints:**
- Do not modify `core-apis/`
- Sales + Purchase modes
- No silent fake success; show step ok/failed/skipped
- Currency: `$` like other client pages

## File map

| Path | Intent |
|------|--------|
| `renderer/src/pages/pos/checkout.ts` | Sales/purchase checkout step runner |
| `renderer/src/pages/pos/POSTerminal.tsx` | POS UI (port of ERP System) |
| `renderer/src/config/modules.ts` | Add POS / Billing nav item |
| `renderer/src/App.tsx` | Route `/pos` |
| `renderer/src/components/layout/AppLayout.tsx` | Full-bleed main for `/pos` |

---

### Task 1: Checkout orchestrator

**Files:** Create `renderer/src/pages/pos/checkout.ts`

- [ ] Export `CheckoutStep` and `runSalesCheckout` / `runPurchaseCheckout` using `post` from `../../lib/http`
- [ ] Sales: Order → Invoice → Payment (optional) → stock skipped with message
- [ ] Purchase: Bill → GRN skipped → stock skipped
- [ ] Each step catch → `{ status: 'failed', message }`

### Task 2: POSTerminal page + nav + route

**Files:** Create `POSTerminal.tsx`; modify `modules.ts`, `App.tsx`, `AppLayout.tsx`

- [ ] Port ERP System POS layout; live Stores/Products/Suppliers
- [ ] Wire checkout; show steps panel; success modal only if primary ref; keep cart if primary fails
- [ ] Nav + route + full-bleed layout for `/pos`
