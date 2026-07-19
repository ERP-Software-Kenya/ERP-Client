import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Wifi, Database, Clock } from 'lucide-react';
import type { AppSettings } from '../types';
import { configureApi } from '../api';

interface Props {
  onSettingsChange?(settings: AppSettings): void;
}

export function SettingsView({ onSettingsChange }: Props) {
  const [settings, setSettings] = useState<AppSettings>({
    apiBaseUrl: 'https://core-apis-m03n.onrender.com',
    apiToken: null,
    lockTimeoutMinutes: 5,
    theme: 'dark',
  });
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.loadSettings().then((res: any) => {
      if (res.success && res.settings) setSettings(res.settings);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await window.electronAPI.saveSettings(settings);
    if (settings.apiToken) await window.electronAPI.setApiToken(settings.apiToken);
    // Reconfigure the in-memory API client
    configureApi(settings.apiBaseUrl, settings.apiToken);
    setSaving(false);
    setSaved(true);
    onSettingsChange?.(settings);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${settings.apiBaseUrl}/api/v1/organizations/list`, {
        headers: settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {},
      });
      if (res.ok) {
        setTestResult({ ok: true, msg: `Connected — HTTP ${res.status}` });
      } else {
        setTestResult({ ok: false, msg: `HTTP ${res.status} — check URL and token` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `Connection failed: ${String(e)}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Configure API connection and application behaviour
        </p>
      </div>

      <form onSubmit={(e) => void handleSave(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* API Config */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Wifi size={16} style={{ color: 'var(--brand-400)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>API Connection</h3>
          </div>

          <div>
            <label className="erp-label">API Base URL</label>
            <input
              className="erp-input mono"
              type="url"
              value={settings.apiBaseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, apiBaseUrl: e.target.value }))}
              required
              placeholder="https://core-apis-m03n.onrender.com"
            />
          </div>

          <div>
            <label className="erp-label">Bearer Token</label>
            <div style={{ position: 'relative' }}>
              <input
                className="erp-input mono"
                type={showToken ? 'text' : 'password'}
                value={settings.apiToken ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, apiToken: e.target.value || null }))}
                placeholder="Paste your API token here"
                style={{ paddingRight: '2.75rem', fontSize: '0.8rem' }}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                }}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleTestConnection()}
              disabled={testing}
            >
              {testing ? <Loader2 size={13} className="animate-spin-slow" /> : <Wifi size={13} />}
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            {testResult && (
              <span
                style={{
                  fontSize: '0.82rem',
                  color: testResult.ok ? '#34d399' : '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </span>
            )}
          </div>
        </div>

        {/* App Config */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Clock size={16} style={{ color: 'var(--brand-400)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Application</h3>
          </div>

          <div>
            <label className="erp-label">Inactivity Lock Timeout</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                className="erp-input"
                type="number"
                min="1"
                max="60"
                value={settings.lockTimeoutMinutes}
                onChange={(e) => setSettings((s) => ({ ...s, lockTimeoutMinutes: parseInt(e.target.value, 10) }))}
                style={{ width: '100px' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>minutes</span>
            </div>
          </div>

          <div>
            <label className="erp-label">Theme</label>
            <select
              className="erp-input"
              value={settings.theme}
              onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as 'dark' | 'light' }))}
              style={{ width: '180px' }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

        {/* DB Info */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Database size={16} style={{ color: 'var(--brand-400)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Local Database</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            SQLite (WAL mode) — stored at{' '}
            <code className="mono" style={{ background: 'var(--surface-2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.78rem' }}>
              %APPDATA%\Core ERP Client\core-erp.db
            </code>
          </p>
        </div>

        {/* Save */}
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', padding: '0.65rem 1.5rem' }}>
          {saving ? <Loader2 size={15} className="animate-spin-slow" /> : <Save size={15} />}
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
