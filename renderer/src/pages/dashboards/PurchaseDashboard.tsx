import { ShoppingCart, CheckSquare, DollarSign, TrendingUp } from 'lucide-react';
import { PurchaseOrders, Bills, PaymentTransactions } from '../../api';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
          <Icon size={16} />
        </div>
      </div>
      <div className={value === 'Not available' ? 'text-sm text-muted-foreground' : 'text-2xl font-bold'}>{value}</div>
    </div>
  );
}

export default function PurchaseDashboard() {
  const { data: poData, isLoading: poLoading, isError: poIsError } = PurchaseOrders.useSearch({ limit: 1 });
  const { data: billsData, isLoading: billsLoading, isError: billsIsError } = Bills.useSearch({ limit: 1 });
  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsIsError } = PaymentTransactions.useSearch({
    limit: 1,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Purchase Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Purchase Orders" value={poLoading ? '…' : poIsError ? 'Not available' : String(poData?.total ?? 0)} icon={ShoppingCart} />
        <StatCard label="Total Bills" value={billsLoading ? '…' : billsIsError ? 'Not available' : String(billsData?.total ?? 0)} icon={CheckSquare} />
        <StatCard label="Payments" value={paymentsLoading ? '…' : paymentsIsError ? 'Not available' : String(paymentsData?.total ?? 0)} icon={DollarSign} />
        <StatCard label="Purchase Trend" value="Not available" icon={TrendingUp} />
      </div>
      <div className="p-4 bg-card border border-border rounded-xl shadow-sm text-center text-sm text-muted-foreground">
        A purchase-over-time chart needs a way to bucket purchase orders by date server-side (or fetching every
        row client-side to bucket locally) — deferred until that's worth building. Counts above are real.
      </div>
    </div>
  );
}
