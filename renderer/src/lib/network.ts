/**
 * Utility to verify actual internet connectivity in the desktop client.
 * Combines browser navigator status, Electron network status, and lightweight HTTP pings.
 */

export async function checkInternetConnection(timeoutMs = 3500): Promise<boolean> {
  // 1. Check browser navigator status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  // 2. Check Electron net.isOnline if running inside Electron desktop
  if (typeof window !== 'undefined' && window.electronAPI?.isOnline) {
    try {
      const electronOnline = await window.electronAPI.isOnline();
      if (!electronOnline) {
        return false;
      }
    } catch {
      // If IPC fails for some reason, continue to HTTP ping check
    }
  }

  // 3. Perform lightweight HTTP reachability check with timeout
  const pingEndpoints = [
    `https://www.google.com/generate_204?_=${Date.now()}`,
    `https://connectivitycheck.gstatic.com/generate_204?_=${Date.now()}`,
    `https://cloudflare.com/cdn-cgi/trace?_=${Date.now()}`,
  ];

  for (const url of pingEndpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      return true;
    } catch {
      // Try next endpoint in case of specific domain block
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return false;
}
