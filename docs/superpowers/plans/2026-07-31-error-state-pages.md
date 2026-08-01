# Error State Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show calm, illustrated error states (404, crash, load failure, offline, generic) across ERP-Client so users never see a blank screen or raw stack traces.

**Architecture:** One shared `ErrorState` component with five SVG illustration variants. An `ErrorBoundary` wraps the app for render crashes. A catch-all `*` route renders `NotFound`. `DataTable` / `ERPDataTable` (and a few detail pages) swap plain error text for `type="load"`. A small `useOnlineStatus` hook plus an offline overlay covers connectivity.

**Tech Stack:** React 19, react-router-dom HashRouter, TanStack Query (existing), Tailwind + shadcn `Button`, no new npm dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-error-state-pages-design.md`
- ERP-Client `renderer` only — no backend HTML error pages
- No new npm dependencies
- Bundled inline SVGs only (no CDN images)
- Soft ERP-aligned colors; avoid purple-gradient AI cliché
- Users never see stack traces; `console.error` for developers is OK
- Forms / field validation stay inline (do not replace with ErrorState)
- Keep sidebar/header for load/offline-inside-layout cases
- Do not commit unless the user explicitly asks

---

## File map

| Path | Responsibility |
|------|----------------|
| `renderer/src/components/errors/errorCopy.ts` | Titles, messages, which buttons per type |
| `renderer/src/components/errors/ErrorIllustrations.tsx` | Five SVG scenes keyed by type |
| `renderer/src/components/errors/ErrorState.tsx` | Centered illustration + copy + actions |
| `renderer/src/components/errors/ErrorBoundary.tsx` | Class boundary → crash ErrorState |
| `renderer/src/pages/NotFound.tsx` | 404 route page |
| `renderer/src/hooks/useOnlineStatus.ts` | `navigator.onLine` + online/offline events |
| `renderer/src/components/errors/OfflineGate.tsx` | Full-content offline overlay when offline |
| `renderer/src/App.tsx` | Catch-all `*` route |
| `renderer/src/main.tsx` | Wrap app in ErrorBoundary + OfflineGate |
| `renderer/src/components/DataTable.tsx` | Use ErrorState for `error` prop |
| `renderer/src/components/ERPDataTable.tsx` | Use ErrorState for query errors |
| `renderer/src/pages/PurchaseOrderDetail.tsx` | Replace red text with ErrorState load |
| `renderer/src/pages/BillDetail.tsx` | Replace red text with ErrorState load |

---

### Task 1: Error copy + illustrations + ErrorState

**Files:**
- Create: `renderer/src/components/errors/errorCopy.ts`
- Create: `renderer/src/components/errors/ErrorIllustrations.tsx`
- Create: `renderer/src/components/errors/ErrorState.tsx`

**Interfaces:**
- Consumes: `Button` from `../ui/button`, `useNavigate` from `react-router-dom`
- Produces:
  - `export type ErrorStateType = 'not-found' | 'crash' | 'load' | 'offline' | 'generic'`
  - `export const ERROR_COPY: Record<ErrorStateType, { title: string; message: string; showRetry: boolean }>`
  - `export function ErrorIllustration({ type }: { type: ErrorStateType }): JSX.Element`
  - `export function ErrorState(props: { type: ErrorStateType; title?: string; message?: string; onRetry?: () => void; className?: string }): JSX.Element`

- [ ] **Step 1: Create `errorCopy.ts`**

```ts
export type ErrorStateType = 'not-found' | 'crash' | 'load' | 'offline' | 'generic';

export const ERROR_COPY: Record<
  ErrorStateType,
  { title: string; message: string; showRetry: boolean }
> = {
  'not-found': {
    title: 'This page wandered off',
    message: "We can't find that page. It may have moved or never existed.",
    showRetry: false,
  },
  crash: {
    title: 'Something broke',
    message: 'We hit a snag rendering this screen. Try again or head home.',
    showRetry: true,
  },
  load: {
    title: "Couldn't load this",
    message: "The data didn't come through. Check your connection and try again.",
    showRetry: true,
  },
  offline: {
    title: "You're offline",
    message: 'Check your internet connection, then try again.',
    showRetry: true,
  },
  generic: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. You can try again or go home.',
    showRetry: true,
  },
};
```

- [ ] **Step 2: Create `ErrorIllustrations.tsx`**

Create five simple inline SVGs (dog/animal scenes). Keep each ≈120–180 viewBox units, `aria-hidden`, soft blues/grays matching ERP primary. Export one component:

```tsx
import type { ErrorStateType } from './errorCopy';

