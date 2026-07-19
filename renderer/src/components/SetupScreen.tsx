import { useState } from 'react';
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react';


interface Props {
  onComplete(sessionId: string, user: { id: number; username: string; name: string; role: 'admin' | 'operator' }): void;
}

export function SetupScreen({ onComplete }: Props) {
  const [form, setForm] = useState({ name: '', username: '', password: '', confirmPassword: '', pin: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.pin.length < 4 || !/^\d+$/.test(form.pin)) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.setup({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        pin: form.pin,
      });
      if (!result.success || !result.session || !result.user) {
        setError(result.error ?? 'Setup failed');
        return;
      }
      onComplete(result.session.id, result.user as { id: number; username: string; name: string; role: 'admin' | 'operator' });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(30,58,138,0.35) 0%, transparent 60%), var(--surface-0)',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
            }}
          >
            <Building2 size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            <span className="gradient-text">Core ERP Client</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.4rem' }}>
            Create your administrator account to get started
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Initial Setup
          </h2>

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="erp-label">Full Name</label>
              <input
                className="erp-input"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={set('name')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="erp-label">Username</label>
              <input
                className="erp-input"
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={set('username')}
                required
              />
            </div>

            <div>
              <label className="erp-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="erp-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
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
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="erp-label">Confirm Password</label>
              <input
                className="erp-input"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                required
              />
            </div>

            <div>
              <label className="erp-label">Quick-Unlock PIN (4+ digits)</label>
              <input
                className="erp-input mono"
                type="password"
                inputMode="numeric"
                placeholder="e.g. 1234"
                value={form.pin}
                onChange={set('pin')}
                maxLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '0.5rem', padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin-slow" /> : null}
              {loading ? 'Creating Account…' : 'Create Account & Launch'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
