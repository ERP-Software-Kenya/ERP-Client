import {
  Activity,
  ArrowLeftRight,
  ArrowUpCircle,
  Banknote,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Building,
  Building2,
  CalendarX,
  Car,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  EyeOff,
  FileText,
  FolderTree,
  Fuel,
  Hash,
  History,
  LayoutDashboard,
  Loader2,
  Lock,
  MapPin,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Percent,
  Plug,
  Printer,
  Receipt,
  RotateCcw,
  Route,
  Ruler,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  Tags,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Users2,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon
} from 'lucide-react';

export interface ModuleItem {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
  /** No page/API wired up yet — rendered in the sidebar but not clickable. */
  disabled?: boolean;
  /** Hidden from store_manager / store_staff — only org_admin and super_admin see these. */
  adminOnly?: boolean;
}

export interface ModuleGroup {
  label: string;
  icon: LucideIcon;
  items: ModuleItem[];
  /** If true, the whole group is hidden for non-admin roles. */
  adminOnly?: boolean;
}


export const MODULES: ModuleGroup[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { key: 'dashboard', title: 'Main Dashboard', path: '/', icon: LayoutDashboard },
      { key: 'dashboard-sales', title: 'Sales', path: '/dashboard/sales', icon: TrendingUp },
      { key: 'dashboard-purchase', title: 'Purchase', path: '/dashboard/purchase', icon: ShoppingCart },
      { key: 'dashboard-inventory', title: 'Inventory', path: '/dashboard/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Sales',
    icon: ShoppingBag,
    items: [
      { key: 'pos', title: 'POS / Billing', path: '/pos', icon: ScanLine },
      { key: 'customers', title: 'Customers', path: '/customers', icon: Users2 },
      // { key: 'quotations', title: 'Quotations', path: '/sales/quotations', icon: FileText, disabled: true },
      { key: 'orders', title: 'Sales Orders', path: '/orders', icon: ClipboardList },
      // { key: 'dispatch', title: 'Dispatch', path: '/sales/dispatch', icon: Truck, disabled: true },
      // { key: 'invoices', title: 'Invoices', path: '/invoices', icon: Receipt },
      // { key: 'sales-returns', title: 'Returns', path: '/item-returns', icon: RotateCcw },
      // { key: 'payments-received', title: 'Payments Received', path: '/payment-transactions', icon: CreditCard },
    ],
  },
  {
    label: 'Purchase',
    icon: ShoppingCart,
    items: [
      { key: 'suppliers', title: 'Suppliers', path: '/suppliers', icon: Building2 },
      // { key: 'rfq', title: 'RFQ / Enquiry', path: '/purchase/rfq', icon: Search, disabled: true },
      { key: 'purchase-orders', title: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList },
      // { key: 'grn', title: 'GRN', path: '/purchase/grn', icon: PackageCheck, disabled: true },
      { key: 'bills', title: 'Bills', path: '/bills', icon: FileText },
      // { key: 'purchase-returns', title: 'Returns', path: '/item-returns', icon: RotateCcw },
      // { key: 'payments-made', title: 'Payments Made', path: '/payment-transactions', icon: Banknote },
      // { key: 'purchase-items', title: 'Purchase Items', path: '/purchase-items', icon: Receipt },
    ],
  },
  {
    label: 'Inventory',
    icon: Boxes,
    items: [
      { key: 'inventory', title: 'Stock Overview', path: '/inventory', icon: BarChart2 },
      { key: 'stock-movements', title: 'Stock Ledger', path: '/stock-movements', icon: BookOpen },
      // { key: 'adjustments', title: 'Adjustments', path: '/inventory/adjustments', icon: SlidersHorizontal, disabled: true },
      { key: 'stock-transfers', title: 'Transfers', path: '/stock-transfers', icon: ArrowLeftRight },
      // { key: 'in-transit', title: 'In Transit', path: '/inventory/in-transit', icon: Loader2, disabled: true },
      // { key: 'batches', title: 'Batches / Lots', path: '/inventory/batches', icon: Tag, disabled: true },
      // { key: 'expiry', title: 'Expiry', path: '/inventory/expiry', icon: CalendarX, disabled: true },
      { key: 'unpublished-stock', title: 'Unpublished Stock', path: '/unpublished-stock', icon: EyeOff },
    ],
  },
  {
    label: 'Products',
    icon: Package,
    items: [
      { key: 'products', title: 'Product List', path: '/products', icon: Package },
      { key: 'categories', title: 'Categories', path: '/categories', icon: FolderTree },
      { key: 'product-logs', title: 'Product Logs', path: '/product-logs', icon: History },
    ],
  },
  {
    label: 'Locations',
    icon: Warehouse,
    items: [
      { key: 'stores', title: 'Stores', path: '/stores', icon: Store },
      { key: 'warehouses', title: 'Warehouses', path: '/warehouse', icon: Building },
      // { key: 'warehouse-grn', title: 'GRN', path: '/warehouse/grn', icon: PackagePlus, disabled: true },
      // { key: 'gin', title: 'GIN', path: '/warehouse/gin', icon: PackageMinus, disabled: true },
    ],
  },
  {
    label: 'Fleet Management',
    icon: Truck,
    items: [
      { key: 'fleet-dashboard', title: 'Fleet Dashboard', path: '/fleet', icon: LayoutDashboard },
      { key: 'fleet-vehicles', title: 'Vehicles', path: '/fleet/vehicles', icon: Car },
      { key: 'fleet-drivers', title: 'Drivers', path: '/fleet/drivers', icon: Users2 },
      { key: 'fleet-trips', title: 'Trips', path: '/fleet/trips', icon: Route },
      { key: 'fleet-maintenance', title: 'Maintenance', path: '/fleet/maintenance', icon: Wrench },
      { key: 'fleet-expenses', title: 'Vehicle Expenses', path: '/fleet/expenses', icon: Fuel },
    ],
  },
  // {
  //   label: 'Approvals',
  //   icon: CheckSquare,
  //   items: [
  //     { key: 'approvals-pending', title: 'Pending', path: '/approvals/pending', icon: Clock, disabled: true },
  //     { key: 'approvals-history', title: 'History', path: '/approvals/history', icon: History, disabled: true },
  //     { key: 'approvals-rules', title: 'Rules', path: '/approvals/rules', icon: Settings, disabled: true },
  //   ],
  // },
  // {
  //   label: 'Reports',
  //   icon: BarChart3,
  //   items: [
  //     { key: 'reports-home', title: 'Reports Home', path: '/reports', icon: BarChart3, disabled: true },
  //     { key: 'report-generation-logs', title: 'Report Generation Logs', path: '/report-generation-logs', icon: ClipboardList },
  //     { key: 'sales-summary', title: 'Sales Summary', path: '/reports/sales-summary', icon: TrendingUp, disabled: true },
  //     { key: 'purchase-summary', title: 'Purchase Summary', path: '/reports/purchase-summary', icon: ShoppingCart, disabled: true },
  //     { key: 'debtor-ageing', title: 'Debtor Ageing', path: '/reports/debtor-ageing', icon: CreditCard, disabled: true },
  //     { key: 'creditor-ageing', title: 'Creditor Ageing', path: '/reports/creditor-ageing', icon: Banknote, disabled: true },
  //     { key: 'stock-ageing', title: 'Stock Ageing', path: '/reports/stock-ageing', icon: Boxes, disabled: true },
  //     { key: 'warehouse-stock', title: 'Warehouse Stock', path: '/reports/warehouse-stock', icon: Warehouse, disabled: true },
  //     { key: 'lot-stock', title: 'Lot-wise Stock', path: '/reports/lot-stock', icon: Tag, disabled: true },
  //     { key: 'sales-vs-purchase', title: 'Sales vs Purchase', path: '/reports/sales-vs-purchase', icon: BarChart2, disabled: true },
  //     { key: 'product-profit', title: 'Product Profit', path: '/reports/product-profit', icon: BarChart3, disabled: true },
  //     { key: 'tax-summary', title: 'Tax Summary', path: '/reports/tax-summary', icon: Percent, disabled: true },
  //   ],
  // },
  {
    label: 'Administration',
    icon: Users,
    adminOnly: true,
    items: [
      { key: 'users', title: 'Users', path: '/users', icon: Users, adminOnly: true },
      { key: 'roles', title: 'Roles & Permissions', path: '/roles', icon: Lock, adminOnly: true },
      { key: 'user-roles', title: 'User Roles', path: '/user-roles', icon: UserCog, adminOnly: true },
      { key: 'organizations', title: 'Organizations', path: '/organizations', icon: Building2, adminOnly: true },
      { key: 'activity-logs', title: 'Activity Logs', path: '/activity-logs', icon: Activity, adminOnly: true },
      { key: 'audit-log', title: 'Audit Log lookup', path: '/audit-log', icon: History, adminOnly: true },
      { key: 'expenses', title: 'Expenses', path: '/expenses', icon: Wallet, adminOnly: true },
      { key: 'page-access', title: 'Page Access', path: '/page-access', icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      //     { key: 'settings-general', title: 'General', path: '/platform-configurations', icon: Settings },
      { key: 'settings-app-updates', title: 'App updates', path: '/settings/app', icon: ArrowUpCircle },
      //     { key: 'settings-tax', title: 'Tax', path: '/settings/tax', icon: Percent, disabled: true },
      //     { key: 'settings-uom', title: 'Unit of Measure', path: '/settings/uom', icon: Ruler, disabled: true },
      //     { key: 'settings-pricelists', title: 'Price Lists', path: '/settings/pricelists', icon: Tags, disabled: true },
      //     { key: 'settings-currency', title: 'Currency', path: '/settings/currency', icon: DollarSign, disabled: true },
      //     { key: 'settings-sequences', title: 'Sequences', path: '/settings/sequences', icon: Hash, disabled: true },
      //     { key: 'settings-templates', title: 'Templates', path: '/settings/templates', icon: Printer, disabled: true },
      //     { key: 'settings-notifications', title: 'Notifications', path: '/notifications', icon: Bell },
      //     { key: 'settings-integrations', title: 'Integrations', path: '/settings/integrations', icon: Plug, disabled: true },
      //     { key: 'settings-backup', title: 'Backup', path: '/settings/backup', icon: Database, disabled: true },
    ],
  },
];

export const ALL_ITEMS: ModuleItem[] = MODULES.flatMap((g) => g.items);
