export {};

type UpdateSettings = {
  githubToken: string;
  updateCheckIntervalMinutes: number;
};

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getUpdateSettings: () => Promise<UpdateSettings>;
      saveUpdateSettings: (
        settings: Partial<UpdateSettings>,
      ) => Promise<{ success: boolean; settings?: UpdateSettings; error?: string }>;
      getUpdateState: () => Promise<{ status: string; version?: string; releaseDate?: string }>;
      checkForUpdate: () => Promise<{ success: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => Promise<{ success: boolean; error?: string }>;
      onUpdateChecking: (cb: () => void) => () => void;
      onUpdateAvailable: (cb: (info: { version: string; releaseDate: string }) => void) => () => void;
      onUpdateNotAvailable: (cb: () => void) => () => void;
      onUpdateProgress: (
        cb: (p: {
          percent: number;
          bytesPerSecond: number;
          transferred: number;
          total: number;
        }) => void,
      ) => () => void;
      onUpdateDownloaded: (cb: (info: { version: string }) => void) => () => void;
      onUpdateError: (cb: (msg: string) => void) => () => void;
      savePdf: (payload: {
        html: string;
        defaultFileName?: string;
      }) => Promise<{
        success: boolean;
        filePath?: string;
        canceled?: boolean;
        error?: string;
      }>;
    };
  }
}
