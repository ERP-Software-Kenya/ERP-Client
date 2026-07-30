import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Inventory as InventoryApi,
  Locations as LocationsApi,
  Products as ProductsApi,
  listStockMovementsByInventory,
  performStockOperation,
} from '../api';
import type { InventoryItem, StockMovement, StockMovementOp } from '../types';

const OPS: { value: StockMovementOp; label: string }[] = [
  { value: 'add', label: 'Add' },
  { value: 'remove', label: 'Remove' },
  { value: 'adjust', label: 'Adjust (set absolute qty)' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'release-reservation', label: 'Release reservation' },
  { value: 'damage', label: 'Damage' },
  { value: 'write-off', label: 'Write-off' },
];

interface FormState {
  op: StockMovementOp;
  inventoryId: string;
  locationId: string;
  productId: string;
  quantity: string;
  absoluteQuantity: string;
  unitCost: string;
  referenceId: string;
  referenceType: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  op: 'add',
  inventoryId: '',
  locationId: '',
  productId: '',
  quantity: '',
  absoluteQuantity: '',
  unitCost: '',
  referenceId: '',
  referenceType: '',
  notes: '',
};

function inventoryLabel(item: InventoryItem): string {
  return item.name || `Inventory ${item.id.slice(0, 8)}`;
}

export default function StockMovements() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [historyInventoryId, setHistoryInventoryId] = useState('');

  const closeDrawer = () => setDrawerOpen(false);

  const { data: history = [], isFetching: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['stock-movements', 'by-inventory', historyInventoryId],
    queryFn: () => listStockMovementsByInventory(historyInventoryId),
    enabled: !!historyInventoryId,
  });

  const opMutation = useMutation({
    mutationFn: () => {
      const base = {
        inventoryId: form.inventoryId,
        locationId: form.locationId,
        productId: form.productId,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        referenceId: form.referenceId || undefined,
        referenceType: form.referenceType || undefined,
        notes: form.notes || undefined,
      };
      if (form.op === 'adjust') {
        return performStockOperation('adjust', {
          ...base,
          absoluteQuantity: Number(form.absoluteQuantity),
        });
      }
      return performStockOperation(form.op, {
        ...base,
        quantity: Number(form.quantity),
      });
    },
    onSuccess: () => {
      toast.success(`Stock ${form.op} recorded`);
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      if (historyInventoryId && historyInventoryId === form.inventoryId) refetchHistory();
      setForm(EMPTY_FORM);
      closeDrawer();
    },
    onError: (error: Error) => toast.error(error.message || 'Stock operation failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inventoryId || !form.locationId || !form.productId) {
      toast.error('Inventory, location, and product are required');
      return;
    }
    if (form.op === 'adjust') {
      if (form.absoluteQuantity === '' || Number.isNaN(Number(form.absoluteQuantity))) {
        toast.error('Absolute quantity is required for adjust');
        return;
      }
    } else if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    opMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Stock Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Run inventory operations (add, remove, adjust, reserve, damage, write-off) and view
            movement history for an inventory record.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Operation</Button>
      </div>

      <FormSection title="Movement history">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[240px] flex-1">
            <Field label="Inventory">
              <ResourceSelect
                queryKey="inventory"
                fetchList={() => InventoryApi.list()}
                getLabel={inventoryLabel}
                value={historyInventoryId}
                onValueChange={setHistoryInventoryId}
                placeholder="Select inventory…"
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!historyInventoryId || historyLoading}
            onClick={() => refetchHistory()}
          >
            {historyLoading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

        {!historyInventoryId ? (
          <p className="text-sm text-muted-foreground">Select an inventory record to load movements.</p>
        ) : history.length === 0 && !historyLoading ? (
          <p className="text-sm text-muted-foreground">No movements for this inventory yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Before</th>
                  <th className="px-3 py-2 font-medium">After</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row: StockMovement) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">{row.movementType}</td>
                    <td className="px-3 py-2">{row.quantity}</td>
                    <td className="px-3 py-2">{row.quantityBefore}</td>
                    <td className="px-3 py-2">{row.quantityAfter}</td>
                    <td className="px-3 py-2">{row.notes || '—'}</td>
                    <td className="px-3 py-2">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Stock Operation"
        footer={
          <>
            <Button type="submit" form="stock-op-form" disabled={opMutation.isPending}>
              {opMutation.isPending ? 'Submitting…' : 'Submit'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="stock-op-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Operation" required>
            <Select
              value={form.op}
              onValueChange={(v) => setForm({ ...form, op: v as StockMovementOp })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Inventory" required>
            <ResourceSelect
              queryKey="inventory"
              fetchList={() => InventoryApi.list()}
              getLabel={inventoryLabel}
              value={form.inventoryId}
              onValueChange={(inventoryId) => setForm({ ...form, inventoryId })}
            />
          </Field>
          <Field label="Location" required>
            <ResourceSelect
              queryKey="locations"
              fetchList={() => LocationsApi.list()}
              getLabel={(l) => l.name}
              value={form.locationId}
              onValueChange={(locationId) => setForm({ ...form, locationId })}
            />
          </Field>
          <Field label="Product" required>
            <ResourceSelect
              queryKey="products"
              fetchList={() => ProductsApi.list()}
              getLabel={(p) => p.name || p.id}
              value={form.productId}
              onValueChange={(productId) => setForm({ ...form, productId })}
            />
          </Field>

          {form.op === 'adjust' ? (
            <Field label="Absolute quantity" required>
              <Input
                type="number"
                value={form.absoluteQuantity}
                onChange={(e) => setForm({ ...form, absoluteQuantity: e.target.value })}
                required
              />
            </Field>
          ) : (
            <Field label="Quantity" required>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </Field>
          )}

          <Field label="Unit cost">
            <Input
              type="number"
              min="0"
              step="any"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Reference ID">
              <Input
                value={form.referenceId}
                onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
              />
            </Field>
            <Field label="Reference type">
              <Input
                value={form.referenceType}
                onChange={(e) => setForm({ ...form, referenceType: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
