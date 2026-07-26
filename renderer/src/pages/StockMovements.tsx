import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { StockMovements as StockMovementsApi, Inventory as InventoryApi, Organizations as OrganizationsApi } from '../api';
import type { StockMovement, InventoryItem } from '../types';

const TYPE_OPTIONS = ['IN', 'OUT'];

interface FormState {
  organization_id: string;
  inventory_id: string;
  type: string;
  quantity: string;
  reason: string;
}

const EMPTY_FORM: FormState = { organization_id: '', inventory_id: '', type: TYPE_OPTIONS[0], quantity: '', reason: '' };

// GET /inventory only returns `{id, name?}` live (docs/core-apis-fixes.md #11)
// — product_id/store_id never round-trip, so there's nothing more descriptive
// to show than the id itself.
function inventoryLabel(item: InventoryItem): string {
  return item.name || `Inventory item ${item.id.slice(0, 8)}`;
}

export default function StockMovements() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Wired up and ready, but the submit button below stays disabled: creating a
  // StockMovement 500s on every call today — a confirmed core-apis DTO/entity
  // mismatch bug, not a client issue. Live-tested 2026-07-26 with a real
  // inventoryId (no confounding FK) — clean confirmation. See
  // docs/core-apis-fixes.md #2. Remove the `disabled` prop once that's fixed.
  const createMutation = useMutation({
    mutationFn: (body: Partial<StockMovement>) => StockMovementsApi.create(body),
    onSuccess: () => {
      toast.success('Stock adjustment recorded');
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to record stock adjustment'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      organizationId: form.organization_id || undefined,
      inventoryId: form.inventory_id || undefined,
      type: form.type,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      reason: form.reason || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Adjustments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Log damage/loss/found/correction adjustments against an inventory balance.
            <span className="text-amber-500 font-medium"> Currently blocked</span> — the backend
            fails to save new stock movements (core-apis DTO/entity mismatch, see
            docs/core-apis-fixes.md #2). This form is ready to use once that's fixed.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Stock Adjustment</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request.
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <ResourceSelect
                queryKey="organizations"
                fetchList={() => OrganizationsApi.list()}
                getLabel={(o) => o.name}
                value={form.organization_id}
                onValueChange={(v) => setForm({ ...form, organization_id: v })}
                placeholder="Select organization…"
              />
            </div>
            <div className="space-y-2">
              <Label>Inventory item</Label>
              <ResourceSelect
                queryKey="inventory"
                fetchList={() => InventoryApi.list()}
                getLabel={inventoryLabel}
                value={form.inventory_id}
                onValueChange={(v) => setForm({ ...form, inventory_id: v })}
                placeholder="Select inventory item…"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sm-quantity">Quantity</Label>
              <Input
                id="sm-quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sm-reason">Reason</Label>
              <Input
                id="sm-reason"
                placeholder="Damage, Loss, Found, Correction…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled>
                Create (blocked — see notice above)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