export function ErrorIllustration({ type }: { type: ErrorStateType }) {
  switch (type) {
    case 'not-found':
      return <NotFoundArt />;
    case 'crash':
      return <CrashArt />;
    case 'load':
      return <LoadArt />;
    case 'offline':
      return <OfflineArt />;
    default:
      return <GenericArt />;
  }
}

// Implement NotFoundArt, CrashArt, LoadArt, OfflineArt, GenericArt as inline <svg>…
// Intent per spec:
// - not-found: lost / confused animal with map or question mark
// - crash: sad animal next to a cracked screen / broken piece
// - load: tired animal with unplugged cable
// - offline: animal with empty wifi / no-signal bars
// - generic: surprised “oops” animal
```

Use muted fills like `#64748b`, `#94a3b8`, and a soft primary blue `#3b82f6` — not purple. Each SVG: `className="h-40 w-40"`, `role="img"` omitted (decorative → `aria-hidden`).

- [ ] **Step 3: Create `ErrorState.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ERROR_COPY, type ErrorStateType } from './errorCopy';
import { ErrorIllustration } from './ErrorIllustrations';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  type: ErrorStateType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ type, title, message, onRetry, className }: ErrorStateProps) {
  const navigate = useNavigate();
  const copy = ERROR_COPY[type];
  const showRetry = copy.showRetry && typeof onRetry === 'function';

  return (
    <div
      className={cn(
        'flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <ErrorIllustration type={type} />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title ?? copy.title}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">{message ?? copy.message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {showRetry && (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button
          type="button"
          variant={showRetry ? 'outline' : 'default'}
          onClick={() => navigate('/')}
        >
          Go home
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual check**

Run: `npm run dev:renderer` (from `ERP-Client`). Temporarily render `<ErrorState type="not-found" />` in any page, confirm illustration + copy + Go home. Remove the temporary render before continuing.

- [ ] **Step 5: Commit only if user asked**

```bash
git add renderer/src/components/errors/
git commit -m "feat: add shared ErrorState with typed illustrations"
```

---

### Task 2: ErrorBoundary + OfflineGate + main wiring

**Files:**
- Create: `renderer/src/components/errors/ErrorBoundary.tsx`
- Create: `renderer/src/hooks/useOnlineStatus.ts`
- Create: `renderer/src/components/errors/OfflineGate.tsx`
- Modify: `renderer/src/main.tsx`

**Interfaces:**
- Consumes: `ErrorState` from Task 1
- Produces:
  - `export class ErrorBoundary extends React.Component<…>` with `resetErrorBoundary()`
  - `export function useOnlineStatus(): boolean`
  - `export function OfflineGate({ children }: { children: React.ReactNode }): JSX.Element`

- [ ] **Step 1: Create `ErrorBoundary.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background">
          <ErrorState type="crash" onRetry={this.reset} />
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Create `useOnlineStatus.ts`**

```ts
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
```

- [ ] **Step 3: Create `OfflineGate.tsx`**

When offline, show a full-viewport `ErrorState type="offline"` on top of children (children stay mounted so reconnect restores UI). Retry = no-op that re-reads `navigator.onLine` via forcing a state tick is unnecessary — when the browser fires `online`, the gate clears.

```tsx
import type { ReactNode } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { ErrorState } from './ErrorState';

export function OfflineGate({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();

  if (!online) {
    return (
      <div className="min-h-screen bg-background">
        <ErrorState
          type="offline"
          onRetry={() => {
            // Browser will flip online via event; nudge a reload of connectivity check
            if (navigator.onLine) window.location.reload();
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Update `main.tsx`**

Wrap providers so ErrorBoundary is outside the router tree’s parent but still inside providers that ErrorState needs. `ErrorState` uses `useNavigate`, so the boundary’s crash UI must render **inside** `HashRouter`. Therefore:

- Keep `App` owning `HashRouter`
- Put `ErrorBoundary` **inside** `App` wrapping `Routes` (done in Task 3) **and** also wrap the whole tree in `main` only for OfflineGate

Update `main.tsx` to:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { OfflineGate } from './components/errors/OfflineGate';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="erp-theme">
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineGate>
            <App />
          </OfflineGate>
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
```

