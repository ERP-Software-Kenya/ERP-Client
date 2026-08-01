# Recent-First Lookup UX (+ Polish Leftovers)

**Date:** 2026-08-01  
**Scope:** ERP-Client (`renderer`) only — no Core API schema or new list/search endpoints  
**Status:** Approved in brainstorming; awaiting user review of this written spec  
**Approach:** Extend Stock Transfers Recent pattern via shared primitives, then apply in waves; close leftover polish from prior UX plan without redoing finished work

**Related:** `docs/superpowers/specs/2026-08-01-ux-polish-uuid-filters-layout-design.md` (POS / filters / chrome largely landed)

## Goal

Make get-by-id and form FK flows feel human: **Recent records with labels** as the primary way to reopen work; **name pickers** when list/search APIs already exist; UUID paste only as a secondary “Advanced” path. Also finish remaining polish leftovers from the prior UX waves.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Backend | Client-only — no Core API list/search additions in this pass |
| Primary find UX | Recent list (human labels); UUID stays under the hood |
| Form FKs | ResourceSelect / search when API allows → else Recent for that type → else honest API-gap note |
| Scope | Recent/pickers/labels **and** leftover polish from prior plan (do not rebuild finished waves) |
| Architecture | Extend existing `useRecentIds` + Stock Transfers UX; optional shared `RecentRecords` UI |
| Delivery | Shared NS + UI helper first → Wave 1 named pages → Wave 2 other get-by-id → polish leftovers |

## Problem

Several modules (Sales Orders, Invoices, Purchase Items, Expenses, Users/Roles/UserRoles, etc.) only expose get-by-id. The UI currently leads with “paste UUID,” which feels unprofessional. Stock Transfers / Unpublished Stock already prove a better pattern: browser-local Recent with labels, Open/Remove/Clear, and optional refresh via `useQueries`.

## Design

### Shared primitives

1. **`RECENT_NS` expansion** in `renderer/src/lib/recentIds.ts`  
   Add namespaces for: orders, invoices, purchaseItems, expenses, users, roles, userRoles, productLogs, platformConfigs, activityLogs (plus any sibling get-by-id page touched). Keep existing stockTransfers / unpublishedStock / stockMovementsInventory.

2. **`RecentRecords` UI helper** (preferred)  
   Shared empty state, Open / Remove / Clear, “browser-local only” copy once, columns supplied per page. Avoid copy-pasting the Stock Transfers Recent block onto every page.

3. **Secondary ID load**  
   Collapsed or clearly secondary “Advanced: load by ID” — never the hero control. Detail may still show full ID + Copy for support.

4. **Labels**  
   Reuse `formatEntityLabel`. Prefer entity-appropriate fields (`orderNumber`, name, sku, code, phone, status, amount, date). Truncated UUID only as unresolved fallback.

### Data flow

1. Create or Load → `recent.push(id, humanLabel)` when a label is known.  
2. Page shows Recent; optionally hydrate rows with `useQueries` + get-by-id (Stock Transfers pattern).  
3. Open → set active id → existing `useGet`.  
4. Forms: list/search → picker; else Recent chips for that FK; else API-gap note — **no fake directory**.

### Wave 1 — Named pages

| Page | Recent label preference | Form / lookup notes |
|------|-------------------------|---------------------|
| Sales Orders | `orderNumber` → customer name → date | Keep store ResourceSelect + customer search; push Recent on create/load |
| Invoices | invoice # / status / amount / date | Order FK: Recent orders if any, else API-gap (no order directory) |
| Purchase Items | product name (via Products list) + qty | ResourceSelect/lists where available; create remains blocked if Core still blocked |
| Stock Transfers | Already Recent | Demote remaining UUID block to Advanced |
| Unpublished Stock | Already Recent | Recent first; rename “Paste UUID” step to secondary Load by ID; keep product/location pickers |

### Wave 2 — Same pattern

Expenses, Users, Roles, UserRoles, ProductLogs, PlatformConfigurations, ActivityLogs / AuditLog, ItemReturns (order link where still UUID-paste).

### Polish leftovers (scope B)

Do **not** redo finished POS flush, filter toolbar, `MoreVertical`, sidebar tooltips, or scrollbar adoption unless broken. Only close leftovers called out in the prior SDD (e.g. raw IDs still primary in some drawers/details, UUID-as-hero copy). Explicitly defer anything that needs Core API with a one-line reason.

## Acceptance

- Named pages: Recent is the primary find UI; UUID load is secondary  
- Forms: no bare “paste UUID” FK when a list/search or Recent alternative exists  
- List/detail primary fields prefer labels over raw IDs  
- Copy states browser-local Recent once per page; API gaps stated honestly  
- Prior polish leftovers fixed or explicitly deferred with reason  

## Non-goals

- New Core list/search endpoints or join payloads  
- Fake client-side directories or fake filters on server-paginated lists  
- Redesigning POS internals beyond leftover polish  
- Syncing or clearing Recent across devices / browsers  

## Risks / assumptions

1. Empty Recent until first create/load — expected; empty state must explain how to populate it.  
2. Related FK with no list and empty Recent (e.g. Invoice → Order) stays awkward — gap note, not a fake picker.  
3. Unpublished stock create may not return an id — Recent may stay thin until a successful load-by-ID.  
4. Many pages — land shared `RecentRecords` + NS first to keep diffs reviewable.  
5. Prior UX polish is mostly complete; this pass assumes leftover-only work for scope B.

## Verification

- Manual: Sales Orders, Invoices, Purchase Items, Stock Transfers, Unpublished Stock — Recent first; Advanced ID secondary  
- Spot-check Wave 2 pages for same pattern  
- Forms: pickers where list exists; gap notes where not  
- TypeScript check on renderer  
- Note remaining API gaps in PR / handoff notes  

## Out of scope follow-ups (document only)

- Core list/search for Orders, Invoices, Purchase Items, Users/Roles, Unpublished Stock directory  
- Cross-device Recent sync  
