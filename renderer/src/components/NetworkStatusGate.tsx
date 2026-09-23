import React from 'react';
import { WifiOff, RefreshCw, Loader2, AlertCircle, CheckCircle2, Power } from 'lucide-react';
import { useNetworkStatus } from '../context/NetworkContext';
import { getAppName } from '../lib/branding';
import { Button } from './ui/button';

interface NetworkStatusGateProps {
  children: React.ReactNode;
}

export function NetworkStatusGate({ children }: NetworkStatusGateProps) {
  const { isOnline, isChecking, hasEverBeenOnline, checkConnection } = useNetworkStatus();
  const appName = getAppName();

  const handleRetry = () => {
    void checkConnection();
  };

  const handleQuit = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.quitApp) {
      void window.electronAPI.quitApp();
    }
  };

  // Case 1: Opened software without internet connection (Cold boot / startup)
  if (!isOnline && !hasEverBeenOnline) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6 select-none relative overflow-hidden">
        {/* Background ambient aurora glow */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 flex items-center justify-center" aria-hidden="true">
          <div className="w-[500px] h-[500px] rounded-full bg-destructive/20 blur-[100px] -translate-y-12" />
        </div>

        <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center">
          {/* App Branding */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base">
              {appName.charAt(0)}
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground/90">{appName}</span>
          </div>

          {/* Offline Illustration / Icon badge */}
          <div className="relative mb-6">
            <div className="size-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-lg shadow-destructive/5 text-destructive ring-8 ring-destructive/5">
              <WifiOff className="size-10" />
            </div>
          </div>

          {/* Required Headline */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Software Requires Internet Connection
          </h1>

          {/* Explanation */}
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 max-w-md">
            An active internet connection is required to start and use {appName}. Please check your network connection and try again.
          </p>

          {/* Connection Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 bg-destructive/10 text-destructive border border-destructive/20">
            {isChecking ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-destructive" />
                <span>Checking internet connection…</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-destructive animate-pulse" />
                <span>No Internet Connection Detected</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-8">
            <Button
              type="button"
              size="lg"
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full sm:w-auto gap-2 px-6 shadow-md hover:shadow-lg transition-all"
            >
              {isChecking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Connecting…</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  <span>Retry Connection</span>
                </>
              )}
            </Button>

            {typeof window !== 'undefined' && window.electronAPI?.quitApp && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleQuit}
                className="w-full sm:w-auto gap-2 px-5 text-muted-foreground hover:text-foreground"
              >
                <Power className="size-4" />
                <span>Exit Application</span>
              </Button>
            )}
          </div>

          {/* Troubleshooting Checklist */}
          <div className="w-full bg-card/60 backdrop-blur-sm border border-border rounded-xl p-4 text-left shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 mb-2.5">
              <AlertCircle className="size-3.5 text-muted-foreground" />
              <span>Troubleshooting Tips</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pl-5 list-disc">
              <li>Ensure your Wi-Fi is enabled or Ethernet cable is securely connected.</li>
              <li>Verify that your router has an active internet or broadband connection.</li>
              <li>The software will automatically detect and resume once internet is restored.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Live monitoring — connection lost while already using the software
  return (
    <>
      {children}

      {!isOnline && hasEverBeenOnline && (
        <div
          className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="offline-overlay-title"
          aria-describedby="offline-overlay-desc"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="mx-auto size-14 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive ring-4 ring-destructive/5">
              <WifiOff className="size-7" />
            </div>

            <div className="space-y-2">
              <h2 id="offline-overlay-title" className="text-xl font-bold tracking-tight text-foreground">
                Software Requires Internet Connection
              </h2>
              <p id="offline-overlay-desc" className="text-sm text-muted-foreground">
                Your internet connection was interrupted. Please restore your connection to continue using {appName} without data loss.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg py-2 px-3 border border-border">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Reconnecting automatically when internet returns…</span>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                type="button"
                onClick={handleRetry}
                disabled={isChecking}
                className="w-full gap-2"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Checking…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4" />
                    <span>Retry Now</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
