import { ipcMain } from 'electron';
import {
  hasUsers,
  setupUser,
  login,
  validateSession,
  logout,
  verifyPin,
  setPin,
  changePassword,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  adminResetPassword,
} from './auth';
import {
  loadSettings,
  saveSettings,
  getApiToken,
  setApiToken,
  clearApiToken,
  clearCache,
} from './settings';

type IpcResult<T = void> = { success: true } & (T extends void ? object : { data: T }) | { success: false; error: string };

function ok<T>(data?: T): IpcResult<T> {
  if (data === undefined) return { success: true } as IpcResult<T>;
  return { success: true, data } as IpcResult<T>;
}

function err(message: string): { success: false; error: string } {
  return { success: false, error: message };
}

export function setupIpcHandlers(): void {
  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:has-users', async () => {
    try {
      return { success: true, hasUsers: hasUsers() };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:setup', async (_e, input: { name: string; username: string; password: string; pin: string }) => {
    try {
      const result = setupUser(input);
      return { success: true, session: result.session, user: result.user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:login', async (_e, username: string, password: string) => {
    try {
      const result = login(username, password);
      if (!result) return err('Invalid credentials');
      return { success: true, session: result.session, user: result.user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:validate-session', async (_e, sessionId: string) => {
    try {
      const result = validateSession(sessionId);
      if (!result) return err('Session expired or invalid');
      return { success: true, session: result.session, user: result.user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:logout', async (_e, sessionId: string) => {
    try {
      logout(sessionId);
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:verify-pin', async (_e, userId: number, pin: string) => {
    try {
      const valid = verifyPin(userId, pin);
      return { success: true, valid };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:set-pin', async (_e, userId: number, newPin: string) => {
    try {
      setPin(userId, newPin);
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('auth:change-password', async (_e, userId: number, currentPassword: string, newPassword: string) => {
    try {
      const ok2 = changePassword(userId, currentPassword, newPassword);
      if (!ok2) return err('Current password is incorrect');
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  // ── User Management ───────────────────────────────────────────────────────
  ipcMain.handle('users:get-all', async () => {
    try {
      return { success: true, users: getUsers() };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('users:get-by-id', async (_e, userId: number) => {
    try {
      const user = getUserById(userId);
      if (!user) return err('User not found');
      return { success: true, user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('users:create', async (_e, input: { name: string; username: string; password: string; pin: string; role: 'admin' | 'operator' }) => {
    try {
      const user = createUser(input);
      return { success: true, user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('users:update', async (_e, userId: number, input: { name?: string; username?: string; role?: 'admin' | 'operator' }) => {
    try {
      const user = updateUser(userId, input);
      return { success: true, user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('users:deactivate', async (_e, userId: number) => {
    try {
      deactivateUser(userId);
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('users:reactivate', async (_e, userId: number) => {
    try {
      const user = reactivateUser(userId);
      return { success: true, user };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('users:admin-reset-password', async (_e, userId: number, newPassword: string) => {
    try {
      const success = adminResetPassword(userId, newPassword);
      if (!success) return err('User not found');
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('settings:load', async () => {
    try {
      return { success: true, settings: loadSettings() };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('settings:save', async (_e, settings: Parameters<typeof saveSettings>[0]) => {
    try {
      saveSettings(settings);
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  // ── API Token ─────────────────────────────────────────────────────────────
  ipcMain.handle('api:get-token', async () => {
    try {
      return { success: true, token: getApiToken() };
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('api:set-token', async (_e, token: string) => {
    try {
      setApiToken(token);
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  ipcMain.handle('api:clear-token', async () => {
    try {
      clearApiToken();
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });

  // ── Cache ─────────────────────────────────────────────────────────────────
  ipcMain.handle('cache:clear', async (_e, cacheKey?: string) => {
    try {
      clearCache(cacheKey);
      return ok();
    } catch (e) {
      return err(String(e));
    }
  });
}
