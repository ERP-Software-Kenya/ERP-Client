import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import CreateOrganization from './pages/CreateOrganization';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Organizations from './pages/Organizations';
import Stores from './pages/Stores';
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
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import ModulePage from './pages/ModulePage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import { ALL_ITEMS } from './config/modules';

const GENERIC_KEYS = new Set([
  'activity-logs',
  'purchase-items',
  'expenses', 'reports', 'users', 'roles', 'user-roles',
  'platform-configurations'
]);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding/create-org" element={<CreateOrganization />} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="stores" element={<Stores />} />
          <Route path="categories" element={<Categories />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="bills" element={<Bills />} />
          <Route path="bills/:id" element={<BillDetail />} />
          <Route path="payment-transactions" element={<PaymentTransactions />} />
          <Route path="item-returns" element={<ItemReturns />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="report-generation-logs" element={<ReportGenerationLogs />} />
          <Route path="stock-movements" element={<StockMovements />} />
          <Route path="stock-transfers" element={<StockTransfers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          
          {ALL_ITEMS.filter(i => GENERIC_KEYS.has(i.key)).map(i => (
            <Route key={i.key} path={i.path.slice(1)} element={<ModulePage i={i} />} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
