import { Warehouse } from "lucide-react";
import { Stores } from "../../api";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
          {label}
        </h3>
        <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function WarehouseDashboard() {
  const {
    data: storesData,
    isLoading,
    isError,
  } = Stores.useSearch({ limit: 1 });

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Stores"
          value={
            isLoading ? "…" : isError ? "—" : String(storesData?.total ?? 0)
          }
          icon={Warehouse}
        />
      </div>
      {/* <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        GRN, GIN, and pending-transfer metrics are not live data — those warehouse modules have no
        backend yet. The count above is from Stores (not warehouse-type Locations).
      </div> */}
    </div>
  );
}
