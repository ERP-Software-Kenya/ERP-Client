import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { SimpleTable } from '../components/SimpleTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Inventory, Locations, useStockMovementsByInventory, useStockOperation } from '../api';
import { RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { InventoryItem, StockMovement, StockMovementOp } from '../types';

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
  referenceId: string;
  referenceType: string;
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
  referenceId: '',
  referenceType: '',
  notes: '',
};

export default function StockMovementsPage() {
  const recent = useRecentIds(RECENT_NS.stockMovementsInventory);
  const [opOpen, setOpOpen] = useState(false);
  const [opForm, setOpForm] = useState<OpForm>(EMPTY_OP);
  const [historyInventoryId, setHistoryInventoryId] = useState('');

  const { data: inventoryList } = Inventory.useList();
  const { data: locations } = Locations.useList();
  const locationLabel = useMemo(() => {
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

  const sortedMovements = useMemo(() => {
    const rows = [...(movements ?? [])];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [movements]);

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

  const selectHistory = (inventoryId: string) => {
    setHistoryInventoryId(inventoryId);
    if (inventoryId) {
      const row = inventoryList?.find((i) => i.id === inventoryId);
      const label = row
        ? `${row.productId.slice(0, 8)} @ ${(locationLabel.get(row.locationId) ?? row.locationId).slice(0, 24)}`
        : undefined;
      recent.push(inventoryId, label);
    }
  };

  const submitOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opForm.inventoryId || !opForm.locationId || !opForm.productId) {
      toast.error('Pick an inventory record');
      return;
    }
    if (opForm.op === 'adjust' && !opForm.absoluteQuantity) {
      toast.error('Absolute quantity is required for adjust');
      return;
    }
    if (opForm.op !== 'adjust' && !opForm.quantity) {
      toast.error('Quantity is required');
      return;
    }

    const body = {
      inventoryId: opForm.inventoryId,
      locationId: opForm.locationId,
      productId: opForm.productId,
      unitCost: opForm.unitCost ? Number(opForm.unitCost) : undefined,
      referenceId: opForm.referenceId || undefined,
      referenceType: opForm.referenceType || undefined,
      notes: opForm.notes || undefined,
      ...(opForm.op === 'adjust'
        ? { absoluteQuantity: Number(opForm.absoluteQuantity) }
        : { quantity: Number(opForm.quantity) }),
    };

    stockOp.mutate(
      { op: opForm.op, body },
      {
        onSuccess: () => {
          toast.success('Movement recorded');
          selectHistory(opForm.inventoryId);
          setOpOpen(false);
          setOpForm(EMPTY_OP);
          if (historyInventoryId === opForm.inventoryId) void refetch();
          else setHistoryInventoryId(opForm.inventoryId);
        },
        onError: (err: Error) => toast.error(err.message || 'Operation failed'),
      },
    );
  };

  const inventoryLabel = (i: InventoryItem) => {
    const loc = locationLabel.get(i.locationId) ?? i.locationId.slice(0, 8);
    return `Product ${i.productId.slice(0, 8)} @ ${loc} (on hand ${i.quantityOnHand})`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Stock movements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operations match Core API paths under <code className="text-xs">/stock-movements/&#123;op&#125;</code>.
            History is per inventory record (newest first). Recent inventories are saved in this browser.
          </p>
        </div>
        <Button onClick={() => setOpOpen(true)}>New operation</Button>
      </div>

      {recent.entries.length > 0 && (
        <FormSection title="Recent inventories">
          <SimpleTable
            columns={[
              {
                key: 'label',
                header: 'Inventory',
                render: (r) => r.label || r.id.slice(0, 8),
              },
              {
                key: 'when',
                header: 'Saved',
                render: (r) => new Date(r.savedAt).toLocaleString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => selectHistory(r.id)}>
                      Open history
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                      Remove
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={recent.entries}
            rowKey={(r) => r.id}
          />
        </FormSection>
      )}

      <FormSection title="Movement history">
        <Field label="Inventory record">
          <ResourceSelect
            resource={Inventory}
            getLabel={inventoryLabel}
            value={historyInventoryId}
            onValueChange={selectHistory}
            placeholder="Select inventory…"
          />
        </Field>
        {!historyInventoryId ? (
          <p className="mt-2 text-sm text-muted-foreground">Select a record to load movements.</p>
        ) : historyLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : sortedMovements.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No movements for this record.</p>
        ) : (
          <div className="mt-4">
            <SimpleTable
              columns={[
                { key: 'type', header: 'Type', render: (m: StockMovement) => m.movementType },
                { key: 'qty', header: 'Qty', render: (m: StockMovement) => m.quantity },
                {
                  key: 'change',
                  header: 'Before → After',
                  render: (m: StockMovement) => `${m.quantityBefore} → ${m.quantityAfter}`,
                },
                {
                  key: 'ref',
                  header: 'Reference',
                  render: (m: StockMovement) =>
                    m.referenceType || m.referenceId
                      ? `${m.referenceType ?? '—'} / ${m.referenceId?.slice(0, 8) ?? '—'}`
                      : '—',
                },
                { key: 'notes', header: 'Notes', render: (m: StockMovement) => m.notes ?? '—' },
                {
                  key: 'when',
                  header: 'When',
                  render: (m: StockMovement) =>
                    m.createdAt ? new Date(m.createdAt).toLocaleString() : '—',
                },
              ]}
              rows={sortedMovements}
              rowKey={(m) => m.id}
            />
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
          <p className="text-xs text-muted-foreground">
            Fields match StockOperationRequest (or AdjustStockRequest when op is adjust). Location and
            product fill from the inventory row.
          </p>
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
          <Field label="Reference ID">
            <Input
              value={opForm.referenceId}
              onChange={(e) => setOpForm({ ...opForm, referenceId: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field label="Reference type">
            <Input
              value={opForm.referenceType}
              onChange={(e) => setOpForm({ ...opForm, referenceType: e.target.value })}
              placeholder="Optional e.g. stock_transfer"
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
