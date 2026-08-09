import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Layers, AlertTriangle, DollarSign, PackageX, MapPin } from 'lucide-react';
import { Analytics, Locations, Products, useInventoryLowStock } from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#6366f1','#14b8a6'];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function KpiCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: string;
  icon: React.ComponentType<{ size?: number }>; color: string;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className={`p-2 rounded-full ${color}`}><Icon size={16} /></div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function InventoryDashboard() {
  const { data: summary, isLoading: sLoading } = Analytics.useInventorySummary();
  const { data: byLoc,   isLoading: lLoading } = Analytics.useStockByLocation();
  const { data: lowStock, isLoading: lowLoading } = useInventoryLowStock();
  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();

  const productName = useMemo(() => {
    const mp = new Map<string, string>();
    for (const p of products ?? []) {
      mp.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return mp;
  }, [products]);

  const locationName = useMemo(() => {
    const ml = new Map<string, string>();
    for (const l of locations ?? []) {
      ml.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    }
    return ml;
  }, [locations]);

  const ld = (v: boolean, s: string) => (v ? '…' : s);

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total SKUs Tracked" icon={Layers} color="bg-blue-500/10 text-blue-500"
          value={ld(sLoading, String(summary?.totalSkus ?? 0))} />
        <KpiCard label="Low-Stock SKUs" icon={AlertTriangle} color="bg-amber-500/10 text-amber-500"
          value={ld(sLoading, String(summary?.lowStockCount ?? 0))} />
        <KpiCard label="Zero-Stock Items" icon={PackageX} color="bg-red-500/10 text-red-500"
          value={ld(sLoading, String(summary?.zeroStockCount ?? 0))} />
        <KpiCard label="Total Valuation" icon={DollarSign} color="bg-green-500/10 text-green-500"
          value={ld(sLoading, fmt(summary?.totalValuation ?? 0))} />
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <MapPin size={14} className="text-blue-500" /> Stock on Hand by Location
        </h3>
        {lLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : (byLoc?.length ?? 0) === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No location data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, (byLoc?.length ?? 0) * 36)}>
            <BarChart data={byLoc} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="locationName" width={120} tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 15)}…` : v} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Units on Hand']} />
              <Bar dataKey="totalStock" radius={[0, 3, 3, 0]} name="Units on Hand">
                {(byLoc ?? []).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" /> Low Stock Items
          </h3>
          <Link to="/inventory" className="text-sm text-primary hover:underline">View all inventory</Link>
        </div>
        {lowLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (lowStock?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No items below reorder level.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Product</th>
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 pr-4 font-medium">On Hand</th>
                  <th className="py-2 font-medium">Reorder At</th>
                </tr>
              </thead>
              <tbody>
                {(lowStock ?? []).slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <Link to={`/inventory/${row.id}`} className="hover:underline">
                        {productName.get(row.productId) ?? formatEntityLabel({ id: row.productId })}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {locationName.get(row.locationId) ?? formatEntityLabel({ id: row.locationId })}
                    </td>
                    <td className="py-2 pr-4 text-red-500 font-semibold">{row.quantityOnHand}</td>
                    <td className="py-2 text-muted-foreground">{row.reorderLevel}</td>
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
