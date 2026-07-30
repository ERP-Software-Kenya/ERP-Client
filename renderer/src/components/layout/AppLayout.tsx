import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const isPos = pathname === '/pos' || pathname.startsWith('/pos/');

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div className="flex-1 flex flex-col min-w-0">
        {!isPos && <Topbar />}
        <main className={`flex-1 ${isPos ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {isPos ? (
            <Outlet />
          ) : (
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
