import { useState, useCallback, useEffect } from 'react';
import { KeyRound, Delete, CheckCircle2 } from 'lucide-react';

interface Props {
  userId: number;
  onDone(): void;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export function SetPinView({ userId, onDone }: Props) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleKey = useCallback(
    async (key: string) => {
      if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
      const next = pin + key;
      setPin(next);

      if (next.length >= 4) {
        if (step === 'enter') {
          setFirstPin(next);
          setPin('');
          setStep('confirm');
          setError(null);
        } else {
          if (next !== firstPin) {
            setError('PINs do not match — try again');
            setPin('');
            setStep('enter');
            setFirstPin('');
          } else {
            const res = await window.electronAPI.setPin(userId, next);
            if (res.success) {
              setSuccess(true);
              setTimeout(onDone, 1500);
            } else {
              setError(res.error ?? 'Failed to set PIN');
              setPin('');
            }
          }
        }
      }
    },
    [pin, step, firstPin, userId, onDone],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') void handleKey(e.key);
      if (e.key === 'Backspace') void handleKey('⌫');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  return (
    <div style={{ maxWidth: '360px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Set Lock PIN</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
          This PIN will be used to quickly unlock the screen
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        {success ? (
          <div style={{ color: '#34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={40} />
            <p style={{ fontWeight: 600, margin: 0 }}>PIN set successfully!</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <KeyRound size={28} style={{ color: 'var(--brand-400)', marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 500, margin: 0 }}>
                {step === 'enter' ? 'Enter a new PIN' : 'Confirm your PIN'}
              </p>
              {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>}
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
              ))}
            </div>

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
              {KEYS.map((k, i) =>
                k === '' ? <div key={i} /> : (
                  <button key={k + i} className="pin-key" onClick={() => void handleKey(k)}>
                    {k === '⌫' ? <Delete size={18} /> : k}
                  </button>
                ),
              )}
            </div>

            <button className="btn btn-ghost btn-sm" onClick={onDone} style={{ color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
