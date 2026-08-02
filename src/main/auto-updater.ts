import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import logger from './logger';
import { loadSettings, saveSettings } from './settings-store';

// --------------------------------------------------------
// Configuration
// --------------------------------------------------------
autoUpdater.logger = logger;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const PACKAGED_ONLY_ERROR = 'Updates only work in packaged builds.';

// --------------------------------------------------------
// State & Helpers
// --------------------------------------------------------
let targetWindow: BrowserWindow | null = null;
let ipcRegistered = false;
let scheduleStarted = false;
let cachedState = { status: 'idle', version: '', releaseDate: '' };

const send = (channel: string, ...args: unknown[]) => {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send(channel, ...args);
  }
};

const configureAuth = () => {
  const token = loadSettings().githubToken || process.env.ERP_CLIENT_APP_UPDATE_KEY || process.env.GH_TOKEN || null;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'HitarthSM',
    repo: 'ERP-Client',
    private: false,
    ...(token ? { token } : {}),
  });
};

const getCheckIntervalMs = (): number => {
  const minutes = Math.max(loadSettings().updateCheckIntervalMinutes ?? 1440, 1);
  return minutes * 60_000;
};

// --------------------------------------------------------
// Background Updates & IPC (Main App)
// --------------------------------------------------------
export function initAutoUpdater(win: BrowserWindow): void {
  targetWindow = win;

  // 1. Register IPC handlers only once
  if (!ipcRegistered) {
    ipcRegistered = true;
    
    // Events -> Renderer
    autoUpdater.on('checking-for-update', () => send('update:checking'));
    autoUpdater.on('update-available', (info) => {
      cachedState = { status: 'available', version: info.version, releaseDate: info.releaseDate ?? '' };
      send('update:available', cachedState);
    });
    autoUpdater.on('update-not-available', () => send('update:not-available'));
    autoUpdater.on('download-progress', (p) => send('update:progress', p));
    autoUpdater.on('update-downloaded', (info) => {
      cachedState = { status: 'downloaded', version: info.version, releaseDate: '' };
      send('update:downloaded', { version: info.version });
    });
    autoUpdater.on('error', (err) => send('update:error', err.message));

    // Renderer -> Main
    ipcMain.handle('app:get-update-state', () => cachedState);
    ipcMain.handle('app:check-update', async () => {
      if (!app.isPackaged) return { success: false, error: PACKAGED_ONLY_ERROR };
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
      if (!app.isPackaged) return { success: false, error: PACKAGED_ONLY_ERROR };
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });
    ipcMain.handle('app:install-update', () => {
      if (!app.isPackaged) return { success: false, error: PACKAGED_ONLY_ERROR };
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    });
  }

  // 2. Schedule background polling
  if (app.isPackaged && !scheduleStarted) {
    scheduleStarted = true;
    const runScheduledCheck = () => {
      configureAuth();
      autoUpdater.checkForUpdates().catch(() => {});
      saveSettings({ lastUpdateCheckAt: Date.now() });
      setTimeout(runScheduledCheck, getCheckIntervalMs());
    };

    const lastCheck = loadSettings().lastUpdateCheckAt ?? 0;
    const intervalMs = getCheckIntervalMs();
    const delayMs = Math.max(15_000, intervalMs - (Date.now() - lastCheck));
    
    setTimeout(runScheduledCheck, delayMs);
  }
}
