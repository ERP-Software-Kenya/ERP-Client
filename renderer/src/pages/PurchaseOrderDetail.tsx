import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { PurchaseOrders } from '../api';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: po, isLoading, error } = PurchaseOrders.useGet(id);

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (error || !po) return <div className="text-red-500">Failed to load purchase order: {String(error)}</div>;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/purchase-orders')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Purchase Orders
      </button>

      <div>
        <h1 className="text-2xl font-semibold">{po.name || '(unnamed purchase order)'}</h1>
        <p className="text-muted-foreground text-sm mt-1">ID: {po.id}</p>
        <p className="text-muted-foreground text-xs mt-1">
          Created: {po.createdAt || po.created_at || '—'}
        </p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        API response only exposes id/name (entity has storeId/supplierId/poNumber/totalAmount but they are
        not mapped). Line-item create blocked: DTO quantity/unitPrice ≠ entity quantityOrdered/unitCost (#0b).
        No bill↔PO link (#0c).
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Line Items</h2>
          <Button size="sm" variant="outline" disabled title="Blocked by Core API #0b">
            Add Item (blocked)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No list endpoint for purchase items; create cannot succeed until Core API aligns column names.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Linked Bills</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.message('No purchaseOrderId on bills — browse Bills instead.');
              navigate('/bills');
            }}
          >
            Go to Bills
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Bills API has no PO foreign key (#0c).</p>
      </div>
    </div>
  );
}
