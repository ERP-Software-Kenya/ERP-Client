import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MODULES } from '../../config/modules';
import { cn } from '../../lib/utils';

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = MODULES.find((g) => g.items.some((i) => i.path === location.pathname));
    return new Set(active ? [active.label] : MODULES.map((g) => g.label));
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  return (
    <aside className={cn("bg-card border-r border-border transition-all duration-300 flex flex-col h-full", collapsed ? 'w-16' : 'w-64')}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && <span className="font-bold text-lg text-primary whitespace-nowrap overflow-hidden">Warehouse Ops</span>}
        <button onClick={onToggle} className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
        {MODULES.map((group) => {
          const isOpen = openGroups.has(group.label);
          const isGroupActive = group.items.some((i) => i.path === location.pathname);

          return (
            <div key={group.label} className="px-3">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
                    isGroupActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{group.label}</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {(collapsed || isOpen) && (
                <nav className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.key}
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                            isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            collapsed && "justify-center px-0"
                          )
                        }
                        title={collapsed ? item.title : undefined}
                      >
                        <Icon size={18} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
