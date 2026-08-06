import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { FormDrawer, Field, FormSection } from '../../components/FormDrawer';
import { SimpleTable } from '../../components/SimpleTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Inventory,
  Products,
  Locations,
  useStockMovementsByInventory,
  useStockOperation,
  useProductLogsByInventory,
} from '../../api';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import type { ProductLog, StockMovement, StockMovementOp } from '../../types';

const STOCK_OPS: StockMovementOp[] = [
  'add',
  'remove',
  'adjust',
  'reserve',
  'release-reservation',
  'damage',
  'write-off',
];

interface MetaForm {
  reorderLevel: string;
  maxStock: string;
  binLocation: string;
}

interface OpForm {
  op: StockMovementOp;
  quantity: string;
  absoluteQuantity: string;
  unitCost: string;
  notes: string;
}

const EMPTY_META: MetaForm = { reorderLevel: '', maxStock: '', binLocation: '' };
const EMPTY_OP: OpForm = { op: 'add', quantity: '', absoluteQuantity: '', unitCost: '', notes: '' };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading, error, refetch } = Inventory.useGet(id);
  const { data: product } = Products.useGet(item?.productId);
  const { data: location } = Locations.useGet(item?.locationId);
  const { data: movements, isLoading: movementsLoading } = useStockMovementsByInventory(id);
  const { data: logs, isLoading: logsLoading } = useProductLogsByInventory(id);

  const updateMutation = Inventory.useUpdate();
  const stockOp = useStockOperation();

  const [metaOpen, setMetaOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [metaForm, setMetaForm] = useState<MetaForm>(EMPTY_META);
  const [opForm, setOpForm] = useState<OpForm>(EMPTY_OP);

  useEffect(() => {
    if (!item) return;
    setMetaForm({
      reorderLevel: String(item.reorderLevel ?? ''),
      maxStock: item.maxStock != null ? String(item.maxStock) : '',
      binLocation: item.binLocation ?? '',
    });
  }, [item]);

  useEffect(() => {
    if (!item || !opOpen) return;
    setOpForm((prev) => ({ ...prev, quantity: '', absoluteQuantity: '', unitCost: '', notes: '' }));
  }, [item, opOpen]);

  const available = item != null ? item.quantityOnHand - item.quantityReserved : 0;

  const saveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    updateMutation.mutate(
      {
        id: item.id,
        body: {
          reorderLevel: metaForm.reorderLevel ? Number(metaForm.reorderLevel) : undefined,
          maxStock: metaForm.maxStock ? Number(metaForm.maxStock) : undefined,
          binLocation: metaForm.binLocation || undefined,
        },
      },
      { onSuccess: () => setMetaOpen(false) },
    );
  };

  const submitOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const body = {
      inventoryId: item.id,
      locationId: item.locationId,
      productId: item.productId,
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
          toast.success('Stock updated');
          setOpOpen(false);
          void refetch();
        },
      },
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (error || !item) {
    return (
      <div className="space-y-4">
        <Link to="/inventory" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to inventory
        </Link>
        <p className="text-destructive">Could not load inventory record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/inventory" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Inventory
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">
            {formatEntityLabel({ name: product?.name, sku: product?.sku, id: item.productId })}
          </h2>
          <p className="text-sm text-muted-foreground">
            Location:{' '}
            {location
              ? location.type
                ? `${location.name} (${location.type})`
                : formatEntityLabel({ name: location.name, id: location.id })
              : formatEntityLabel({ id: item.locationId })}{' '}
            · ID {truncateId(item.id)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMetaOpen(true)}>
            Edit settings
          </Button>
          <Button onClick={() => setOpOpen(true)}>Stock operation</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="On hand" value={item.quantityOnHand} />
        <Stat label="Reserved" value={item.quantityReserved} />
        <Stat label="Available" value={available} />
        <Stat label="Avg cost" value={item.averageCost != null ? `$${item.averageCost.toFixed(2)}` : '—'} />
      </div>

      <div className="grid gap-4 text-sm lg:grid-cols-3">
        <p>
          <span className="text-muted-foreground">Reorder:</span> {item.reorderLevel}
        </p>
        <p>
          <span className="text-muted-foreground">Max stock:</span> {item.maxStock ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">Bin:</span> {item.binLocation ?? '—'}
        </p>
      </div>

      <FormSection title="Stock movements">
        {movementsLoading ? (
          <p className="text-sm text-muted-foreground">Loading movements…</p>
        ) : (movements?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No movements yet.</p>
        ) : (
          <SimpleTable
            columns={[
              { key: 'type', header: 'Type', render: (m: StockMovement) => m.movementType },
              { key: 'qty', header: 'Qty', render: (m: StockMovement) => m.quantity },
              {
                key: 'change',
                header: 'Before → After',
                render: (m: StockMovement) => `${m.quantityBefore} → ${m.quantityAfter}`,
              },
              { key: 'notes', header: 'Notes', render: (m: StockMovement) => m.notes ?? '—' },
              {
                key: 'when',
                header: 'When',
                render: (m: StockMovement) => (m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'),
              },
            ]}
            rows={movements!}
            rowKey={(m) => m.id}
          />
        )}
      </FormSection>

      <FormSection title="Product logs">
        {logsLoading ? (
          <p className="text-sm text-muted-foreground">Loading logs…</p>
        ) : (logs?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No audit logs for this record.</p>
        ) : (
          <SimpleTable
            columns={[
              { key: 'action', header: 'Action', render: (log: ProductLog) => log.action },
              {
                key: 'fields',
                header: 'Fields',
                render: (log: ProductLog) =>
                  log.changedFields?.length ? log.changedFields.map((c) => c.field).join(', ') : '—',
              },
              {
                key: 'when',
                header: 'When',
                render: (log: ProductLog) => (log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'),
              },
            ]}
            rows={logs!}
            rowKey={(log) => log.id}
          />
        )}
      </FormSection>

      <FormDrawer
        open={metaOpen}
        onClose={() => setMetaOpen(false)}
        title="Inventory settings"
        footer={
          <>
            <Button type="submit" form="inv-meta-form" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setMetaOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="inv-meta-form" onSubmit={saveMeta} className="space-y-4">
          <Field label="Reorder level">
            <Input
              type="number"
              min="0"
              value={metaForm.reorderLevel}
              onChange={(e) => setMetaForm({ ...metaForm, reorderLevel: e.target.value })}
            />
          </Field>
          <Field label="Max stock">
            <Input
              type="number"
              min="0"
              value={metaForm.maxStock}
              onChange={(e) => setMetaForm({ ...metaForm, maxStock: e.target.value })}
            />
          </Field>
          <Field label="Bin location">
            <Input value={metaForm.binLocation} onChange={(e) => setMetaForm({ ...metaForm, binLocation: e.target.value })} />
          </Field>
        </form>
      </FormDrawer>

      <FormDrawer
        open={opOpen}
        onClose={() => setOpOpen(false)}
        title="Stock operation"
        subtitle="Changes quantity on this record"
        footer={
          <>
            <Button type="submit" form="inv-op-form" disabled={stockOp.isPending}>
              {stockOp.isPending ? 'Applying…' : 'Apply'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="inv-op-form" onSubmit={submitOp} className="space-y-4">
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
