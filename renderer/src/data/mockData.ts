export const mockData = {
  notifications: [
    { id: 1, title: 'New Order', message: 'Order #1234 has been placed', read: false, createdAt: new Date().toISOString() },
  ],
  'activity-logs': [
    { id: 1, user: 'Admin', action: 'Updated product', timestamp: new Date().toISOString() },
  ],
  categories: [
    { id: 1, name: 'Electronics', description: 'Electronic items' },
  ],
  'stock-movements': [
    { id: 1, product: 'Laptop', quantity: 50, type: 'IN', date: new Date().toISOString() },
  ],
  'stock-transfers': [
    { id: 1, from: 'Warehouse A', to: 'Warehouse B', status: 'Completed', date: new Date().toISOString() },
  ],
  'item-returns': [
    { id: 1, orderId: '#1234', reason: 'Defective', status: 'Pending', date: new Date().toISOString() },
  ],
  orders: [
    { id: 1, customer: 'John Doe', total: 1500, status: 'Processing', date: new Date().toISOString() },
  ],
  invoices: [
    { id: 1, orderId: '#1234', amount: 1500, status: 'Paid', date: new Date().toISOString() },
  ],
  customers: [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
  ],
  'purchase-orders': [
    { id: 1, supplier: 'Tech Corp', total: 5000, status: 'Ordered', date: new Date().toISOString() },
  ],
  'purchase-items': [
    { id: 1, poId: 1, item: 'Keyboard', quantity: 100 },
  ],
  suppliers: [
    { id: 1, name: 'Tech Corp', contact: 'Alice', email: 'alice@techcorp.com' },
  ],
  bills: [
    { id: 1, supplier: 'Tech Corp', amount: 5000, status: 'Unpaid', date: new Date().toISOString() },
  ],
  stores: [
    { id: 1, name: 'Main Warehouse', location: 'New York', capacity: '10000 sq ft' },
  ],
  'payment-transactions': [
    { id: 1, invoiceId: 1, amount: 1500, method: 'Credit Card', date: new Date().toISOString() },
  ],
  expenses: [
    { id: 1, category: 'Utilities', amount: 300, date: new Date().toISOString() },
  ],
  reports: [
    { id: 1, name: 'Monthly Sales', type: 'Sales', date: new Date().toISOString() },
  ],
  'report-generation-logs': [
    { id: 1, report: 'Monthly Sales', requestedBy: 'Admin', date: new Date().toISOString() },
  ],
  users: [
    { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'Admin' },
  ],
  roles: [
    { id: 1, name: 'Admin', description: 'Full access' },
  ],
  'user-roles': [
    { id: 1, user: 'Admin User', role: 'Admin' },
  ],
  organizations: [
    { id: 1, name: 'Acme Corp', subscription: 'Pro' },
  ],
  'platform-configurations': [
    { id: 1, key: 'maintenance_mode', value: 'false' },
  ],
};
