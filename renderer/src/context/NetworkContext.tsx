import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { checkInternetConnection } from '../lib/network';

const isOfflineSimulated = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('simulateOffline') === 'true';

interface NetworkContextValue {
  isOnline: boolean;
  isChecking: boolean;
  hasEverBeenOnline: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (isOfflineSimulated()) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [hasEverBeenOnline, setHasEverBeenOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const checkingInFlight = useRef<Promise<boolean> | null>(null);
  const wasOfflineBefore = useRef<boolean>(false);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (checkingInFlight.current) return checkingInFlight.current;

    setIsChecking(true);
    const run = (async () => {
      const connected = isOfflineSimulated() ? false : await checkInternetConnection();
      setIsOnline(connected);
      if (connected) {
        setHasEverBeenOnline(true);
        if (wasOfflineBefore.current) {
          wasOfflineBefore.current = false;
          toast.success('Internet connection restored');
        }
      } else {
        wasOfflineBefore.current = true;
      }
      return connected;
    })().finally(() => {
      setIsChecking(false);
      checkingInFlight.current = null;
    });

    checkingInFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    // Initial verification check on startup
    void checkConnection();

    const handleOnline = () => {
      void checkConnection();
    };

    const handleOffline = () => {
      wasOfflineBefore.current = true;
      setIsOnline(false);
    };

    const handleWindowFocus = () => {
      if (!isOnline) {
        void checkConnection();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('network:offline', handleOffline);
    window.addEventListener('focus', handleWindowFocus);

    // Periodic auto-check when offline so the app automatically resumes once network is back
    const interval = setInterval(() => {
      if (!isOnline) {
        void checkConnection();
      }
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('network:offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(interval);
    };
  }, [checkConnection, isOnline]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isChecking,
        hasEverBeenOnline,
        checkConnection,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkProvider');
  }
  return context;
}
