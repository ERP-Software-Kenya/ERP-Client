import { useQuery } from '@tanstack/react-query';
import { Boxes, AlertTriangle, TrendingUp } from 'lucide-react';
import { Inventory, getInventoryLowStock, getInventoryValuation } from '../../api';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
          <Icon size={16} />
        </div>
      </div>
      <div className={value === 'Not available' ? 'text-sm text-muted-foreground' : 'text-2xl font-bold'}>{value}</div>
    </div>
  );
}

export default function InventoryDashboard() {
  const { data: totalData, isLoading: totalLoading, isError: totalIsError } = useQuery({
    queryKey: ['dashboard', 'inventory', 'total'],
    queryFn: () => Inventory.search({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: lowStock, isLoading: lowStockLoading, isError: lowStockIsError } = useQuery({
    queryKey: ['dashboard', 'inventory', 'low-stock'],
    queryFn: getInventoryLowStock,
    staleTime: 5 * 60 * 1000,
  });
  const { data: valuation, isLoading: valuationLoading, isError: valuationIsError } = useQuery({
    queryKey: ['dashboard', 'inventory', 'valuation'],
    queryFn: getInventoryValuation,
    staleTime: 5 * 60 * 1000,
  });

  const totalStockValue = (valuation ?? []).reduce((sum, item) => sum + item.quantityOnHand * (item.averageCost ?? 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Inventory Items" value={totalLoading ? '…' : totalIsError ? 'Not available' : String(totalData?.total ?? 0)} icon={Boxes} />
        <StatCard label="Low Stock Items" value={lowStockLoading ? '…' : lowStockIsError ? 'Not available' : String(lowStock?.length ?? 0)} icon={AlertTriangle} />
        <StatCard label="Stock Value" value={valuationLoading ? '…' : valuationIsError ? 'Not available' : totalStockValue.toLocaleString()} icon={TrendingUp} />
        <StatCard label="Expiring (30 days)" value="Not available" icon={AlertTriangle} />
      </div>
      {lowStock && lowStock.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Low Stock Alerts</h3>
          </div>
          <div className="divide-y divide-border">
            {lowStock.slice(0, 10).map((item) => (
              <div key={item.id} className="px-5 py-3 text-sm flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">Product {item.productId}</span>
                <span>{item.quantityOnHand} on hand (reorder at {item.reorderLevel})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
