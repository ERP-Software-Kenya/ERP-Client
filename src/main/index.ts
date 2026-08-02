import * as path from 'path';
import { app, BrowserWindow, dialog, Menu, ipcMain } from 'electron';
import { version as APP_VERSION } from '../../package.json';
import { initSettingsStore, loadSettings, saveSettings } from './settings-store';
import { initAutoUpdater } from './auto-updater';
import { startStaticServer, stopStaticServer, STATIC_SERVER_ORIGIN } from './static-server';

// Keep dev and packaged on same AppData folder
app.setName('Core ERP Client');

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

let appIpcRegistered = false;

function registerAppIpc(): void {
  if (appIpcRegistered) return;
  appIpcRegistered = true;

  ipcMain.handle('app:get-version', () => APP_VERSION);

  ipcMain.handle('app:get-update-settings', () => {
    const s = loadSettings();
    return {
      githubToken: s.githubToken,
      updateCheckIntervalMinutes: s.updateCheckIntervalMinutes,
    };
  });

  ipcMain.handle('app:save-update-settings', (_event, partial: {
    githubToken?: string;
    updateCheckIntervalMinutes?: number;
  }) => {
    try {
      const next = saveSettings({
        ...(partial.githubToken !== undefined ? { githubToken: partial.githubToken } : {}),
        ...(partial.updateCheckIntervalMinutes !== undefined
          ? { updateCheckIntervalMinutes: partial.updateCheckIntervalMinutes }
          : {}),
      });
      return {
        success: true,
        settings: {
          githubToken: next.githubToken,
          updateCheckIntervalMinutes: next.updateCheckIntervalMinutes,
        },
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#0f172a',
    show: false,
    title: `Core ERP Client v${APP_VERSION}`,
  });

  // Suppress default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (mainWindow) initAutoUpdater(mainWindow);
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadURL(`${STATIC_SERVER_ORIGIN}/`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  initSettingsStore(app.getPath('userData'));
  registerAppIpc();
  if (!isDev) {
    const rendererDir = path.join(__dirname, '../renderer');
    try {
      await startStaticServer(rendererDir);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dialog.showErrorBox('Core ERP Client — Startup Error', message);
      app.quit();
      return;
    }
  }
  return createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopStaticServer();
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
