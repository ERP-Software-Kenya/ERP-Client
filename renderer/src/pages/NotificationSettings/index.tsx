import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, XCircle, AlertCircle, Webhook } from 'lucide-react';
import { SettingSection } from '../../components/SettingSection';
import { Button } from '../../components/ui/button';
import { useSession } from '../../context/SessionContext';
import { EmailNotificationsSection } from './EmailNotificationsSection';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function getPermission(): PermissionState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

function PermissionBadge({ status }: { status: PermissionState }) {
  if (status === 'granted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-500">
        <CheckCircle2 size={15} /> Allowed
      </span>
    );
  }
  if (status === 'denied') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <XCircle size={15} /> Blocked
      </span>
    );
  }
  if (status === 'unsupported') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <AlertCircle size={15} /> Not supported
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-500">
      <AlertCircle size={15} /> Not yet allowed
    </span>
  );
}

const TRIGGERS = [
  'New orders placed or status changes',
  'Low stock or stock movement alerts',
  'System-generated events sent to your account',
  'Organisation-wide broadcasts',
];

export default function NotificationSettingsPage() {
  const { isOrgAdmin } = useSession();
  const [permission, setPermission] = useState<PermissionState>(getPermission);
  const [requesting, setRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermission(getPermission());
  }, []);

  const requestPermission = async (): Promise<void> => {
    if (!('Notification' in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
    } finally {
      setRequesting(false);
    }
  };

  const sendTestNotification = (): void => {
    if (permission !== 'granted') return;
    new Notification('ERP — Test notification', {
      body: 'Desktop notifications are working correctly.',
      icon: '/icon.png',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const PermissionIcon =
    permission === 'granted' ? Bell :
    permission === 'denied'  ? BellOff :
    BellRing;

  const iconColor =
    permission === 'granted' ? 'text-green-500' :
    permission === 'denied'  ? 'text-destructive' :
    'text-yellow-500';

  return (
    <div className="px-6 py-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how the ERP system delivers real-time alerts to your desktop.
        </p>
      </div>

      <div className="divide-y divide-border">
        <SettingSection
          title="Desktop notifications"
          description="OS-level pop-ups when orders, stock alerts, or system events arrive — even when the window is in the background."
        >
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current status
                </p>
                <div className="mt-1.5">
                  <PermissionBadge status={permission} />
                </div>
              </div>
              <PermissionIcon size={28} className={`${iconColor} opacity-70`} />
            </div>

            <div className="border-t border-border pt-3">
              {permission === 'default' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Grant permission so the ERP system can deliver pop-ups for incoming events.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void requestPermission()}
                    disabled={requesting}
                  >
                    {requesting ? 'Requesting…' : 'Allow desktop notifications'}
                  </Button>
                </div>
              )}

              {permission === 'granted' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Desktop notifications are active. You will receive OS-level pop-ups for
                    incoming ERP events in real time.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={sendTestNotification}
                    disabled={testSent}
                  >
                    {testSent ? 'Sent — check your desktop' : 'Send test notification'}
                  </Button>
                </div>
              )}

              {permission === 'denied' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Permission was blocked. To re-enable, click the lock icon in your browser
                    address bar → <strong>Notifications</strong> → <strong>Allow</strong>, then
                    refresh the page.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    On Windows: <strong>System Settings → System → Notifications</strong> and
                    ensure the app is allowed.
                  </p>
                </div>
              )}

              {permission === 'unsupported' && (
                <p className="text-sm text-muted-foreground">
                  The Notifications API is not available in this environment.
                </p>
              )}
            </div>
          </div>
        </SettingSection>

        <SettingSection
          title="What triggers a notification"
          description="Every event below generates a desktop pop-up and also appears in the bell icon."
        >
          <div className="rounded-lg border border-border bg-card p-4">
            <ul className="space-y-2">
              {TRIGGERS.map((trigger) => (
                <li key={trigger} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {trigger}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <Webhook size={12} />
              Delivered in real time via Centrifugo WebSocket.
            </div>
          </div>
        </SettingSection>

        <SettingSection
          title="Email notifications"
          description="Choose which events send an email to all active Organization Admins. Applies to your entire organization."
        >
          <EmailNotificationsSection isOrgAdmin={isOrgAdmin} />
        </SettingSection>
      </div>
    </div>
  );
}
