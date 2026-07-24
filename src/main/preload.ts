import { contextBridge, ipcRenderer } from 'electron';

// ── Bridge ──────────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  hasUsers: (): Promise<{ success: boolean; hasUsers?: boolean; error?: string }> =>
    ipcRenderer.invoke('auth:has-users'),
  setup: (input: { name: string; username: string; password: string; pin: string }) =>
    ipcRenderer.invoke('auth:setup', input),
  login: (username: string, password: string) =>
    ipcRenderer.invoke('auth:login', username, password),
  validateSession: (sessionId: string) =>
    ipcRenderer.invoke('auth:validate-session', sessionId),
  logout: (sessionId: string) =>
    ipcRenderer.invoke('auth:logout', sessionId),
  verifyPin: (userId: number, pin: string) =>
    ipcRenderer.invoke('auth:verify-pin', userId, pin),
  setPin: (userId: number, newPin: string) =>
    ipcRenderer.invoke('auth:set-pin', userId, newPin),
  changePassword: (userId: number, currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke('auth:change-password', userId, currentPassword, newPassword),

  // User Management
  getUsers: () =>
    ipcRenderer.invoke('users:get-all'),
  getUserById: (userId: number) =>
    ipcRenderer.invoke('users:get-by-id', userId),
  createUser: (input: { name: string; username: string; password: string; pin: string; role: string }) =>
    ipcRenderer.invoke('users:create', input),
  updateUser: (userId: number, input: { name?: string; username?: string; role?: string }) =>
    ipcRenderer.invoke('users:update', userId, input),
  deactivateUser: (userId: number) =>
    ipcRenderer.invoke('users:deactivate', userId),
  reactivateUser: (userId: number) =>
    ipcRenderer.invoke('users:reactivate', userId),
  adminResetPassword: (userId: number, newPassword: string) =>
    ipcRenderer.invoke('users:admin-reset-password', userId, newPassword),

  // Settings
  loadSettings: () =>
    ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:save', settings),

  // API Token
  getApiToken: () =>
    ipcRenderer.invoke('api:get-token'),
  setApiToken: (token: string) =>
    ipcRenderer.invoke('api:set-token', token),
  clearApiToken: () =>
    ipcRenderer.invoke('api:clear-token'),

  // Cache
  clearCache: (cacheKey?: string) =>
    ipcRenderer.invoke('cache:clear', cacheKey),
});
