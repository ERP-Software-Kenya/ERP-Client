import { ERPDataTable, Column } from '../components/ERPDataTable';
import { Inventory as InventoryApi } from '../api';
import type { InventoryItem } from '../types';

export default function Inventory() {
  const columns: Column<InventoryItem>[] = [
    { 
      key: 'product', 
      label: 'Product', 
      render: (row) => String((row as any).product_name || (row as any).product || 'Unknown') 
    },
    { 
      key: 'location', 
      label: 'Location', 
      render: (row) => String((row as any).location || '—') 
    },
    { key: 'quantity', label: 'Quantity' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => {
        const qty = row.quantity || 0;
        const defaultStatus = qty < 20 ? 'Low Stock' : 'In Stock';
        const status = row.status || defaultStatus;
        const isLow = status === 'Low Stock' || qty < 20;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isLow ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
          }`}>
            {status}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Inventory Management"
        description="Monitor and receive stock across locations."
        queryKey="inventory"
        columns={columns}
        fetchData={(params) => InventoryApi.search(params)}
        searchPlaceholder="Search inventory..."
        isAdmin={true}
        onAdd={() => console.log('Receive Stock')}
        onEdit={() => console.log('Adjust Stock')}
      />
    </div>
  );
}
