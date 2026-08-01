# Error State Pages — Design Spec

**Date:** 2026-07-31  
**Scope:** ERP-Client (`renderer`) only  
**Status:** Approved in brainstorming; awaiting implementation plan

## Goal

When anything breaks or cannot be shown (crash, unknown URL, failed page load, offline, or other unexpected failure), the user sees a calm, illustrated error state with clear recovery actions — never a blank screen or raw stack trace.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| App | ERP-Client renderer |
| Architecture | Shared `ErrorState` + ErrorBoundary + 404 catch-all + load/offline wiring |
| Illustrations | Different SVG scene per error type |
| API / list load failure | Keep app chrome (sidebar/header); show illustrated state in main content |
| Forms / field validation | Stay inline — out of scope for full illustrated page |
| Recovery | **Try again** where retry helps; **Go home** always available (404: primarily Go home) |

## Error types

| Type key | Situation | Illustration intent | Placement | Primary actions |
|----------|-----------|---------------------|-----------|-----------------|
| `not-found` | Unknown / invalid route | Lost / confused animal | Catch-all route (`*`); full content | Go home |
| `crash` | Uncaught React render error | Sad / broken animal | Full page via ErrorBoundary | Try again, Go home |
| `load` | Primary page/list/detail data failed | Tired / unplugged animal | Inside `AppLayout` content | Try again, Go home |
| `offline` | Browser offline or unreachable API | Animal with no signal | Content or full page if app cannot run | Try again |
| `generic` | Other unexpected failures | Generic “oops” animal | Same pattern as crash or load | Try again, Go home |

## Components & wiring

1. **`ErrorState`**  
   Shared UI: centered illustration, headline, one supporting line, action buttons.  
   Props select type (`not-found` | `crash` | `load` | `offline` | `generic`) and optional custom title/message/onRetry.

2. **`ErrorBoundary`**  
   Class (or library) boundary wrapping app routes. On error: render `ErrorState` type `crash`. Log real error to console for developers; never show stack traces to users. Reset on “Try again”.

3. **`NotFound` page**  
   Route `path="*"` rendering `ErrorState` type `not-found`. Registered in `App.tsx` alongside existing `HashRouter` routes.

4. **Load failures**  
   When shared fetch/table patterns fail to load primary data, show `ErrorState` type `load` in the main content area (sidebar remains). Prefer integrating at shared layers (e.g. `ERPDataTable` / page error paths) rather than duplicating per page where possible.

5. **Offline**  
   Listen for `online` / `offline` (and treat hard network failure as offline where appropriate). Show type `offline` when the client cannot reach the API.

## Visual & copy

- **Layout:** Centered in available area — illustration, headline, one short line, then buttons. No card clutter. Readable on desktop and mobile.
- **Art:** Bundled SVG illustrations (no external CDN). Soft colors aligned with existing ERP UI (avoid generic AI purple gradients).
- **Copy (friendly, non-technical):**
  - 404 — “This page wandered off” / can’t find that page  
  - Crash — “Something broke” / we hit a snag  
  - Load — “Couldn’t load this” / data didn’t come through  
  - Offline — “You’re offline” / check connection  
  - Generic — “Something went wrong”

## Out of scope

- Backend / server HTML error pages  
- Rewriting every form’s field-level validation UX  
- Toast-only error strategy for primary failures (toasts may remain secondary)

## Success criteria

- Unknown hash route shows illustrated 404 with Go home  
- Thrown render error is caught and shows crash state with Try again / Go home  
- Primary data load failure shows load state inside layout  
- Offline shows offline state with recovery  
- Users never see a blank white/broken screen for these cases  
- No stack traces in the UI  

## Risks / assumptions

- Shared table/fetch layers expose an error path we can hook; pages with one-off fetch may need a thin follow-up pass  
- SVG art will be simple in-house illustrations, not licensed third-party packs unless added later  
- HashRouter catch-all (`*`) is sufficient for client-side unknown routes  
