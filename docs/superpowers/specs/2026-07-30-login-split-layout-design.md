# Login split layout — design

**Date:** 2026-07-30  
**Status:** Approved for planning  
**Scope:** `ERP-Client/renderer` login page visual redesign only

## Goal

Replace the centered login card with a two-column layout: decorative animated panel on the left, sign-in / sign-up / verify forms on the right. Mobile collapses to form-only.

## Non-goals

- No changes to Clerk auth flows, handlers, or modes
- No new animation libraries (no framer-motion, Lottie, GSAP)
- No product-feature storytelling or marketing copy beyond a short tagline
- No changes to SSO / create-org pages unless they share this shell later

## Layout

| Breakpoint | Behavior |
|---|---|
| `< lg` | Full-width form panel only; animation panel hidden |
| `≥ lg` | ~50/50 split: left visual, right form |

- Form sits on the **right** (LTR action panel)
- Animation sits on the **left** (brand visual first)
- Page is `min-h-screen`; both columns stretch full height

## Left panel (visual)

- Background: primary-tinted gradient using existing CSS variables (`--primary` / blue tones from `index.css`)
- Content: brand wordmark **Core ERP** + one short tagline (e.g. “Operations, unified”)
- Decoration: 3–4 soft gradient orbs + optional subtle mesh/grid, absolute-positioned
- Motion (CSS only):
  1. Orb drift (slow translate)
  2. Soft pulse (opacity / scale)
  3. Slow mesh drift or rotate
- `prefers-reduced-motion: reduce` disables or freezes animations

## Right panel (auth)

- Keep all existing modes: `sign-in`, `sign-up`, `verify-signup`, `verify-second-factor`
- Keep Google OAuth, resend, back navigation, captcha mount (`#clerk-captcha`)
- Visual: calm surface (background / card tokens), form max-width ~28rem, vertically centered
- Drop the floating centered card-in-void look; form lives inside the right column
- Preserve existing shadcn `Button` / `Input` / `Label` and toast error handling

## Components / files

| Path | Intent |
|---|---|
| `renderer/src/pages/Login.tsx` | Restructure JSX into split shell; extract small presentational left-panel markup |
| `renderer/src/index.css` (or colocated CSS) | Keyframes + reduced-motion rules for login orbs/mesh |

Optional later (out of scope unless needed for clarity): `LoginVisualPanel.tsx` if markup gets noisy.

## Accessibility

- Decorative orbs/mesh are `aria-hidden`
- Form remains keyboard-accessible; focus order unchanged
- Reduced-motion support as above
- Contrast: left panel text on primary gradient must meet readable contrast; right panel keeps existing foreground/muted tokens

## Testing / verification

- Manual: sign-in, sign-up, verify email, Google button still present
- Resize: animation hidden below `lg`; form usable full-width
- `prefers-reduced-motion`: animations stop
- No new npm dependencies

## Risks / assumptions

- Electron/Vite renderer already supports Tailwind v4 `@theme` tokens used today
- Tagline copy is placeholder and can be edited in one place
- Signup form height on smaller desktop heights may need scroll inside the right column (`overflow-y-auto`)
