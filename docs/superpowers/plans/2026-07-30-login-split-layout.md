# Login Split Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the ERP Client login page into a split layout — CSS-animated visual panel on the left, sign-in/sign-up/verify forms on the right — without changing Clerk auth logic.

**Architecture:** Keep all auth handlers inside `Login.tsx`. Add a presentational left-panel component and CSS keyframes in `index.css`. Desktop uses a two-column grid; below `lg` the visual panel is hidden.

**Tech Stack:** React, Tailwind CSS v4 (`@theme` tokens), existing shadcn UI primitives, pure CSS animations (no new deps).

## Global Constraints

- No new npm dependencies
- Do not change Clerk sign-in / sign-up / verify / OAuth handlers or mode state machine
- Form on the **right**, animation on the **left** at `≥ lg`
- Animation panel **hidden** below `lg`
- Use existing `--primary` blue tones (avoid purple glow cliché)
- Honor `prefers-reduced-motion: reduce`
- Decorative elements must be `aria-hidden`
- Spec: `docs/superpowers/specs/2026-07-30-login-split-layout-design.md`
- Do not commit unless the user explicitly asks

---

## File map

| Path | Responsibility |
|---|---|
| `renderer/src/components/auth/LoginVisualPanel.tsx` | Left decorative panel: brand, tagline, orbs, mesh |
| `renderer/src/index.css` | `@keyframes` + `.login-*` utility classes + reduced-motion |
| `renderer/src/pages/Login.tsx` | Split shell layout; wrap existing forms in right column |

---

### Task 1: Login visual CSS

**Files:**
- Modify: `renderer/src/index.css` (append after existing `.custom-scrollbar` block)

**Interfaces:**
- Consumes: none
- Produces: CSS classes `login-visual`, `login-mesh`, `login-orb`, `login-orb-1`…`login-orb-4`, `login-brand`, `login-tagline`; keyframes `login-orb-drift`, `login-orb-pulse`, `login-mesh-drift`

- [ ] **Step 1: Append login animation CSS**

Append exactly this block to the end of `renderer/src/index.css`:

```css
/* Login split visual panel */
.login-visual {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    145deg,
    hsl(221.2 83.2% 53.3%) 0%,
    hsl(221.2 70% 38%) 45%,
    hsl(222.2 47% 20%) 100%
  );
  color: hsl(210 40% 98%);
}

.login-mesh {
  position: absolute;
  inset: -20%;
  background-image:
    linear-gradient(hsl(210 40% 98% / 0.06) 1px, transparent 1px),
    linear-gradient(90deg, hsl(210 40% 98% / 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  animation: login-mesh-drift 28s linear infinite;
  pointer-events: none;
}

.login-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
  will-change: transform, opacity;
}

.login-orb-1 {
  width: 22rem;
  height: 22rem;
  top: -8%;
  left: -10%;
  background: hsl(210 90% 70% / 0.45);
  animation: login-orb-drift 18s ease-in-out infinite alternate,
    login-orb-pulse 7s ease-in-out infinite;
}

.login-orb-2 {
  width: 16rem;
  height: 16rem;
  bottom: 8%;
  right: -6%;
  background: hsl(200 80% 60% / 0.35);
  animation: login-orb-drift 22s ease-in-out infinite alternate-reverse,
    login-orb-pulse 9s ease-in-out infinite 1s;
}

.login-orb-3 {
  width: 12rem;
  height: 12rem;
  top: 42%;
  left: 38%;
  background: hsl(230 70% 65% / 0.3);
  animation: login-orb-drift 14s ease-in-out infinite alternate,
    login-orb-pulse 6s ease-in-out infinite 0.5s;
}

.login-orb-4 {
  width: 9rem;
  height: 9rem;
  bottom: 28%;
  left: 12%;
  background: hsl(190 75% 55% / 0.28);
  animation: login-orb-drift 20s ease-in-out infinite alternate-reverse,
    login-orb-pulse 8s ease-in-out infinite 1.5s;
}

.login-brand {
  position: relative;
  z-index: 1;
  font-size: clamp(2.25rem, 4vw, 3.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.login-tagline {
  position: relative;
  z-index: 1;
  margin-top: 0.75rem;
  font-size: 1.05rem;
  opacity: 0.85;
  max-width: 18rem;
}

@keyframes login-orb-drift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(36px, -28px) scale(1.06);
  }
}

@keyframes login-orb-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.9;
  }
}

@keyframes login-mesh-drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(48px, 48px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-mesh,
  .login-orb {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Verify CSS file still parses**

Run from `ERP-Client`:

```bash
npx --yes tsc -p renderer --noEmit 2>/dev/null || npx --yes tsc --noEmit 2>/dev/null || true
# Also confirm the CSS block is present:
rg -n "login-orb-drift|prefers-reduced-motion" renderer/src/index.css
```

Expected: `login-orb-drift` and `prefers-reduced-motion` both match in `index.css`.

---

### Task 2: LoginVisualPanel component

**Files:**
- Create: `renderer/src/components/auth/LoginVisualPanel.tsx`

**Interfaces:**
- Consumes: CSS classes from Task 1
- Produces: `export default function LoginVisualPanel(): JSX.Element` — no props

- [ ] **Step 1: Create the component**

Create `renderer/src/components/auth/LoginVisualPanel.tsx` with:

```tsx
export default function LoginVisualPanel() {
  return (
    <aside
      className="login-visual hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-center px-12 xl:px-16"
      aria-label="Core ERP branding"
    >
      <div className="login-mesh" aria-hidden="true" />
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />
      <div className="login-orb login-orb-4" aria-hidden="true" />

      <p className="login-brand">Core ERP</p>
      <p className="login-tagline">Operations, unified.</p>
    </aside>
  );
}
```

- [ ] **Step 2: Smoke-check export**

Run:

```bash
rg -n "export default function LoginVisualPanel" renderer/src/components/auth/LoginVisualPanel.tsx
```

Expected: one match.

---

### Task 3: Wire split layout into Login.tsx

**Files:**
- Modify: `renderer/src/pages/Login.tsx`

**Interfaces:**
- Consumes: `LoginVisualPanel` default export
- Produces: unchanged auth behavior; new outer layout only

- [ ] **Step 1: Add import**

At the top of `Login.tsx`, add:

```tsx
import LoginVisualPanel from '../components/auth/LoginVisualPanel';
```

- [ ] **Step 2: Replace the outer return shell**

Replace only the outermost JSX wrapper of the main return (the block that currently starts with `<div className="min-h-screen flex items-center justify-center ...">` and contains the card). Keep every form / mode block inside identical in behavior.

New structure:

```tsx
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <LoginVisualPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1 lg:hidden">Core ERP Client</h1>
            <p className="text-muted-foreground">{title}</p>
          </div>

          {/* KEEP existing mode === 'sign-in' form block unchanged */}
          {/* KEEP existing mode === 'sign-up' form block unchanged */}
          {/* KEEP existing verify forms block unchanged */}
        </div>
      </div>
    </div>
  );
