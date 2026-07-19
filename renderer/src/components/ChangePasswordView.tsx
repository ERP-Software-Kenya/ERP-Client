import { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';

interface Props {
  userId: number;
  onDone(): void;
}

export function ChangePasswordView({ userId, onDone }: Props) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    if (form.next.length < 8) { setError('New password must be at least 8 characters'); return; }
    setError(null);
    setSaving(true);
    const res = await window.electronAPI.changePassword(userId, form.current, form.next);
    setSaving(false);
    if (!res.success) { setError(res.error ?? 'Failed'); return; }
    setSuccess(true);
    setTimeout(onDone, 1500);
  };

  return (
    <div style={{ maxWidth: '420px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Change Password</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
          Update your account password
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.75rem' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#34d399' }}>
            <Key size={32} style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600 }}>Password updated successfully!</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', padding: '0.6rem 0.875rem', color: '#f87171', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}
            <div>
              <label className="erp-label">Current Password</label>
              <input className="erp-input" type="password" value={form.current} onChange={(e) => setForm(f => ({ ...f, current: e.target.value }))} required autoFocus />
            </div>
            <div>
              <label className="erp-label">New Password</label>
              <input className="erp-input" type="password" value={form.next} onChange={(e) => setForm(f => ({ ...f, next: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="erp-label">Confirm New Password</label>
              <input className="erp-input" type="password" value={form.confirm} onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin-slow" />}
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
