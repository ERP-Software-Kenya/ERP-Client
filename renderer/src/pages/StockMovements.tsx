import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Inventory, Locations, useStockMovementsByInventory, useStockOperation } from '../api';
import type { InventoryItem, StockMovementOp } from '../types';

const STOCK_OPS: StockMovementOp[] = [
  'add',
  'remove',
  'adjust',
  'reserve',
  'release-reservation',
  'damage',
  'write-off',
];

interface OpForm {
  inventoryId: string;
  locationId: string;
  productId: string;
  op: StockMovementOp;
  quantity: string;
  absoluteQuantity: string;
  unitCost: string;
  notes: string;
}

const EMPTY_OP: OpForm = {
  inventoryId: '',
  locationId: '',
  productId: '',
  op: 'add',
  quantity: '',
  absoluteQuantity: '',
  unitCost: '',
  notes: '',
};

export default function StockMovementsPage() {
  const [opOpen, setOpOpen] = useState(false);
  const [opForm, setOpForm] = useState<OpForm>(EMPTY_OP);
  const [historyInventoryId, setHistoryInventoryId] = useState('');

  const { data: inventoryList } = Inventory.useList();
  const { data: locations } = Locations.useList();
  const storeLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : l.name);
    }
    return m;
  }, [locations]);
  const { data: movements, isLoading: historyLoading, refetch } = useStockMovementsByInventory(
    historyInventoryId || undefined,
  );
  const stockOp = useStockOperation();

  useEffect(() => {
    if (!opForm.inventoryId || !inventoryList) return;
    const row = inventoryList.find((i) => i.id === opForm.inventoryId);
    if (row) {
      setOpForm((prev) => ({
        ...prev,
        locationId: row.locationId,
        productId: row.productId,
      }));
    }
  }, [opForm.inventoryId, inventoryList]);

  const submitOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opForm.inventoryId || !opForm.locationId || !opForm.productId) {
      toast.error('Pick an inventory record');
      return;
    }
    const body = {
      inventoryId: opForm.inventoryId,
      locationId: opForm.locationId,
      productId: opForm.productId,
      unitCost: opForm.unitCost ? Number(opForm.unitCost) : undefined,
      notes: opForm.notes || undefined,
      ...(opForm.op === 'adjust'
        ? { absoluteQuantity: Number(opForm.absoluteQuantity) }
        : { quantity: Number(opForm.quantity) }),
    };
    if (opForm.op === 'adjust' && !opForm.absoluteQuantity) {
      toast.error('Absolute quantity is required for adjust');
      return;
    }
    if (opForm.op !== 'adjust' && !opForm.quantity) {
      toast.error('Quantity is required');
      return;
    }
    stockOp.mutate(
      { op: opForm.op, body },
      {
        onSuccess: () => {
          toast.success('Movement recorded');
          setOpOpen(false);
          setOpForm(EMPTY_OP);
          if (historyInventoryId === opForm.inventoryId) void refetch();
        },
      },
    );
  };

  const inventoryLabel = (i: InventoryItem) => {
    const store = storeLabel.get(i.locationId) ?? i.locationId.slice(0, 8);
    return `Product ${i.productId.slice(0, 8)} @ ${store} (on hand ${i.quantityOnHand})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Stock movements</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record operations and browse history per inventory record. There is no global movements
            list endpoint.
          </p>
        </div>
        <Button onClick={() => setOpOpen(true)}>New operation</Button>
      </div>

      <FormSection title="History">
        <Field label="Inventory record">
          <ResourceSelect
            resource={Inventory}
            getLabel={inventoryLabel}
            value={historyInventoryId}
            onValueChange={setHistoryInventoryId}
            placeholder="Select inventory…"
          />
        </Field>
        {!historyInventoryId ? (
          <p className="text-sm text-muted-foreground">Select a record to load movements.</p>
        ) : historyLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (movements?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No movements for this record.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Before → After</th>
                  <th className="py-2 pr-4">Notes</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {movements!.map((m) => (
                  <tr key={m.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{m.movementType}</td>
                    <td className="py-2 pr-4">{m.quantity}</td>
                    <td className="py-2 pr-4">
                      {m.quantityBefore} → {m.quantityAfter}
                    </td>
                    <td className="py-2 pr-4">{m.notes ?? '—'}</td>
                    <td className="py-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <FormDrawer
        open={opOpen}
        onClose={() => setOpOpen(false)}
        title="Stock operation"
        footer={
          <>
            <Button type="submit" form="stock-op-form" disabled={stockOp.isPending}>
              {stockOp.isPending ? 'Submitting…' : 'Submit'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="stock-op-form" onSubmit={submitOp} className="space-y-4">
          <Field label="Inventory record" required>
            <ResourceSelect
              resource={Inventory}
              getLabel={inventoryLabel}
              value={opForm.inventoryId}
              onValueChange={(inventoryId) => setOpForm({ ...opForm, inventoryId })}
            />
          </Field>
          <Field label="Operation" required>
            <Select value={opForm.op} onValueChange={(v) => setOpForm({ ...opForm, op: v as StockMovementOp })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_OPS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {opForm.op === 'adjust' ? (
            <Field label="Absolute quantity" required>
              <Input
                type="number"
                min="0"
                step="any"
                value={opForm.absoluteQuantity}
                onChange={(e) => setOpForm({ ...opForm, absoluteQuantity: e.target.value })}
              />
            </Field>
          ) : (
            <Field label="Quantity" required>
              <Input
                type="number"
                min="0"
                step="any"
                value={opForm.quantity}
                onChange={(e) => setOpForm({ ...opForm, quantity: e.target.value })}
              />
            </Field>
          )}
          <Field label="Unit cost">
            <Input
              type="number"
              min="0"
              step="any"
              value={opForm.unitCost}
              onChange={(e) => setOpForm({ ...opForm, unitCost: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Input value={opForm.notes} onChange={(e) => setOpForm({ ...opForm, notes: e.target.value })} />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
