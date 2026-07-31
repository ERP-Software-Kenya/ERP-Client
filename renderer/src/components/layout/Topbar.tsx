import { ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';
  const role = (user?.roles?.[0] || 'member').replace(/_/g, ' ');
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header className="h-14 px-3 bg-card border-b border-border flex items-center justify-end gap-3 sticky top-0 z-10">
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-full hover:bg-accent text-muted-foreground"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <details className="relative border-l border-border pl-3">
        <summary className="flex items-center gap-2.5 cursor-pointer list-none rounded-lg px-1.5 py-1 hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {initial}
          </span>
          <span className="hidden sm:block text-left">
            <span className="block text-sm font-medium leading-tight">{name}</span>
            <span className="block text-xs text-muted-foreground capitalize leading-tight">{role}</span>
          </span>
          <ChevronDown size={16} className="text-muted-foreground" />
        </summary>

        <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-border bg-card shadow-lg p-1 z-20">
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </details>
    </header>
  );
}
