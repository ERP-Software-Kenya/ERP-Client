import { contextBridge, ipcRenderer } from 'electron';

export type UpdateSettingsPayload = {
  githubToken: string;
  updateCheckIntervalMinutes: number;
};

const electronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:get-version') as Promise<string>,

  getUpdateSettings: () =>
    ipcRenderer.invoke('app:get-update-settings') as Promise<UpdateSettingsPayload>,

  saveUpdateSettings: (settings: Partial<UpdateSettingsPayload>) =>
    ipcRenderer.invoke('app:save-update-settings', settings) as Promise<{
      success: boolean;
      settings?: UpdateSettingsPayload;
      error?: string;
    }>,

  getUpdateState: () =>
    ipcRenderer.invoke('app:get-update-state') as Promise<{
      status: string;
      version?: string;
      releaseDate?: string;
    }>,

  checkForUpdate: () =>
    ipcRenderer.invoke('app:check-update') as Promise<{ success: boolean; error?: string }>,

  downloadUpdate: () =>
    ipcRenderer.invoke('app:download-update') as Promise<{ success: boolean; error?: string }>,

  installUpdate: () =>
    ipcRenderer.invoke('app:install-update') as Promise<{ success: boolean; error?: string }>,

  onUpdateChecking: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on('update:checking', h);
    return () => ipcRenderer.removeListener('update:checking', h);
  },

  onUpdateAvailable: (cb: (info: { version: string; releaseDate: string }) => void) => {
    const h = (_e: Electron.IpcRendererEvent, info: { version: string; releaseDate: string }) =>
      cb(info);
    ipcRenderer.on('update:available', h);
    return () => ipcRenderer.removeListener('update:available', h);
  },

  onUpdateNotAvailable: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on('update:not-available', h);
    return () => ipcRenderer.removeListener('update:not-available', h);
  },

  onUpdateProgress: (
    cb: (p: {
      percent: number;
      bytesPerSecond: number;
      transferred: number;
      total: number;
    }) => void,
  ) => {
    const h = (
      _e: Electron.IpcRendererEvent,
      p: { percent: number; bytesPerSecond: number; transferred: number; total: number },
    ) => cb(p);
    ipcRenderer.on('update:progress', h);
    return () => ipcRenderer.removeListener('update:progress', h);
  },

  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    const h = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info);
    ipcRenderer.on('update:downloaded', h);
    return () => ipcRenderer.removeListener('update:downloaded', h);
  },

  onUpdateError: (cb: (msg: string) => void) => {
    const h = (_e: Electron.IpcRendererEvent, msg: string) => cb(msg);
    ipcRenderer.on('update:error', h);
    return () => ipcRenderer.removeListener('update:error', h);
  },

  savePdf: (payload: { html: string; defaultFileName?: string }) =>
    ipcRenderer.invoke('app:save-pdf', payload) as Promise<{
      success: boolean;
      filePath?: string;
      canceled?: boolean;
      error?: string;
    }>,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
