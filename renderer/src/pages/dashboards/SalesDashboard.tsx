import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ClipboardList, Receipt, Users2 } from 'lucide-react';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className="p-2 rounded-full bg-green-500/10 text-green-500">
          <Icon size={16} />
        </div>
      </div>
      <div className={value === 'Not available' ? 'text-sm text-muted-foreground' : 'text-2xl font-bold'}>{value}</div>
    </div>
  );
}

// Demo data — Orders/Invoices list endpoints don't exist yet (deferred Tasks 2–3).
// Replace with real react-query calls once those land; do not treat these numbers as real.
const DEMO_SALES_TREND = [
  { month: 'Jan', value: 380000 }, { month: 'Feb', value: 420000 },
  { month: 'Mar', value: 510000 }, { month: 'Apr', value: 470000 },
  { month: 'May', value: 560000 }, { month: 'Jun', value: 620000 }, { month: 'Jul', value: 590000 },
];
const DEMO_TOTAL_ORDERS = 34;
const DEMO_TOTAL_INVOICES = 128;

export default function SalesDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
          Demo data — Orders/Invoices totals below are placeholders
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders (demo)" value={String(DEMO_TOTAL_ORDERS)} icon={ClipboardList} />
        <StatCard label="Total Invoices (demo)" value={String(DEMO_TOTAL_INVOICES)} icon={Receipt} />
        <StatCard label="Active Customers" value="Not available" icon={Users2} />
        <StatCard label="Revenue Trend" value="Demo" icon={TrendingUp} />
      </div>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4">Monthly Sales Trend (demo data)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={DEMO_SALES_TREND}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Line type="monotone" dataKey="value" strokeWidth={2} dot={{ r: 4 }} name="Sales" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="p-4 bg-card border border-border rounded-xl shadow-sm text-center text-sm text-muted-foreground">
        Orders/Invoices totals and the trend chart above are demo data, pending the deferred
        Orders/Invoices list endpoints (plan Tasks 2–3). Customers also has no list/search
        endpoint yet on the backend, so Active Customers isn't available either.
      </div>
    </div>
  );
}
