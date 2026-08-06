import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FormSection } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function AppUpdatesPage() {
  const [version, setVersion] = useState('…');
  const [githubToken, setGithubToken] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getAppVersion) {
      setLoading(false);
      setCheckMsg('Electron bridge unavailable — restart the desktop app.');
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
        toast.error(res.error ?? 'Failed to save');
        return;
      }
      if (res.settings) {
        setGithubToken(res.settings.githubToken);
        setIntervalMinutes(res.settings.updateCheckIntervalMinutes);
      }
      toast.success('Update settings saved');
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
        setCheckMsg('Check triggered — see the update banner if a new version is available.');
        toast.success('Update check started');
      } else {
        setCheckMsg(res.error ?? 'Check failed');
        toast.error(res.error ?? 'Check failed');
      }
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">App updates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Local desktop settings for private GitHub releases. Not platform (Core API) configuration.
        </p>
      </div>

      <FormSection title="Version">
        <p className="text-sm">
          Installed: <span className="font-mono font-medium">{version}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Scheduled checks run only in packaged installs. In development, Check for Updates returns
          a packaged-only message.
        </p>
      </FormSection>

      <FormSection title="GitHub access">
        <label className="block text-sm mb-1">GitHub token (optional)</label>
        <Input
          type="password"
          autoComplete="off"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          placeholder="ghp_… or github_pat_… (optional)"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Releases come from public repo{' '}
          <span className="font-mono">HitarthSM/ERP-Client</span>. A token is optional (helps with
          API rate limits). Save after changing.
        </p>

        <label className="block text-sm mb-1 mt-4">Auto-check interval (minutes)</label>
        <Input
          type="number"
          min={1}
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-40"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Default 1440 (24h). Takes effect on the next scheduled cycle after save.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleCheck()}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Check for Updates'}
          </Button>
        </div>

        {checkMsg && (
          <p className="text-xs text-muted-foreground mt-3">{checkMsg}</p>
        )}
      </FormSection>
    </div>
  );
}
