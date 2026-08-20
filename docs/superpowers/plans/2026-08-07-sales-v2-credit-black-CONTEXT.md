# Sales v2 — Credit & Black Sales — Context (as of 2026-08-09, re-verified)

Status snapshot for the `sales-v2-credit-black` branch in `ERP-Client`, verified against
actual source (not against plan checkboxes, which are all still unchecked in the plan file
itself). See [lessons-learned.md](../../../.claude/rules/lessons-learned.md) — prior sessions
have shipped frontend-ahead-of-backend before, so this file is written from `git log` +
`grep` evidence, not from the plan's claims.

Plan: `docs/superpowers/plans/2026-08-07-sales-v2-credit-black.md` (15 tasks)
Spec: `docs/superpowers/specs/2026-08-07-sales-v2-credit-black-design.md`
Source sketches: the 3 `WhatsApp Image 2026-08-05 *.jpeg` files in repo root — 2 are the
Sales screen (Regular/New/Shop/Big Customer type row, Normal/Credit/Black toggle, Debtor
Note/Statement/Delivery Note), 1 is "Boxes Tracker" (stock transfer), which the spec already
marks **out of scope** for this phase. No new information in the images beyond what the spec
already captured.

## Repo layout note

`core-apis` (NestJS backend) is **not** inside `D:\Client\ERP-Client`. Two clones exist on
this machine: `D:\WorkSpace\core-apis` (newer, last modified 2026-07-28) and
`D:\urban\core-apis` (2026-07-24). **Neither has any sales-v2-credit-black backend work** —
checked directly (role.entity.ts, bill.entity.ts, customer.entity.ts, and a search for
`credit-approvals`/`bill-completion`/`commission-payable` all came back empty in both).

**Re-checked 2026-08-09**, this time exhaustively (not just the working tree, since an
earlier session's memory log claimed a `feat/sales-v2-credit-black` branch with 9 commits —
that branch and its worktree were later deleted as stray/orphaned, per the same session log):
- `git branch -a` in both clones: only `develop` + assorted unrelated `origin/feat/*`
  branches. No `sales-v2-credit-black` / `feat/sales-v2-credit-black` branch, local or remote,
  in either clone.
- `git worktree list` in both clones: just the main worktree, nothing else registered.
- `git stash list` in both clones: empty.
- `git log --all --grep` (credit/black sale/commission) and `git grep BillCompletionService`
  across every commit on every branch (`git rev-list --all`): no hits related to
  sales-v2-credit-black. The only grep hits are unrelated pre-existing features ("billing and
  customer module", "unpublished stock two-table split").
- **Conclusion stands: Tasks 1–10 are 0% done, not committed or stashed anywhere on this
  machine.** The 9-commit branch referenced in prior session memory no longer exists (was
  cleaned up as an orphaned worktree artifact). Checked `git reflog --all` and
  `git fsck --no-reflog` in both clones for recovery: `urban/core-apis` has no dangling
  commits at all; `WorkSpace/core-apis` has two dangling commits, but both are unrelated
  (an Aug 2 purchase-orders-module commit and a Jul 28 develop merge) — **not recoverable,
  that backend work is gone and must be redone from the plan.**
- Unrelated finding: `D:\WorkSpace\core-apis` currently has **uncommitted** local changes on
  `develop` — a "Phase 3 — System sidebar parity" batch (drivers, trips, vehicles, quotations,
  RFQs, goods receipts/issues, approval rules, tax rates, price lists, etc.). This is *not*
  sales-v2-credit-black work; don't confuse it with backend Tasks 1–10, and don't discard it
  when starting sales-v2 backend work in this clone.

## What's done

Frontend only, on `ERP-Client` branch `sales-v2-credit-black` (commits `f9fb1dc`…`71c8e6e`,
prior to it merging unrelated `origin/main` work like Fleet Management/dashboard):

- **Task 11 — types/api** (`b4b5e3c`): `renderer/src/types.ts` has `SaleType`,
  `Bill.saleType`, `Customer.creditLimit`/`creditBalance`. `renderer/src/api.ts` has a full
  `CreditApprovals` resource: `useListPending`, `useApprove`, `useReject`, `useBlackLedger`,
  `useMarkCommissionPaid`, hitting `/api/v1/credit-approvals*` endpoints.
- **Task 12 — POS sale-type/customer-type/payment-timing/hold** (`e48003d`):
  `POSTerminal.tsx` has the Normal/Credit/Black toggle (`SaleTypeToggle`, gated by
  `canCreateBlackSale`), customer-type row, payment timing incl. half → partial amount, and
  a new `HeldSalesPanel.tsx` for Rakhone/draft resume. `checkout.ts` updated to carry the new
  fields.
- **Task 13 — Black mode UI** (mostly in `e48003d`/`71c8e6e`): per-line official vs charged
  rate (`l.officialRate` vs `l.rate`), live `blackMarkup` calc, facilitator picker
  (user-search via `ClerkUsers.useSearch` or free-text name), commission field.
- **Task 14 — Pending Approvals + Black Ledger pages** (`71c8e6e`):
  `renderer/src/pages/PendingApprovals/index.tsx` and
  `renderer/src/pages/BlackLedger/index.tsx`, wired into `App.tsx` + `config/modules.ts`.
  Also extended `ReceiptDocument.tsx`.

## What remains

- **Tasks 1–10 — the entire `core-apis` backend (0% done, nothing committed anywhere):**
  - `ERole.OrgManager` role + seed
  - `Bill` columns: `saleType`, `customerType`, `paymentTiming`, `partialAmount`,
    `blackAmount`, `facilitatorUserId`, `facilitatorName`, `commissionAmount`
  - `Customer` columns: `creditLimit`, `creditBalance`
  - New tables/modules: `CustomerCreditTransaction`, `CreditApprovalRequest`,
    `CommissionPayable`
  - `UnpublishedStock` additions: `Sold` movement type, `findByOrgLocationProductAsync`
  - `BillCompletionService` (the core logic: black-vs-official stock deduction, credit-limit
    gate, credit balance updates, commission computation) — nothing exists yet
  - Wiring into bill-completion + credit-approval endpoints, black-sale role gate,
    `UnpublishedStock` role/location scoping, black ledger + mark-commission-paid endpoints
  - All associated migrations
  - Net effect: **every backend route the frontend above already calls
    (`/api/v1/credit-approvals*`, `saleType` on bill create, etc.) doesn't exist yet** — the
    frontend cannot function against a real backend until this lands.
- **Task 15 — Documents:** Debtor Note, Statement, Delivery Note (`window.print`-based, like
  `ReceiptDocument.tsx`) — no matching files found (`DebtorNote`, `StatementDocument`,
  `DeliveryNote` all absent from `renderer/src`).
- Plan's own checkboxes are all unticked — this file is the actual state, the plan file
  itself was never updated as tasks completed.

## Suggested next step

Backend Tasks 1–10 are the blocker — pick `D:\WorkSpace\core-apis` (more recently touched)
unless told otherwise, and work through the plan's Task 1→10 order since later backend tasks
depend on earlier ones (`BillCompletionService` in Task 6 needs Tasks 1–5's entities/repos
first).
