import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { NetworkStatusGate } from './NetworkStatusGate';
import * as NetworkContextModule from '../context/NetworkContext';

describe('NetworkStatusGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders cold-boot offline screen and suppresses children when opening offline', () => {
    vi.spyOn(NetworkContextModule, 'useNetworkStatus').mockReturnValue({
      isOnline: false,
      isChecking: false,
      hasEverBeenOnline: false,
      checkConnection: vi.fn().mockResolvedValue(false),
    });

    const html = renderToString(
      <NetworkStatusGate>
        <div id="protected-app">Protected App Content</div>
      </NetworkStatusGate>,
    );

    // 1. Should display required alert header in English
    expect(html).toContain('Software Requires Internet Connection');

    // 2. Should display retry button
    expect(html).toContain('Retry Connection');

    // 3. Should display troubleshooting advice
    expect(html).toContain('Troubleshooting Tips');

    // 4. Must NOT render children (protects Clerk/Auth on cold boot)
    expect(html).not.toContain('Protected App Content');
  });

  it('renders normal children and no alert when online', () => {
    vi.spyOn(NetworkContextModule, 'useNetworkStatus').mockReturnValue({
      isOnline: true,
      isChecking: false,
      hasEverBeenOnline: true,
      checkConnection: vi.fn().mockResolvedValue(true),
    });

    const html = renderToString(
      <NetworkStatusGate>
        <div id="protected-app">Protected App Content</div>
      </NetworkStatusGate>,
    );

    // Children are rendered
    expect(html).toContain('Protected App Content');

    // Offline alert is not rendered
    expect(html).not.toContain('Software Requires Internet Connection');
    expect(html).not.toContain('Retry Connection');
  });

  it('renders children AND overlay alert when connection drops during runtime', () => {
    vi.spyOn(NetworkContextModule, 'useNetworkStatus').mockReturnValue({
      isOnline: false,
      isChecking: false,
      hasEverBeenOnline: true,
      checkConnection: vi.fn().mockResolvedValue(false),
    });

    const html = renderToString(
      <NetworkStatusGate>
        <div id="protected-app">Protected App Content</div>
      </NetworkStatusGate>,
    );

    // 1. Children MUST stay rendered so user does not lose current progress
    expect(html).toContain('Protected App Content');

    // 2. Modal overlay alert is displayed
    expect(html).toContain('Software Requires Internet Connection');
    expect(html).toContain('Retry Now');
    expect(html).toContain('Reconnecting automatically when internet returns');
  });
});
