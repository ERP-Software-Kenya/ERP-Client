/**
 * Core ERP API Client
 *
 * Base URL and token are read from settings at runtime.
 * The API at https://core-apis-m03n.onrender.com is publicly accessible
 * for read operations on: organizations, categories, stores, and inventory.
 * Other endpoints require a Bearer token configured in Settings.
 *
 * Paginated response shape: { items, page, perPage, totalCount, totalPages }
 */

import type { PaginatedResponse } from './types';

// ── Configuration ─────────────────────────────────────────────────────────────

let _baseUrl = 'https://core-apis-m03n.onrender.com';
let _token: string | null = null;

/** Call this after loading settings to update the API client at runtime. */
export function configureApi(baseUrl: string, token: string | null): void {
  _baseUrl = baseUrl.replace(/\/$/, ''); // strip trailing slash
  _token = token ?? null;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${_baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const resp = await fetch(buildUrl(path, params), { headers: headers() });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} — ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

// ── Search params ─────────────────────────────────────────────────────────────

interface SearchParams {
  page?: number;
  limit?: number;
  search?: string;
}

function toQuery(p?: SearchParams): QueryParams {
  return {
    $page: p?.page ?? 1,
    $perPage: p?.limit ?? 15,
    ...(p?.search ? { name: p.search } : {}),
  };
}

// ── Normalise response ─────────────────────────────────────────────────────────
// The app's ERPDataTable expects either:
//   - An array                         → for .list() calls
//   - { data, total } or { items, totalCount } → for .search() calls
//
// We normalise everything so ERPDataTable can handle it generically.

function normalisePaginated<T>(raw: PaginatedResponse<T> | T[]): { data: T[]; total: number } {
  if (Array.isArray(raw)) return { data: raw, total: raw.length };
  return { data: raw.items ?? [], total: raw.totalCount ?? 0 };
}

// ── Resource factories ────────────────────────────────────────────────────────

function makeResource<T extends { id: string }>(basePath: string) {
  return {
    /** Paginated search — returns { data, total } */
    async search(params?: SearchParams | Record<string, string>): Promise<{ data: T[]; total: number }> {
      const raw = await get<PaginatedResponse<T> | T[]>(basePath, toQuery(params as SearchParams));
      return normalisePaginated(raw);
    },

    /** Flat list — returns T[] (uses the /list endpoint if available) */
    async list(): Promise<T[]> {
      try {
        const raw = await get<T[]>(`${basePath}/list`);
        return Array.isArray(raw) ? raw : [];
      } catch {
        // Fallback: try the paginated endpoint and grab items
        const paged = await get<PaginatedResponse<T> | T[]>(basePath, { $perPage: 100 });
        if (Array.isArray(paged)) return paged;
        return paged.items ?? [];
      }
    },

    /** Get a single record by ID */
    async getById(id: string): Promise<T> {
      return await get<T>(`${basePath}/${id}`);
    },
  };
}

// ── Exported resource clients ─────────────────────────────────────────────────

import type {
  Organization,
  Store,
  Category,
  Product,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  Bill,
  PaymentTransaction,
  Notification,
  ItemReturn,
  ReportGenerationLog,
  StockMovement,
  StockTransfer,
  Order,
  Invoice,
  Customer,
  Expense,
  PurchaseItem,
  ActivityLog,
  Role,
  UserRole,
  PlatformConfiguration,
  Vehicle,
} from './types';

export const Organizations      = makeResource<Organization>('/api/v1/organizations');
export const Stores             = makeResource<Store>('/api/v1/stores');
export const Categories         = makeResource<Category>('/api/v1/categories');
export const Products           = makeResource<Product>('/api/v1/products');
export const Inventory          = makeResource<InventoryItem>('/api/v1/inventory');
export const Suppliers          = makeResource<Supplier>('/api/v1/suppliers');
export const PurchaseOrders     = makeResource<PurchaseOrder>('/api/v1/purchase-orders');
export const Bills              = makeResource<Bill>('/api/v1/bills');
export const PaymentTransactions = makeResource<PaymentTransaction>('/api/v1/payment-transactions');
export const Notifications      = makeResource<Notification>('/api/v1/notifications');
export const ItemReturns        = makeResource<ItemReturn>('/api/v1/item-returns');
export const ReportGenerationLogs = makeResource<ReportGenerationLog>('/api/v1/report-generation-logs');
export const StockMovements     = makeResource<StockMovement>('/api/v1/stock-movements');
export const StockTransfers     = makeResource<StockTransfer>('/api/v1/stock-transfers');
export const Orders             = makeResource<Order>('/api/v1/orders');
export const Invoices           = makeResource<Invoice>('/api/v1/invoices');
export const Customers          = makeResource<Customer>('/api/v1/customers');
export const Expenses           = makeResource<Expense>('/api/v1/expenses');
export const PurchaseItems      = makeResource<PurchaseItem>('/api/v1/purchase-items');
export const ActivityLogs       = makeResource<ActivityLog>('/api/v1/activity-logs');
export const Roles              = makeResource<Role>('/api/v1/roles');
export const UserRoles          = makeResource<UserRole>('/api/v1/user-roles');
export const PlatformConfigurations = makeResource<PlatformConfiguration>('/api/v1/platform-configurations');
export const Vehicles           = makeResource<Vehicle>('/api/v1/vehicles');
