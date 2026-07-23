import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import CreateOrganization from './pages/CreateOrganization';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import ModulePage from './pages/ModulePage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import { ALL_ITEMS } from './config/modules';

const GENERIC_KEYS = new Set([
  'notifications', 'activity-logs', 'categories', 'stock-movements', 'stock-transfers', 'item-returns',
  'orders', 'invoices', 'customers', 'purchase-orders', 'purchase-items', 'suppliers', 'bills', 'stores',
  'payment-transactions', 'expenses', 'reports', 'report-generation-logs', 'users', 'roles', 'user-roles',
  'organizations', 'platform-configurations'
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
