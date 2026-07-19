// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

// ── App Settings ──────────────────────────────────────────────────────────────
export interface AppSettings {
  apiBaseUrl: string;
  apiToken: string | null;
  lockTimeoutMinutes: number;
  theme: 'dark' | 'light';
}

export type AppUserRole = 'admin' | 'operator';

export interface User {
  id: number;
  username: string;
  name: string;
  role: AppUserRole;
  status: 'active' | 'inactive';
  last_activity?: string;
}

export interface Session {
  id: string;
  user_id: number;
}

// ── Navigation Tabs ───────────────────────────────────────────────────────────
export type Tab =
  | 'dashboard'
  | 'notifications'
  | 'activity-logs'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'stock-movements'
  | 'stock-transfers'
  | 'item-returns'
  | 'orders'
  | 'invoices'
  | 'customers'
  | 'purchase-orders'
  | 'purchase-items'
  | 'suppliers'
  | 'bills'
  | 'stores'
  | 'payment-transactions'
  | 'expenses'
  | 'reports'
  | 'report-generation-logs'
  | 'users'
  | 'roles'
  | 'user-roles'
  | 'organizations'
  | 'platform-configurations'
  | 'vehicles'
  | 'settings'
  | 'payments';

// ── Entities ──────────────────────────────────────────────────────────────────

// ── snake_case fields match actual API response field names ────────────────────

export interface Organization {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  name: string;
  code?: string;
  address?: string;
  organization_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  unit?: string;
  unit_price?: number;
  sku?: string;
  barcode?: string;
  category_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  product_id?: string;
  store_id?: string;
  quantity?: number;
  min_quantity?: number;
  unit?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id?: string;
  store_id?: string;
  total_amount?: number;
  status?: string;
  ordered_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bill {
  id: string;
  purchase_order_id?: string;
  amount?: number;
  due_date?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentTransaction {
  id: string;
  reference?: string;
  type?: string;
  amount?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  created_at?: string;
}

export interface ItemReturn {
  id: string;
  return_number?: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReportGenerationLog {
  id: string;
  report_type?: string;
  status?: string;
  created_at?: string;
}

export interface StockMovement {
  id: string;
  type?: string;
  product_id?: string;
  quantity?: number;
  created_at?: string;
}

export interface StockTransfer {
  id: string;
  from_store_id?: string;
  to_store_id?: string;
  status?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number?: string;
  customer_id?: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  customer_id?: string;
  status?: string;
  total_amount?: number;
  due_date?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  description?: string;
  amount?: number;
  category?: string;
  status?: string;
  created_at?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_order_id?: string;
  product_id?: string;
  quantity?: number;
  unit_price?: number;
  created_at?: string;
}

export interface ActivityLog {
  id: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  created_at?: string;
}

export interface Role {
  id: string;
  name?: string;
  description?: string;
  created_at?: string;
}

export interface UserRole {
  id: string;
  user_id?: string;
  role_id?: string;
  created_at?: string;
}

export interface PlatformConfiguration {
  id: string;
  key?: string;
  value?: string;
  description?: string;
  updated_at?: string;
}

// ── Fleet / Vehicles ──────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  registration_number: string;
  vin?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  status?: 'In Transit' | 'Available' | 'Maintenance' | 'Out of Service';
  fuel_level?: number;         // percent 0-100
  tire_psi?: number;
  engine_temp?: number;        // °F
  current_speed?: number;      // MPH
  load_weight?: number;        // tons
  current_location?: string;
  driver_name?: string;
  driver_cdl?: string;
  driver_experience?: string;
  last_service_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  date: string;
  service_type: string;
  provider: string;
  cost: number;
  status: 'Completed' | 'Scheduled' | 'In Progress';
}
