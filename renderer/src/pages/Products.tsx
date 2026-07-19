import { ERPDataTable, Column } from '../components/ERPDataTable';
import { Products as ProductsApi } from '../api';
import type { Product } from '../types';

export default function Products() {
  const columns: Column<Product>[] = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { 
      key: 'unit_price', 
      label: 'Price', 
      render: (row) => `$${Number(row.unit_price || 0).toFixed(2)}` 
    },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Products"
        description="Manage your product catalog."
        queryKey="products"
        columns={columns}
        fetchData={(params) => ProductsApi.search(params)}
        searchPlaceholder="Search products..."
        isAdmin={true}
        onAdd={() => console.log('Add product')}
        onEdit={() => console.log('Edit product')}
      />
    </div>
  );
}
