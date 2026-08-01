# ERP-Client Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add NFC-style private GitHub auto-update to packaged Core ERP Client (check → banner → download → restart) while keeping existing `publish-release`.

**Architecture:** Bundle `electron-updater` into main via esbuild; first preload/IPC surface; local `userData/app-settings.json`; Settings page `/settings/app`; banner in `AppLayout`.

**Tech Stack:** Electron 43, electron-updater, electron-log, esbuild (CJS main+preload), React renderer, existing electron-builder GitHub publish.

## Global Constraints

- Auth: Settings `githubToken` → `ERP_CLIENT_APP_UPDATE_KEY` → `GH_TOKEN`
- Feed: `HitarthSM/ERP-Client`, `private: false` (token optional for updates)
- Do not externalize `electron-updater` / `electron-log` in esbuild
- Keep `files: ["dist/**/*", "package.json", "!node_modules/**/*"]`
- No update UI on Platform Configurations
- Scheduled checks only when `app.isPackaged`
- Unpackaged check returns: `Updates only work in packaged builds.`
- No commits unless user asks

---

### Task 1: Dependencies + main settings + logger + auto-updater

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/main/logger.ts`
- Create: `src/main/settings-store.ts`
- Create: `src/main/auto-updater.ts`
- Create: `.env.example` (root)

**Interfaces:**
- Produces: `initSettingsStore(userDataPath)`, `loadSettings()`, `saveSettings()`, `initAutoUpdater(win)`, settings keys `githubToken`, `updateCheckIntervalMinutes`, `lastUpdateCheckAt`

- [ ] **Step 1:** `npm install electron-updater electron-log` (dependencies, not only dev)
- [ ] **Step 2:** Add `logger.ts` wrapping `electron-log`
- [ ] **Step 3:** Add `settings-store.ts` with defaults (`githubToken: ""`, `updateCheckIntervalMinutes: 1440`)
- [ ] **Step 4:** Add `auto-updater.ts` ported from NFC with repo `core-erp-client`, env `ERP_CLIENT_APP_UPDATE_KEY`, packaged-only schedule, unpackaged `app:check-update` error string from spec
- [ ] **Step 5:** Add root `.env.example` with `GITHUB_DEPLOY_KEY` and `ERP_CLIENT_APP_UPDATE_KEY`
- [ ] **Step 6:** Verify: `npx tsc --noEmit` not required if no root tsconfig for main; instead `npm run build:main` after Task 2 wires entries

---

### Task 2: Preload + build-main + index wiring

**Files:**
- Create: `src/main/preload.ts`
- Modify: `scripts/build-main.ts` (dual entryPoints)
- Modify: `src/main/index.ts` (preload path, init store + updater)
- Modify: `renderer/src/global.d.ts` (typed `electronAPI`)

**Interfaces:**
- Consumes: `initAutoUpdater`, `initSettingsStore`, `loadSettings`, `saveSettings`
- Produces: `window.electronAPI` methods matching IPC in spec

- [ ] **Step 1:** `preload.ts` exposes getVersion, update settings get/save, update state, check/download/install, event unsubscribers
- [ ] **Step 2:** `build-main.ts` entryPoints `index.ts` + `preload.ts`
- [ ] **Step 3:** `index.ts`: `preload: path.join(__dirname, 'preload.cjs')`, `initSettingsStore(app.getPath('userData'))`, `initAutoUpdater` on ready-to-show; IPC for version + settings if not only in auto-updater
- [ ] **Step 4:** Register `app:get-version`, settings get/save in main (auto-updater or index)
- [ ] **Step 5:** Run `npm run build:main` — expect `dist/main/index.cjs` + `dist/main/preload.cjs`

---

### Task 3: Renderer UI — banner, App Updates page, nav/route

**Files:**
- Create: `renderer/src/components/UpdateBanner.tsx`
- Create: `renderer/src/pages/AppUpdates.tsx`
- Modify: `renderer/src/components/layout/AppLayout.tsx`
- Modify: `renderer/src/App.tsx`
- Modify: `renderer/src/config/modules.ts`

**Interfaces:**
- Consumes: `window.electronAPI.*` from Task 2

- [ ] **Step 1:** `UpdateBanner` with NFC states + confirm on Restart
- [ ] **Step 2:** `AppUpdates` page: version, token, interval, save, check, packaged hint
- [ ] **Step 3:** Mount banner in `AppLayout` above Topbar
- [ ] **Step 4:** Route `/settings/app` + nav item “App updates”
- [ ] **Step 5:** Run `npm run build:renderer` and `npm run build:main`

---

### Task 4: Verification

**Files:** none (commands)

- [ ] **Step 1:** `npm run build` succeeds
- [ ] **Step 2:** Confirm `dist/main/preload.cjs` exists
- [ ] **Step 3:** Smoke: start/dev or node assert preload file; document Windows publish checklist from spec
- [ ] **Step 4:** Report remaining risks (Windows E2E not run on Linux)

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Bundle updater, not external | 1–2 |
| Preload/IPC | 2 |
| Settings store + `/settings/app` | 1, 3 |
| Banner + cachedState | 1, 3 |
| Packaged-only schedule / unpackaged error | 1 |
| `.env.example` | 1 |
| Keep publish-release | unchanged |
| Test plan A | 4 |
| Test plan B Windows | operator checklist in Task 4 report |
