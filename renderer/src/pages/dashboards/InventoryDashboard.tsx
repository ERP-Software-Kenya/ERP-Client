import { Link } from 'react-router-dom';
import { Package, AlertTriangle, DollarSign, Layers } from 'lucide-react';
import { Inventory, useInventoryLowStock, useInventoryValuation } from '../../api';
import type { InventoryItem } from '../../types';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">{label}</h3>
        <div className="rounded-full bg-blue-500/10 p-2 text-blue-500">
          <Icon size={16} />
        </div>
      </div>
      <div className={value === 'Not available' ? 'text-sm text-muted-foreground' : 'text-2xl font-bold'}>{value}</div>
    </div>
  );
}

function formatValuation(items: InventoryItem[] | undefined): string {
  if (!items?.length) return '$0.00';
  const total = items.reduce((sum, row) => sum + (row.averageCost ?? 0) * row.quantityOnHand, 0);
  return `$${total.toFixed(2)}`;
}

export default function InventoryDashboard() {
  const { data: searchData, isLoading: totalLoading, isError: totalError } = Inventory.useSearch({ limit: 1 });
  const { data: lowStock, isLoading: lowLoading, isError: lowError } = useInventoryLowStock();
  const { data: valuation, isLoading: valLoading, isError: valError } = useInventoryValuation();

  const lowItems = lowStock ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Inventory records"
          value={totalLoading ? '…' : totalError ? 'Not available' : String(searchData?.total ?? 0)}
          icon={Layers}
        />
        <StatCard
          label="Low-stock SKUs"
          value={lowLoading ? '…' : lowError ? 'Not available' : String(lowItems.length)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Valuation (on-hand × avg cost)"
          value={valLoading ? '…' : valError ? 'Not available' : formatValuation(valuation)}
          icon={DollarSign}
        />
        <StatCard label="Published products" value="Not available" icon={Package} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Low stock</h3>
          <Link to="/inventory" className="text-sm text-primary hover:underline">
            View all inventory
          </Link>
        </div>
        {lowLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : lowError ? (
          <p className="text-sm text-muted-foreground">Low-stock data is not available.</p>
        ) : lowItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items below reorder level.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">On hand</th>
                  <th className="py-2">Reorder</th>
                </tr>
              </thead>
              <tbody>
                {lowItems.slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <Link to={`/inventory/${row.id}`} className="hover:underline">
                        {row.productId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{row.locationId.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">{row.quantityOnHand}</td>
                    <td className="py-2">{row.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