Note: OfflineGate’s ErrorState uses `useNavigate`, but OfflineGate sits **outside** HashRouter. Fix: either (a) move OfflineGate inside `App` under HashRouter, or (b) make Go home use `window.location.hash = '#/'` when no router context.

**Required fix in this task:** Move `OfflineGate` into `App.tsx` inside `HashRouter` (Task 3 will place both OfflineGate and ErrorBoundary). Revert Offline wrap in `main.tsx` — leave `main.tsx` unchanged except if OfflineGate stays out, change Offline Go home:

Prefer **place OfflineGate inside App under HashRouter** (Task 3). For Step 4, **do not** wrap OfflineGate in `main.tsx`; only create the hook + Offline component files. Wiring happens in Task 3.

- [ ] **Step 5: Smoke-test OfflineGate in isolation**

Temporarily render OfflineGate around a div in a story-like check, or skip to Task 3 wiring. Confirm `useOnlineStatus` compiles: `npx tsc --noEmit` from ERP-Client if configured, else rely on Vite.

- [ ] **Step 6: Commit only if user asked**

```bash
git add renderer/src/components/errors/ErrorBoundary.tsx renderer/src/components/errors/OfflineGate.tsx renderer/src/hooks/useOnlineStatus.ts
git commit -m "feat: add ErrorBoundary and offline status gate"
```

---

### Task 3: NotFound route + App wiring (boundary + offline + 404)

**Files:**
- Create: `renderer/src/pages/NotFound.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `ErrorState`, `ErrorBoundary`, `OfflineGate`
- Produces: catch-all route; app-level crash + offline coverage

- [ ] **Step 1: Create `NotFound.tsx`**

```tsx
import { ErrorState } from '../components/errors/ErrorState';

export default function NotFound() {
  return <ErrorState type="not-found" />;
}
```

- [ ] **Step 2: Update `App.tsx`**

Import `ErrorBoundary`, `OfflineGate`, `NotFound`. Structure:

```tsx
function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <OfflineGate>
          <Routes>
            {/* existing public + protected routes unchanged */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OfflineGate>
      </ErrorBoundary>
    </HashRouter>
  );
}
```

Place `<Route path="*" element={<NotFound />} />` as the **last** child of `<Routes>` (after the protected `/` tree).

Protected unknown paths like `#/this-does-not-exist`: with current structure, `*` is a sibling of `/login` and `/`, so it matches and renders NotFound **without** AppLayout. That is correct for full-page 404.

- [ ] **Step 3: Verify 404**

Run app → open `#/definitely-not-a-route` → illustrated “This page wandered off” + Go home → navigates to `#/`.

- [ ] **Step 4: Verify crash boundary**

Temporarily add to any routed page:

```tsx
if (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('crash') === '1') {
  throw new Error('test crash');
}
```

Open that page with `?crash=1` in the hash query (or a simpler `const crash = true; if (crash) throw …` toggle). Confirm crash ErrorState, Try again clears, Go home works. Remove the temporary throw.

- [ ] **Step 5: Verify offline**

DevTools → Network → Offline → confirm offline illustration. Go online → UI returns.

- [ ] **Step 6: Commit only if user asked**

```bash
git add renderer/src/pages/NotFound.tsx renderer/src/App.tsx
git commit -m "feat: wire ErrorBoundary, OfflineGate, and 404 NotFound route"
```

---

### Task 4: Shared tables use ErrorState for load failures

**Files:**
- Modify: `renderer/src/components/DataTable.tsx` (error block ~lines 99–110)
- Modify: `renderer/src/components/ERPDataTable.tsx` (error block ~lines 105–112)

**Interfaces:**
- Consumes: `ErrorState` with `type="load"` and `onRetry`
- Produces: all pages using these tables get illustrated load errors automatically

- [ ] **Step 1: Update `DataTable.tsx` error UI**

Replace the destructive text block:

```tsx
{error && (
  <div className="p-8 text-center text-destructive">
    <p>Failed to load: {error}</p>
    …
  </div>
)}
```

with:

```tsx
{error && (
  <ErrorState
    type="load"
    className="min-h-[40vh] py-8"
    onRetry={onRefetch}
  />
)}
```

