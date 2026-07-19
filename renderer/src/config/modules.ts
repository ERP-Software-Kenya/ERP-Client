import {
  Activity,
  ArrowRightLeft,
  Bell,
  Boxes,
  Building,
  Building2,
  ChartColumn,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  PackageMinus,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  Car,
  type LucideIcon
} from 'lucide-react';

export interface ModuleItem {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
}

export interface ModuleGroup {
  label: string;
  items: ModuleItem[];
}

export const MODULES: ModuleGroup[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', title: 'Dashboard', path: '/', icon: LayoutDashboard },
      { key: 'notifications', title: 'Notifications', path: '/notifications', icon: Bell },
      { key: 'activity-logs', title: 'Activity Logs', path: '/activity-logs', icon: Activity },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { key: 'products', title: 'Products', path: '/products', icon: Package },
      { key: 'categories', title: 'Categories', path: '/categories', icon: Tags },
      { key: 'inventory', title: 'Inventory', path: '/inventory', icon: Boxes },
      { key: 'stock-movements', title: 'Stock Movements', path: '/stock-movements', icon: ArrowRightLeft },
      { key: 'stock-transfers', title: 'Stock Transfers', path: '/stock-transfers', icon: Truck },
      { key: 'item-returns', title: 'Item Returns', path: '/item-returns', icon: PackageMinus },
    ],
  },
  {
    label: 'Sales',
    items: [
      { key: 'orders', title: 'Orders', path: '/orders', icon: ShoppingCart },
      { key: 'invoices', title: 'Invoices', path: '/invoices', icon: FileText },
      { key: 'customers', title: 'Customers', path: '/customers', icon: Users },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { key: 'purchase-orders', title: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList },
      { key: 'purchase-items', title: 'Purchase Items', path: '/purchase-items', icon: Receipt },
      { key: 'suppliers', title: 'Suppliers', path: '/suppliers', icon: Building2 },
      { key: 'bills', title: 'Bills', path: '/bills', icon: Receipt },
    ],
  },
  {
    label: 'Warehouse',
    items: [
      { key: 'stores', title: 'Stores / Warehouses', path: '/stores', icon: Warehouse },
    ],
  },
  {
    label: 'Finance',
    items: [
      { key: 'payment-transactions', title: 'Payment Transactions', path: '/payment-transactions', icon: CreditCard },
      { key: 'expenses', title: 'Expenses', path: '/expenses', icon: Wallet },
    ],
  },
  {
    label: 'Reports',
    items: [
      { key: 'reports', title: 'Reports', path: '/reports', icon: ChartColumn },
      { key: 'report-generation-logs', title: 'Report Logs', path: '/report-generation-logs', icon: ClipboardList },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { key: 'vehicles', title: 'Vehicles', path: '/vehicles', icon: Car },
    ],
  },
  {
    label: 'Admin',
    items: [
      { key: 'users', title: 'Users', path: '/users', icon: UsersRound },
      { key: 'roles', title: 'Roles', path: '/roles', icon: ShieldCheck },
      { key: 'user-roles', title: 'User Roles', path: '/user-roles', icon: UserCog },
      { key: 'organizations', title: 'Organizations', path: '/organizations', icon: Building },
      { key: 'platform-configurations', title: 'Platform Config', path: '/platform-configurations', icon: Settings },
    ],
  },
];

export const ALL_ITEMS: ModuleItem[] = MODULES.flatMap((g) => g.items);
