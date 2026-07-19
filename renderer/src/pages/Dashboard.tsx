import { useState, useEffect } from 'react';
import { Package, Truck, ArrowRightLeft, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATS = [
  { label: 'Total Products', value: '1,234', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Pending Orders', value: '56', icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Stock Movements', value: '892', icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Revenue (MTD)', value: '$45,678', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
];

const CHART_DATA = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 2000 },
  { name: 'Apr', sales: 2780 },
  { name: 'May', sales: 1890 },
  { name: 'Jun', sales: 2390 },
  { name: 'Jul', sales: 3490 },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call for dashboard stats
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-6 bg-card border border-border rounded-xl shadow-sm">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{stat.label}</h3>
                <div className={`p-2 rounded-full ${stat.bg} ${stat.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold">{loading ? '...' : stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 p-6 bg-card border border-border rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Sales Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} className="opacity-50" />
                <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} className="opacity-50" />
                <Tooltip 
                  cursor={{ fill: 'currentColor', opacity: 0.1 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="col-span-3 p-6 bg-card border border-border rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New order #10{i}4 placed</p>
                  <p className="text-xs text-muted-foreground">{i * 10} minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
