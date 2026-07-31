import * as path from 'path';
import { app, BrowserWindow, dialog, Menu } from 'electron';
import { version as APP_VERSION } from '../../package.json';
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

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Packaged UI is served over loopback HTTP so Clerk Google OAuth can redirect
    // to an http origin (app:// custom schemes are rejected / unreliable).
    await mainWindow.loadURL(`${STATIC_SERVER_ORIGIN}/`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    const rendererDir = path.join(__dirname, '../renderer');
    try {
      await startStaticServer(rendererDir);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dialog.showErrorBox('Core ERP Client', message);
      app.quit();
      return;
    }
  }
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopStaticServer();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
