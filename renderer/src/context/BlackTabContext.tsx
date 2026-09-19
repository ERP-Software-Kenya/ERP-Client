import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type BlackTabContextType = {
  isUnlocked: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
};

const BlackTabContext = createContext<BlackTabContextType | null>(null);

const BLACK_ROUTES = [
  '/unpublished-stock',
  '/black-ledger',
  '/approvals/black-ledger',
  '/black-stock',
  '/pos/black-sale',
];

export function BlackTabProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(isUnlocked));
  }, [isUnlocked]);

  const unlock = (pin: string) => {
    const configuredPin = (import.meta.env.VITE_BLACK_TAB_PIN || '').trim();
    // If a PIN is configured in .env, ONLY that exact PIN is allowed!
    // Fallback to '1234' only if VITE_BLACK_TAB_PIN is completely empty or not set.
    const isValid = configuredPin ? pin.trim() === configuredPin : pin.trim() === '1234';

    if (isValid) {
      setIsUnlocked(true);
      toast.success('Black features unlocked');
      return true;
    }
    toast.error('Incorrect PIN');
    return false;
  };

  const lock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(STORAGE_KEY);
    // If currently on any black-restricted screen, evacuate to Dashboard
    if (BLACK_ROUTES.some((route) => location.pathname.startsWith(route))) {
      navigate('/', { replace: true });
    }
    toast.info('Black features locked');
  };

  return (
    <BlackTabContext.Provider value={{ isUnlocked, unlock, lock }}>
      {children}
    </BlackTabContext.Provider>
  );
}

export const useBlackTab = () => {
  const context = useContext(BlackTabContext);
  if (!context) throw new Error('useBlackTab must be used within a BlackTabProvider');
  return context;
};
