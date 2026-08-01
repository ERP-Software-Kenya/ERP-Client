# ERP-Client Auto-Update (GitHub Private Releases)

**Date:** 2026-08-01  
**Scope:** ERP-Client Electron main + preload + renderer settings/banner; reuse existing publish pipeline  
**Status:** Approved in brainstorming (Approach A)  
**Approach:** NFC-style private GitHub + `electron-updater` + user PAT in local Settings (env fallback)

## Goal

Ship in-app updates for packaged Core ERP Client builds: check a private GitHub Releases feed, let the user download, then restart to install — without changing the existing `npm run publish-release` flow except docs/env examples.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Auth model | **A** adapted — public GitHub `HitarthSM/ERP-Client`; token optional for updates; `GITHUB_DEPLOY_KEY` required to publish |
| Release repo | `HitarthSM/ERP-Client` (matches `package.json` `build.publish`) |
| Publish | Keep local `scripts/publish-release.ts` + `electron-builder --publish always` |
| CI / code signing | Out of scope for v1 |
| Differential packages | Keep `nsis.differentialPackage: false` |
| Settings UI location | **Local** App Updates page (`/settings/app`) — **not** Platform Configurations (Core API) |
| Dev behavior | No scheduled checks unless `app.isPackaged`; Settings shows packaged-only hint |
| Packaging | Bundle `electron-updater` + `electron-log` into main (`esbuild`); do **not** externalize them; keep `!node_modules/**/*` |

## Current baseline

Already present:

- `scripts/publish-release.ts` (loads `GITHUB_DEPLOY_KEY` → `GH_TOKEN`)
- `build.publish` → GitHub public `HitarthSM/ERP-Client`
- NSIS Windows target, output `release/`

Missing:

- `electron-updater` / auto-check / download / install
- Preload + IPC (main is window-only today)
- Local settings store for update prefs
- Update banner + Settings UI

## Architecture

```text
Publish machine                     Installed ERP Client
───────────────                     ────────────────────
bump package.json version
GITHUB_DEPLOY_KEY → GH_TOKEN
electron-builder --publish always
        │
        ▼
GitHub Release + NSIS + latest.yml
        │
        ▼                    settings.githubToken
                             or ERP_CLIENT_APP_UPDATE_KEY
                             or GH_TOKEN
                                    │
                             autoUpdater.setFeedURL({
                               provider: github,
                               owner: HitarthSM,
                               repo: ERP-Client,
                               private: false,
                               token? (optional)
                             })
                                    │
                             check → banner → download → quitAndInstall
```

### Behavior (match NFC / Kata)

- `autoDownload = false`
- `autoInstallOnAppQuit = true`
- Scheduled checks only when `app.isPackaged`
- Default interval: 1440 minutes; first check after ~15s if interval already elapsed
- Re-read interval from settings each cycle
- Main-process `cachedState` so banner restores after Clerk login
- Manual “Check for Updates” from Settings
- Install: `quitAndInstall(false, true)` with confirm dialog on “Restart Now”

## Components

| Piece | Responsibility |
|-------|----------------|
| `src/main/settings-store.ts` | Persist `userData/app-settings.json`: `githubToken`, `updateCheckIntervalMinutes`, `lastUpdateCheckAt` |
| `src/main/auto-updater.ts` | Configure feed, schedule, events → renderer, IPC handlers |
| `src/main/preload.ts` | `window.electronAPI` update + settings + version APIs only |
| `src/main/index.ts` | Set `webPreferences.preload`, `initAutoUpdater` on `ready-to-show` |
| `scripts/build-main.ts` | Entry points: `index.ts` + `preload.ts`; `external: ['electron']` only |
| `renderer/.../UpdateBanner.tsx` | Available → Download → progress → Restart |
| `renderer/.../AppUpdates.tsx` | Token, interval, Check now, show app version |
| `AppLayout` | Mount banner above Topbar |
| `App.tsx` + `modules.ts` | Route `/settings/app`, nav item under Settings |
| Root `.env.example` | `GITHUB_DEPLOY_KEY`, `ERP_CLIENT_APP_UPDATE_KEY` |

### IPC surface

Invoke:

- `app:get-version`
- `app:get-update-settings` / `app:save-update-settings`
- `app:get-update-state`
- `app:check-update` / `app:download-update` / `app:install-update`

Push events: `update:checking`, `update:available`, `update:not-available`, `update:progress`, `update:downloaded`, `update:error`

## Error handling (required)

| Failure | Handling |
|---------|----------|
| Missing `GITHUB_DEPLOY_KEY` on publish | Script exits 1 with clear message (already) |
| Wrong repo / token scope on publish | Fail publish; document org repo access |
| Version not bumped | Manual bump before publish (document); no auto-bump in v1 |
| Empty/interrupted pack | Verify `release/win-unpacked/resources/app.asar` before shipping |
| Unpackaged `check` | Return `{ success: false, error: "Updates only work in packaged builds." }` |
| No client token | Skip schedule with log warn; manual check returns configure-token error |
| Bad/expired PAT / 401/403/404 | `update:error` dismissible banner + Settings hint |
| Offline / timeout | Soft fail; next interval retries; app stays up |
| Download / hash / disk errors | Error banner; allow retry Download; do not quit |
| Restart while working | Confirm dialog before `installUpdate` |
| Preload path wrong | `path.join(__dirname, 'preload.cjs')` next to bundled main |
| Env token not in asar | Primary path is Settings PAT; env fallback only for launches that inject env |

## Explicit non-goals (v1)

- GitHub Actions publish
- Code signing / SmartScreen remediation
- Baking update token into the binary (Approach B)
- Public releases / S3 generic provider
- Differential NSIS packages
- Putting update settings on Platform Configurations (server API)

## Test plan

### Dev (this machine)

1. Main+renderer build succeeds; preload present at `dist/main/preload.cjs`.
2. `window.electronAPI` defined in renderer (dev Electron).
3. App Updates page save/load token + interval from `userData`.
4. Check for Updates while unpackaged returns packaged-only error (no crash).
5. Banner idle when no update state.

### Packaged / Windows (operator checklist)

1. Bump version (e.g. `0.1.0` → `0.1.1`); set `GITHUB_DEPLOY_KEY`.
2. Run `npm run publish-release` on Windows.
3. Confirm Release assets include installer + `latest.yml` on `HitarthSM/ERP-Client`.
4. Install older build; Check (token optional) → banner → Download → Restart → version matches.
5. Negatives: offline / bad feed — clear errors, app remains usable.
6. Confirm `app.asar` exists after pack.

### Environment note

Linux CI/dev hosts cannot fully exercise NSIS install + `quitAndInstall`. Implement and verify compile/IPC/settings/gating here; Windows loop is the operator checklist above.

## Acceptance

- Packaged app can discover a newer GitHub release on `HitarthSM/ERP-Client` (token optional).
- User can download and restart to install without manual installer download.
- Dev mode does not spam update checks or crash without preload/token.
- Publish pipeline targets `HitarthSM/ERP-Client`; root `.env.example` documents keys.
- Update settings live on `/settings/app`, not Platform Configurations.
