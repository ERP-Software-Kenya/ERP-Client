import * as path from 'path';
import { app, BrowserWindow, Menu } from 'electron';
import { getDb, closeDb } from './database';
import { setupIpcHandlers } from './ipc-handlers';
import { hasUsers, setupUser, adminResetPassword } from './auth';
import { version as APP_VERSION } from '../../package.json';

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

let shuttingDown = false;
function shutdownServices(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  closeDb();
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Init DB early (runs migrations)
  getDb();
  
  // Ensure default admin exists and password is password123
  try {
    const db = getDb();
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number } | undefined;
    
    if (!adminExists) {
      console.log('[Setup] Creating default admin user.');
      setupUser({
        name: 'System Admin',
        username: 'admin',
        password: 'password123',
        pin: '1234'
      });
    } else {
      console.log('[Setup] Admin exists, resetting password to password123.');
      adminResetPassword(adminExists.id, 'password123');
    }
  } catch (err) {
    console.error('[Setup] Failed to seed/reset admin:', err);
  }

  // Register all IPC handlers
  setupIpcHandlers();
  await createWindow();
});

app.on('window-all-closed', () => {
  shutdownServices();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  shutdownServices();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
