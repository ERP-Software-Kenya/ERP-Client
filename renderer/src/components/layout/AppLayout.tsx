import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { UpdateBanner } from '../UpdateBanner';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isPos = /\/pos\/?$/.test(location.pathname);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div className="flex-1 flex flex-col min-w-0">
        <UpdateBanner />
        <Topbar />
        <main className="flex-1 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
          <div className={isPos ? 'h-full w-full' : 'w-full px-3 py-3'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
