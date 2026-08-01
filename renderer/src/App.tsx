import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const SSOCallback = lazy(() => import('./pages/SSOCallback'));
const SSOContinue = lazy(() => import('./pages/SSOContinue'));
const CreateOrganization = lazy(() => import('./pages/CreateOrganization'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PurchaseDashboard = lazy(() => import('./pages/dashboards/PurchaseDashboard'));
const InventoryDashboard = lazy(() => import('./pages/dashboards/InventoryDashboard'));
const WarehouseDashboard = lazy(() => import('./pages/dashboards/WarehouseDashboard'));
const SalesDashboard = lazy(() => import('./pages/dashboards/SalesDashboard'));
const Products = lazy(() => import('./pages/Products'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const InventoryDetailPage = lazy(() => import('./pages/InventoryDetail'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Stores = lazy(() => import('./pages/Stores'));
const Locations = lazy(() => import('./pages/Locations'));
const Categories = lazy(() => import('./pages/Categories'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const Bills = lazy(() => import('./pages/Bills'));
const BillDetail = lazy(() => import('./pages/BillDetail'));
const PaymentTransactions = lazy(() => import('./pages/PaymentTransactions'));
const ItemReturns = lazy(() => import('./pages/ItemReturns'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ReportGenerationLogs = lazy(() => import('./pages/ReportGenerationLogs'));
const StockMovementsPage = lazy(() => import('./pages/StockMovements'));
const StockTransfersPage = lazy(() => import('./pages/StockTransfers'));
const UnpublishedStockPage = lazy(() => import('./pages/UnpublishedStock'));
const ProductLogsPage = lazy(() => import('./pages/ProductLogs'));
const Customers = lazy(() => import('./pages/Customers'));
const Orders = lazy(() => import('./pages/Orders'));
const Invoices = lazy(() => import('./pages/Invoices'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Expenses = lazy(() => import('./pages/Expenses'));
const PlatformConfigurations = lazy(() => import('./pages/PlatformConfigurations'));
const AppUpdates = lazy(() => import('./pages/AppUpdates'));
const PurchaseItems = lazy(() => import('./pages/PurchaseItems'));
const Roles = lazy(() => import('./pages/Roles'));
const UserRoles = lazy(() => import('./pages/UserRoles'));
const Users = lazy(() => import('./pages/Users'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'));
const POSTerminal = lazy(() => import('./pages/pos/POSTerminal'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}

// Requires a valid Clerk session but not an org — used for the onboarding flow.
function SessionRoute({ children }: { children: React.ReactNode }) {
  const { user, syncing } = useAuth();
  if (syncing && !user) return <RouteFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sso-callback" element={<SSOCallback />} />
          <Route path="/sso-continue" element={<SSOContinue />} />
          <Route path="/onboarding/create-org" element={<SessionRoute><CreateOrganization /></SessionRoute>} />

          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/:id" element={<InventoryDetailPage />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="stores" element={<Stores />} />
            <Route path="warehouse" element={<Locations />} />
            <Route path="locations" element={<Locations />} />
            <Route path="categories" element={<Categories />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="dashboard/purchase" element={<PurchaseDashboard />} />
            <Route path="dashboard/inventory" element={<InventoryDashboard />} />
            <Route path="dashboard/warehouse" element={<WarehouseDashboard />} />
            <Route path="dashboard/sales" element={<SalesDashboard />} />
            <Route path="pos" element={<POSTerminal />} />
            <Route path="bills" element={<Bills />} />
            <Route path="bills/:id" element={<BillDetail />} />
            <Route path="payment-transactions" element={<PaymentTransactions />} />
            <Route path="item-returns" element={<ItemReturns />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="report-generation-logs" element={<ReportGenerationLogs />} />
            <Route path="stock-movements" element={<StockMovementsPage />} />
            <Route path="stock-transfers" element={<StockTransfersPage />} />
            <Route path="unpublished-stock" element={<UnpublishedStockPage />} />
            <Route path="product-logs" element={<ProductLogsPage />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="vehicles/:id" element={<VehicleDetailPage />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="platform-configurations" element={<PlatformConfigurations />} />
            <Route path="settings/app" element={<AppUpdates />} />
            <Route path="purchase-items" element={<PurchaseItems />} />
            <Route path="roles" element={<Roles />} />
            <Route path="user-roles" element={<UserRoles />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
