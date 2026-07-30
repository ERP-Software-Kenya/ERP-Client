import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import SSOCallback from './pages/SSOCallback';
import SSOContinue from './pages/SSOContinue';
import CreateOrganization from './pages/CreateOrganization';
import Dashboard from './pages/Dashboard';
import PurchaseDashboard from './pages/dashboards/PurchaseDashboard';
import InventoryDashboard from './pages/dashboards/InventoryDashboard';
import WarehouseDashboard from './pages/dashboards/WarehouseDashboard';
import SalesDashboard from './pages/dashboards/SalesDashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Organizations from './pages/Organizations';
import Stores from './pages/Stores';
import Locations from './pages/Locations';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Bills from './pages/Bills';
import BillDetail from './pages/BillDetail';
import PaymentTransactions from './pages/PaymentTransactions';
import ItemReturns from './pages/ItemReturns';
import Notifications from './pages/Notifications';
import ReportGenerationLogs from './pages/ReportGenerationLogs';
import StockMovements from './pages/StockMovements';
import StockTransfers from './pages/StockTransfers';
import UnpublishedStock from './pages/UnpublishedStock';
import ProductLogs from './pages/ProductLogs';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import ActivityLogs from './pages/ActivityLogs';
import AuditLog from './pages/AuditLog';
import Expenses from './pages/Expenses';
import PlatformConfigurations from './pages/PlatformConfigurations';
import PurchaseItems from './pages/PurchaseItems';
import Roles from './pages/Roles';
import UserRoles from './pages/UserRoles';
import Users from './pages/Users';
import OrgAddresses from './pages/OrgAddresses';
import UserAddresses from './pages/UserAddresses';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetailPage from './pages/VehicleDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/sso-continue" element={<SSOContinue />} />
        <Route path="/onboarding/create-org" element={<CreateOrganization />} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="stores" element={<Stores />} />
          <Route path="locations" element={<Locations />} />
          <Route path="categories" element={<Categories />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="dashboard/purchase" element={<PurchaseDashboard />} />
          <Route path="dashboard/inventory" element={<InventoryDashboard />} />
          <Route path="dashboard/warehouse" element={<WarehouseDashboard />} />
          <Route path="dashboard/sales" element={<SalesDashboard />} />
          <Route path="bills" element={<Bills />} />
          <Route path="bills/:id" element={<BillDetail />} />
          <Route path="payment-transactions" element={<PaymentTransactions />} />
          <Route path="item-returns" element={<ItemReturns />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="report-generation-logs" element={<ReportGenerationLogs />} />
          <Route path="stock-movements" element={<StockMovements />} />
          <Route path="stock-transfers" element={<StockTransfers />} />
          <Route path="unpublished-stock" element={<UnpublishedStock />} />
          <Route path="product-logs" element={<ProductLogs />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="platform-configurations" element={<PlatformConfigurations />} />
          <Route path="purchase-items" element={<PurchaseItems />} />
          <Route path="roles" element={<Roles />} />
          <Route path="user-roles" element={<UserRoles />} />
          <Route path="users" element={<Users />} />
          <Route path="org-addresses" element={<OrgAddresses />} />
          <Route path="user-addresses" element={<UserAddresses />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
