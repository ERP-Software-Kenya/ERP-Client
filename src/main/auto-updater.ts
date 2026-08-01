import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import logger from './logger';
import { loadSettings, saveSettings } from './settings-store';

autoUpdater.logger = logger;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const DEFAULT_CHECK_INTERVAL_MINUTES = 1440;
const PACKAGED_ONLY_ERROR = 'Updates only work in packaged builds.';

type CachedUpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string; releaseDate: string }
  | { status: 'downloaded'; version: string };

let cachedState: CachedUpdateState = { status: 'idle' };

function getCheckIntervalMs(): number {
  const settings = loadSettings();
  const minutes = Math.max(
    settings.updateCheckIntervalMinutes ?? DEFAULT_CHECK_INTERVAL_MINUTES,
    1,
  );
  return minutes * 60_000;
}

function getGithubToken(): string | null {
  const settings = loadSettings();
  return (
    settings.githubToken ||
    process.env.ERP_CLIENT_APP_UPDATE_KEY ||
    process.env.GH_TOKEN ||
    null
  );
}

function configureAuth(): boolean {
  // Public repo HitarthSM/ERP-Client — token optional. Token still helps with rate limits.
  const token = getGithubToken();
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'HitarthSM',
    repo: 'ERP-Client',
    private: false,
    ...(token ? { token } : {}),
  });
  return true;
}

function runCheck(): void {
  configureAuth();
  autoUpdater.checkForUpdates().catch((e: Error) =>
    logger.warn(`[auto-updater] Scheduled check failed: ${e.message}`),
  );
  saveSettings({ lastUpdateCheckAt: Date.now() });
}

function scheduleCheck(delayMs: number): void {
  setTimeout(() => {
    runCheck();
    scheduleCheck(getCheckIntervalMs());
  }, delayMs);
}

let ipcRegistered = false;
let scheduleStarted = false;
let targetWindow: BrowserWindow | null = null;

function send(channel: string, ...args: unknown[]): void {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send(channel, ...args);
  }
}

export function initAutoUpdater(win: BrowserWindow): void {
  targetWindow = win;

  if (!ipcRegistered) {
    ipcRegistered = true;

    autoUpdater.on('checking-for-update', () => {
      logger.info('[auto-updater] Checking for update…');
      send('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
      logger.info(`[auto-updater] Update available: v${info.version}`);
      cachedState = {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate ?? '',
      };
      send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('[auto-updater] App is up to date.');
      send('update:not-available');
    });

    autoUpdater.on('download-progress', (progress) => {
      send('update:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.info(`[auto-updater] Update downloaded: v${info.version}`);
      cachedState = { status: 'downloaded', version: info.version };
      send('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      logger.error(`[auto-updater] Error: ${err.message}`);
      send('update:error', err.message);
    });

    ipcMain.handle('app:get-update-state', () => cachedState);

    ipcMain.handle('app:check-update', async () => {
      if (!app.isPackaged) {
        return { success: false, error: PACKAGED_ONLY_ERROR };
      }
    configureAuth();
    try {
      await autoUpdater.checkForUpdates();
      saveSettings({ lastUpdateCheckAt: Date.now() });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
    });

    ipcMain.handle('app:download-update', async () => {
      if (!app.isPackaged) {
        return { success: false, error: PACKAGED_ONLY_ERROR };
      }
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    ipcMain.handle('app:install-update', () => {
      if (!app.isPackaged) {
        return { success: false, error: PACKAGED_ONLY_ERROR };
      }
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    });
  }

  if (app.isPackaged && !scheduleStarted) {
    scheduleStarted = true;
    const settings = loadSettings();
    const lastCheck = settings.lastUpdateCheckAt ?? 0;
    const intervalMs = getCheckIntervalMs();
    const msSinceLast = Date.now() - lastCheck;
    const delayMs = msSinceLast >= intervalMs ? 15_000 : intervalMs - msSinceLast;

    logger.info(
      `[auto-updater] Next check in ${Math.round(delayMs / 60_000)} min ` +
        `(interval: ${Math.round(intervalMs / 60_000)} min, ` +
        `last check: ${lastCheck ? new Date(lastCheck).toISOString() : 'never'})`,
    );

    scheduleCheck(delayMs);
  }
}