```

Concrete edits vs current file:

1. Remove the centered card chrome: drop `bg-card border border-border rounded-xl shadow-lg p-8` from the form wrapper (forms sit on the page background).
2. Move the large `Core ERP Client` heading so it shows only on mobile (`lg:hidden`); desktop brand lives on the left panel.
3. Keep `title` subtitle above the form.
4. Leave all `handleSignIn` / `handleSignUp` / verify / Google / mode toggle code untouched.
5. Keep `#clerk-captcha` inside the sign-up form.

Also update the syncing spinner return to stay full-screen centered (no split needed):

```tsx
  if (syncing && clerk.session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Signing you in…
      </div>
    );
  }
```

(This block already exists — leave as-is.)

- [ ] **Step 3: Typecheck**

From `ERP-Client`:

```bash
npx tsc --noEmit
```

Expected: exit 0 (or only pre-existing unrelated errors — none introduced in Login files).

- [ ] **Step 4: Manual verification checklist**

Start the renderer (`npm run dev` or project’s usual command), open `/login` (or the app’s login route), and confirm:

1. Desktop (`≥1024px`): left blue animated panel with “Core ERP” + tagline; right form
2. Orbs slowly drift/pulse; mesh drifts
3. Narrow viewport: left panel hidden; form full-width; mobile brand heading visible
4. Sign-in → Sign up toggle still works
5. Google button still present
6. Sign-up still shows `#clerk-captcha`
7. OS reduced-motion (or DevTools Emulate CSS `prefers-reduced-motion: reduce`): orbs/mesh stop moving

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| 50/50 split, form right / visual left | Task 3 + Task 2 |
| Hide visual below `lg` | Task 2 (`hidden lg:flex`) |
| CSS orbs + mesh, primary blues | Task 1 |
| Brand + tagline | Task 2 |
| `prefers-reduced-motion` | Task 1 |
| `aria-hidden` decorations | Task 2 |
| Auth modes unchanged | Task 3 (handlers untouched) |
| No new deps | Global constraint |
| Right column scroll for tall signup | Task 3 (`overflow-y-auto`) |

Placeholder scan: none. Type/name consistency: `LoginVisualPanel`, class names `login-*` match across tasks.
