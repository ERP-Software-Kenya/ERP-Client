import { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, RefreshCw, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { SettingSection } from '../../components/SettingSection';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function AppUpdatesPage() {
  const [version, setVersion] = useState('…');
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getAppVersion) {
      setLoading(false);
      setCheckMsg('Restart the desktop app and try again.');
      return;
    }
    void (async () => {
      try {
        const [v, s] = await Promise.all([api.getAppVersion(), api.getUpdateSettings()]);
        setVersion(v);
        setGithubToken(s.githubToken ?? '');
        setIntervalMinutes(s.updateCheckIntervalMinutes ?? 1440);
      } catch (e) {
        setCheckMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setCheckMsg(null);
    try {
      const res = await window.electronAPI.saveUpdateSettings({
        githubToken,
        updateCheckIntervalMinutes: Math.max(1, intervalMinutes),
      });
      if (!res.success) {
        toast.error(res.error ?? "Couldn't save settings");
        return;
      }
      if (res.settings) {
        setGithubToken(res.settings.githubToken);
        setIntervalMinutes(res.settings.updateCheckIntervalMinutes);
      }
      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      const res = await window.electronAPI.checkForUpdate();
      if (res.success) {
        setCheckMsg("If an update is available, you'll see a banner.");
        toast.success('Looking for updates…');
      } else {
        setCheckMsg(res.error ?? 'Check failed');
        toast.error(res.error ?? 'Check failed');
      }
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold">Software updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check for new versions of this app and choose how often to look for them.
        </p>
      </div>

      <div className="divide-y divide-border">
        <SettingSection
          title="Current version"
          description="The build installed on this machine."
        >
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag size={14} />
                Version
              </div>
              <span className="font-mono text-sm font-semibold">{version}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Automatic checks run when the installed app is running.
            </p>
          </div>
        </SettingSection>

        <SettingSection
          title="Update schedule"
          description="How often the app silently checks for new releases in the background."
        >
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Check for updates every (minutes)
              </label>
              <Input
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={(e) =>
                  setIntervalMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-40"
              />
              <p className="text-xs text-muted-foreground">
                1440 = once a day. Changes apply after you save.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleCheck()}
                disabled={checking}
              >
                <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Checking…' : 'Check now'}
              </Button>
            </div>

            {checkMsg && (
              <p className="text-xs text-muted-foreground">{checkMsg}</p>
            )}

            <div className="space-y-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                aria-expanded={advancedOpen}
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform ${advancedOpen ? 'rotate-0' : '-rotate-90'}`}
                />
                Advanced options
              </button>

              {advancedOpen && (
                <div className="space-y-1.5 pl-1">
                  <label className="block text-sm font-medium">Access key</label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      autoComplete="off"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="Leave blank unless your IT team provided a key"
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      aria-label={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usually not needed. Only add a key if your IT team asked you to. Then save.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SettingSection>
      </div>
    </div>
  );
}
