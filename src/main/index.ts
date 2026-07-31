import * as path from 'path';
import { pathToFileURL } from 'url';
import { app, BrowserWindow, Menu, net, protocol } from 'electron';
import { version as APP_VERSION } from '../../package.json';

// Keep dev and packaged on same AppData folder
app.setName('Core ERP Client');

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

// Stable origin for the packaged app (replaces file://, which has no origin Clerk/OAuth
// can validate a redirect against and no working localStorage partition). Must be
// registered before app 'ready'.
const APP_SCHEME = 'app';
protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function registerAppProtocol(): void {
  const rendererDir = path.join(__dirname, '../renderer');
  protocol.handle(APP_SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.join(rendererDir, decodeURIComponent(pathname));
    const relative = path.relative(rendererDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

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
    await mainWindow.loadURL(`${APP_SCHEME}://bundle/index.html`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (!isDev) registerAppProtocol();
  return createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
