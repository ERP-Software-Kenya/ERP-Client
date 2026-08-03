import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Warehouse, Store, Boxes, Package } from "lucide-react";
import { Locations, Products, Inventory } from "../../api";
import { ResourceSelect } from "../../components/ResourceSelect";

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
  const [productFilter, setProductFilter] = useState("");

  const {
    data: warehouses,
    isLoading: whLoading,
    isError: whError,
  } = Locations.useSearch({ filters: { type: "warehouse" }, limit: 1 });
  const {
    data: stores,
    isLoading: stLoading,
    isError: stError,
  } = Locations.useSearch({ filters: { type: "store" }, limit: 1 });
  const {
    data: productsTotal,
    isLoading: prLoading,
    isError: prError,
  } = Products.useSearch({ limit: 1 });

  const { data: inventory, isLoading: invLoading } = Inventory.useList();
  const { data: locations } = Locations.useList();

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name);
    return m;
  }, [locations]);

  // ponytail: client-side sum, move to a backend aggregate if inventory row counts grow past what fits in one fetch
  const totalStock = useMemo(
    () => (inventory ?? []).reduce((sum, i) => sum + i.quantityOnHand, 0),
    [inventory],
  );

  const chartData = useMemo(() => {
    const rows = productFilter
      ? (inventory ?? []).filter((i) => i.productId === productFilter)
      : (inventory ?? []);
    const byLocation = new Map<string, number>();
    for (const item of rows) {
      byLocation.set(
        item.locationId,
        (byLocation.get(item.locationId) ?? 0) + item.quantityOnHand,
      );
    }
    return [...byLocation.entries()]
      .map(([locationId, stock]) => ({
        location: locationMap.get(locationId) ?? locationId,
        stock,
      }))
      .sort((a, b) => b.stock - a.stock);
  }, [inventory, productFilter, locationMap]);

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Warehouses"
          value={
            whLoading ? "…" : whError ? "—" : String(warehouses?.total ?? 0)
          }
          icon={Warehouse}
        />
        <StatCard
          label="Stores"
          value={stLoading ? "…" : stError ? "—" : String(stores?.total ?? 0)}
          icon={Store}
        />
        <StatCard
          label="Total Stock"
          value={invLoading ? "…" : String(totalStock)}
          icon={Boxes}
        />
        <StatCard
          label="Total Products"
          value={
            prLoading ? "…" : prError ? "—" : String(productsTotal?.total ?? 0)
          }
          icon={Package}
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm">Stock by Location</h3>
          <div className="w-64">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name ?? "Unnamed product"}
              value={productFilter}
              onValueChange={setProductFilter}
              allowNone
              noneLabel="All products"
              placeholder="All products"
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="stock" fill="#3b82f6" name="Stock on hand" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
