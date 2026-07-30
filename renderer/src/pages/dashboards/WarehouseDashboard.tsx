import { useQuery } from '@tanstack/react-query';
import { Warehouse, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { Stores } from '../../api';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
          <Icon size={16} />
        </div>
      </div>
      <div className={value === 'Not available' ? 'text-sm text-muted-foreground' : 'text-2xl font-bold'}>{value}</div>
    </div>
  );
}

export default function WarehouseDashboard() {
  const { data: storesData, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'warehouse', 'stores'],
    queryFn: () => Stores.search({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Warehouses / Stores" value={isLoading ? '…' : isError ? 'Not available' : String(storesData?.total ?? 0)} icon={Warehouse} />
        <StatCard label="GRNs Today" value="Not available" icon={CheckSquare} />
        <StatCard label="GINs Today" value="Not available" icon={TrendingUp} />
        <StatCard label="Pending Transfers" value="Not available" icon={AlertTriangle} />
      </div>
      <div className="p-6 bg-card border border-border rounded-xl shadow-sm text-center text-sm text-muted-foreground">
        GRN/GIN and transfer stats need the Warehouse GRN/GIN backend modules, which don't exist yet
        (sub-project 4 of the sidebar rollout). Store count above is real.
      </div>
    </div>
  );
}