Add import: `import { ErrorState } from './errors/ErrorState';`

Do **not** display the raw `error` string in the UI (keeps stack/API noise out). Keep title/header toolbar visible above (parent layout already shows title row) — ErrorState replaces only the table body card content.

- [ ] **Step 2: Update `ERPDataTable.tsx` error UI**

Same replacement:

```tsx
{error && (
  <ErrorState
    type="load"
    className="min-h-[40vh] py-8"
    onRetry={() => void refetch()}
  />
)}
```

Import `ErrorState` from `./errors/ErrorState`.

- [ ] **Step 3: Verify load error**

With API down or bad base URL briefly: open Products / Inventory → illustrated “Couldn't load this” + Try again / Go home. Sidebar still visible.

- [ ] **Step 4: Commit only if user asked**

```bash
git add renderer/src/components/DataTable.tsx renderer/src/components/ERPDataTable.tsx
git commit -m "feat: show ErrorState on table load failures"
```

---

### Task 5: Detail pages with bare error text

**Files:**
- Modify: `renderer/src/pages/PurchaseOrderDetail.tsx` (error early return)
- Modify: `renderer/src/pages/BillDetail.tsx` (error early return)

**Interfaces:**
- Consumes: `ErrorState` `type="load"` + refetch if available

- [ ] **Step 1: Update PurchaseOrderDetail**

Find:

```tsx
if (error || !po) return <div className="p-6 text-red-500">Failed to load purchase order: {String(error)}</div>;
```

Replace with (adjust refetch name to match the page’s query):

```tsx
if (error || !po) {
  return (
    <ErrorState
      type="load"
      onRetry={() => void refetch()}
    />
  );
}
```

Import `ErrorState`. If the page has no `refetch`, pass `onRetry={() => window.location.reload()}`.

- [ ] **Step 2: Update BillDetail**

Same pattern for:

```tsx
if (error || !bill) return <div className="p-6 text-red-500">Failed to load bill: {String(error)}</div>;
```

→ `ErrorState type="load"` with refetch.

- [ ] **Step 3: Quick grep for remaining bare failures**

Run:

```bash
rg -n "Failed to load|text-red-500.*[Ee]rror" renderer/src/pages --glob '*.tsx'
```

For any **primary page-blocking** early returns (not form field errors), replace with `ErrorState type="load"` the same way. Skip inline form validation.

- [ ] **Step 4: Commit only if user asked**

```bash
git add renderer/src/pages/PurchaseOrderDetail.tsx renderer/src/pages/BillDetail.tsx
# plus any other pages touched in Step 3
git commit -m "feat: use ErrorState on detail page load failures"
```

---

### Task 6: Final verification pass

**Files:** none new

- [ ] **Step 1: Checklist against success criteria**

| Criterion | How to verify |
|-----------|----------------|
| Unknown hash route → 404 illustration + Go home | Visit `#/nope` |
| Render crash → crash illustration + Try again / Go home | Temp throw, then remove |
| Primary data load failure → load illustration inside layout | Break API / force query error on Products |
| Offline → offline illustration + recovery | DevTools offline |
| No blank white screen for above | Visual |
| No stack traces in UI | Visual |

- [ ] **Step 2: Confirm no new dependencies**

```bash
git diff package.json
```

Expected: no dependency changes from this feature.

- [ ] **Step 3: Commit only if user asked**

```bash
git add -A renderer/src/components/errors renderer/src/hooks/useOnlineStatus.ts renderer/src/pages/NotFound.tsx renderer/src/App.tsx renderer/src/components/DataTable.tsx renderer/src/components/ERPDataTable.tsx renderer/src/pages/PurchaseOrderDetail.tsx renderer/src/pages/BillDetail.tsx
git commit -m "feat: illustrated error states for crash, 404, load, and offline"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| ErrorState + 5 types + copy | 1 |
| Different illustrations per type | 1 |
| ErrorBoundary crash UI | 2–3 |
| NotFound `*` route | 3 |
| Load failures in content (tables) | 4 |
| Offline | 2–3 |
| Detail page load failures | 5 |
| No stack traces / friendly copy | 1, 4, 5 |
| Forms stay inline | Global constraint / Task 5 grep skip |
| Go home + Try again rules | 1 (`errorCopy.showRetry`) |

No placeholders left; OfflineGate router context resolved by placing it under HashRouter in Task 3.
