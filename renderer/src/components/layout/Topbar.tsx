import { Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 px-6 bg-card border-b border-border flex items-center justify-between sticky top-0 z-10">
      <div className="flex-1">
        {/* Search can go here */}
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-sm font-medium">{user?.name || 'Admin User'}</span>
            <span className="text-xs text-muted-foreground">{user?.email || 'admin@example.com'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors ml-2"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
