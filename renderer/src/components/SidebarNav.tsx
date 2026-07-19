import {
  LayoutDashboard,
  Building2,
  Store,
  Package,
  Tag,
  Boxes,
  Truck,
  ShoppingCart,
  Receipt,
  FileText,
  CreditCard,
  Bell,
  Activity,
  Users,
  Settings,
  ChevronRight,
} from 'lucide-react';
import type { Tab, AppUserRole } from '../types';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',       label: 'Dashboard',        icon: <LayoutDashboard size={18} />, group: 'Overview' },
  { id: 'organizations',   label: 'Organizations',    icon: <Building2 size={18} />,       group: 'Master Data' },
  { id: 'stores',          label: 'Stores',           icon: <Store size={18} />,           group: 'Master Data' },
  { id: 'products',        label: 'Products',         icon: <Package size={18} />,         group: 'Master Data' },
  { id: 'categories',      label: 'Categories',       icon: <Tag size={18} />,             group: 'Master Data' },
  { id: 'inventory',       label: 'Inventory',        icon: <Boxes size={18} />,           group: 'Operations' },
  { id: 'suppliers',       label: 'Suppliers',        icon: <Truck size={18} />,           group: 'Operations' },
  { id: 'purchase-orders', label: 'Purchase Orders',  icon: <ShoppingCart size={18} />,    group: 'Operations' },
  { id: 'bills',           label: 'Bills',            icon: <Receipt size={18} />,         group: 'Finance' },
  { id: 'invoices',        label: 'Invoices',         icon: <FileText size={18} />,        group: 'Finance' },
  { id: 'payments',        label: 'Payments',         icon: <CreditCard size={18} />,      group: 'Finance' },
  { id: 'notifications',   label: 'Notifications',    icon: <Bell size={18} />,            group: 'System' },
  { id: 'activity-logs',   label: 'Activity Logs',    icon: <Activity size={18} />,        group: 'System', adminOnly: true },
  { id: 'users',           label: 'Users',            icon: <Users size={18} />,           group: 'System', adminOnly: true },
  { id: 'settings',        label: 'Settings',         icon: <Settings size={18} />,        group: 'System', adminOnly: true },
];

interface Props {
  activeTab: Tab;
  userRole: AppUserRole;
  onSelect(tab: Tab): void;
}

export function SidebarNav({ activeTab, userRole, onSelect }: Props) {
  const isAdmin = userRole === 'admin';
  const visible = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const groups = Array.from(new Set(visible.map((i) => i.group)));

  return (
    <nav
      style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--surface-2)',
        padding: '1rem 0.75rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      {groups.map((group) => (
        <div key={group} style={{ marginBottom: '0.75rem' }}>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              padding: '0.25rem 0.875rem',
              marginBottom: '0.25rem',
            }}
          >
            {group}
          </p>
          {visible
            .filter((i) => i.group === group)
            .map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {activeTab === item.id && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
              </button>
            ))}
        </div>
      ))}
    </nav>
  );
}
