import { Package, Truck, ArrowRightLeft, DollarSign } from 'lucide-react';
import { Products } from '../api';

// Only "Total Products" is backed by a real endpoint. Orders, StockMovements and
// Invoices are create + get-by-id only (no list/search) — there is currently no
// backend way to compute pending-order counts, stock-movement counts, MTD revenue,
// a sales-over-time series, or a recent-activity feed. Shown as "Not available"
// rather than fabricated numbers; wire these up once those resources get a list
// endpoint.
export default function Dashboard() {
  const { data: productsResult, isLoading } = Products.useSearch({ limit: 1 });
  const productTotal = productsResult?.total;

  const stats = [
    { label: 'Total Products', value: isLoading ? '…' : String(productTotal ?? 0), icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pending Orders', value: 'Not available', icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Stock Movements', value: 'Not available', icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Revenue (MTD)', value: 'Not available', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{stat.label}</h3>
                <div className={`p-2 rounded-full ${stat.bg} ${stat.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className={stat.value === 'Not available' ? 'text-sm text-muted-foreground' : 'text-2xl font-bold'}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-card border border-border rounded-xl shadow-sm text-center text-sm text-muted-foreground">
        Sales trends and recent activity require list/reporting endpoints that don't exist on the backend
        yet (Orders, Invoices, StockMovements and ActivityLogs are all create + get-by-id only). Nothing
        to show here until those endpoints exist.
      </div>
    </div>
  );
}
