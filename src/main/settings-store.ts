import * as fs from 'fs';
import * as path from 'path';

export interface AppUpdateSettings {
  githubToken: string;
  updateCheckIntervalMinutes: number;
  lastUpdateCheckAt: number;
}

const DEFAULTS: AppUpdateSettings = {
  githubToken: '',
  updateCheckIntervalMinutes: 1440,
  lastUpdateCheckAt: 0,
};

let settingsPath = '';

export function initSettingsStore(userDataPath: string): void {
  settingsPath = path.join(userDataPath, 'app-settings.json');
}

export function loadSettings(): AppUpdateSettings {
  try {
    if (settingsPath && fs.existsSync(settingsPath)) {
      const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Partial<AppUpdateSettings>;
      return {
        githubToken: typeof raw.githubToken === 'string' ? raw.githubToken : DEFAULTS.githubToken,
        updateCheckIntervalMinutes: Math.max(
          1,
          Number(raw.updateCheckIntervalMinutes) || DEFAULTS.updateCheckIntervalMinutes,
        ),
        lastUpdateCheckAt:
          typeof raw.lastUpdateCheckAt === 'number' ? raw.lastUpdateCheckAt : DEFAULTS.lastUpdateCheckAt,
      };
    }
  } catch {
    /* ignore corrupt file */
  }
  return { ...DEFAULTS };
}

export function saveSettings(partial: Partial<AppUpdateSettings>): AppUpdateSettings {
  const next = { ...loadSettings(), ...partial };
  next.updateCheckIntervalMinutes = Math.max(1, Number(next.updateCheckIntervalMinutes) || 1);
  if (!settingsPath) {
    throw new Error('Settings store not initialized');
  }
  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
