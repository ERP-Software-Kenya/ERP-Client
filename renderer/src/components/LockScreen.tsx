import { useState, useCallback, useEffect } from 'react';
import { Lock, Delete, LogOut } from 'lucide-react';

interface Props {
  userId: number;
  userName: string;
  onUnlock(): void;
  onLogout(): void;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export function LockScreen({ userId, userName, onUnlock, onLogout }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleKey = useCallback(
    async (key: string) => {
      if (key === '⌫') {
        setPin((p) => p.slice(0, -1));
        return;
      }
      const next = pin + key;
      setPin(next);

      if (next.length >= 4) {
        const result = await window.electronAPI.verifyPin(userId, next);
        if (result.success && result.valid) {
          onUnlock();
        } else {
          setError(true);
          setShake(true);
          setTimeout(() => {
            setPin('');
            setError(false);
            setShake(false);
          }, 700);
        }
      }
    },
    [pin, userId, onUnlock],
  );

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') void handleKey(e.key);
      if (e.key === 'Backspace') void handleKey('⌫');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(30,58,138,0.4) 0%, transparent 65%), var(--surface-0)',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          textAlign: 'center',
          padding: '2rem',
          transform: shake ? 'translateX(0)' : undefined,
          animation: shake ? 'shake 0.5s ease' : undefined,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
          }}
        >
          <Lock size={32} color="#fff" />
        </div>

        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{userName}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          Enter your PIN to unlock
        </p>

        {/* PIN dots */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`pin-dot ${i < pin.length ? 'filled' : ''}`}
              style={error ? { borderColor: '#ef4444', background: '#ef4444' } : undefined}
            />
          ))}
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Incorrect PIN
          </p>
        )}

        {/* Keypad */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 72px)',
            gap: '0.875rem',
            justifyContent: 'center',
          }}
        >
          {KEYS.map((k, i) =>
            k === '' ? (
              <div key={i} />
            ) : (
              <button
                key={k + i}
                className="pin-key"
                onClick={() => void handleKey(k)}
              >
                {k === '⌫' ? <Delete size={20} /> : k}
              </button>
            ),
          )}
        </div>

        <button
          onClick={onLogout}
          className="btn btn-ghost"
          style={{ marginTop: '2.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          <LogOut size={15} />
          Sign out instead
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-8px); }
          80%      { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
