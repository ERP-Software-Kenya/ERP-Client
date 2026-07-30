import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  StockTransfers,
  Organizations,
  Stores,
  Inventory,
  Locations,
  Products,
  useCompleteStockTransfer,
  useCancelStockTransfer,
} from '../api';

interface CreateForm {
  organizationId: string;
  fromStoreId: string;
  toStoreId: string;
}

interface CompleteLine {
  key: string;
  fromInventoryId: string;
  toInventoryId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
}

const EMPTY_CREATE: CreateForm = { organizationId: '', fromStoreId: '', toStoreId: '' };

function newLine(): CompleteLine {
  return {
    key: crypto.randomUUID(),
    fromInventoryId: '',
    toInventoryId: '',
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: '',
  };
}

export default function StockTransfersPage() {
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [lines, setLines] = useState<CompleteLine[]>([newLine()]);

  const { data: transfer, isLoading, error, refetch } = StockTransfers.useGet(activeId);
  const createMutation = StockTransfers.useCreate();
  const completeMutation = useCompleteStockTransfer();
  const cancelMutation = useCancelStockTransfer();

  const loadTransfer = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a transfer UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.organizationId || !createForm.fromStoreId || !createForm.toStoreId) {
      toast.error('Organization and both stores are required');
      return;
    }
    createMutation.mutate(createForm, {
      onSuccess: (created) => {
        setCreateOpen(false);
        setCreateForm(EMPTY_CREATE);
        setActiveId(created.id);
        setLookupId(created.id);
        toast.success(`Transfer ${created.transferNumber ?? created.id.slice(0, 8)} created`);
      },
    });
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer) return;
    const items = lines
      .filter((l) => l.fromInventoryId && l.toInventoryId && l.productId && l.fromLocationId && l.toLocationId && l.quantity)
      .map((l) => ({
        fromInventoryId: l.fromInventoryId,
        toInventoryId: l.toInventoryId,
        productId: l.productId,
        fromLocationId: l.fromLocationId,
        toLocationId: l.toLocationId,
        quantity: Number(l.quantity),
      }));
    if (items.length === 0) {
      toast.error('Add at least one complete line item');
      return;
    }
    completeMutation.mutate(
      { id: transfer.id, items },
      {
        onSuccess: () => {
          setCompleteOpen(false);
          void refetch();
        },
      },
    );
  };

  const handleCancel = () => {
    if (!transfer) return;
    cancelMutation.mutate(transfer.id, { onSuccess: () => void refetch() });
  };

  const invLabel = (i: { productId: string; locationId: string }) =>
    `${i.productId.slice(0, 8)} @ ${i.locationId.slice(0, 8)}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Stock transfers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and complete transfers by UUID. There is no list/search endpoint — no directory of
          transfers is available.
        </p>
      </div>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
        No list endpoint — look up a transfer by UUID after creating one (or paste a known ID).
      </div>

      <FormSection title="Look up transfer">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Transfer UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadTransfer}>
            Load
          </Button>
          <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
            Create transfer
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Transfer details">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !transfer ? (
            <p className="text-sm text-destructive">Transfer not found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Number:</span> {transfer.transferNumber}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span> {transfer.status ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">From store:</span> {transfer.fromStoreId.slice(0, 8)}…
                </p>
                <p>
                  <span className="text-muted-foreground">To store:</span> {transfer.toStoreId.slice(0, 8)}…
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setLines([newLine()]);
                    setCompleteOpen(true);
                  }}
                  disabled={transfer.status === 'COMPLETED' || transfer.status === 'completed'}
                >
                  Complete transfer
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={
                    cancelMutation.isPending ||
                    transfer.status === 'CANCELLED' ||
                    transfer.status === 'cancelled'
                  }
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel transfer'}
                </Button>
              </div>
            </div>
          )}
        </FormSection>
      )}

      <FormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create stock transfer"
        footer={
          <>
            <Button type="submit" form="transfer-create-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="transfer-create-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Organization" required>
            <ResourceSelect
              resource={Organizations}
              getLabel={(o) => o.name ?? o.id.slice(0, 8)}
              value={createForm.organizationId}
              onValueChange={(v) => setCreateForm({ ...createForm, organizationId: v })}
            />
          </Field>
          <Field label="From store" required>
            <ResourceSelect
              resource={Stores}
              getLabel={(s) => s.name}
              value={createForm.fromStoreId}
              onValueChange={(v) => setCreateForm({ ...createForm, fromStoreId: v })}
            />
          </Field>
          <Field label="To store" required>
            <ResourceSelect
              resource={Stores}
              getLabel={(s) => s.name}
              value={createForm.toStoreId}
              onValueChange={(v) => setCreateForm({ ...createForm, toStoreId: v })}
            />
          </Field>
        </form>
      </FormDrawer>

      <FormDrawer
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete transfer"
        subtitle="One stock movement per line item"
        width={640}
        footer={
          <>
            <Button type="submit" form="transfer-complete-form" disabled={completeMutation.isPending}>
              {completeMutation.isPending ? 'Completing…' : 'Complete'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="transfer-complete-form" onSubmit={handleComplete} className="space-y-4">
          {lines.map((line, idx) => (
            <div key={line.key} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
              <Field label="Product" required>
                <ResourceSelect
                  resource={Products}
                  getLabel={(p) => p.name || p.id.slice(0, 8)}
                  value={line.productId}
                  onValueChange={(productId) => {
                    const next = [...lines];
                    next[idx] = { ...line, productId };
                    setLines(next);
                  }}
                />
              </Field>
              <Field label="From inventory" required>
                <ResourceSelect
                  resource={Inventory}
                  getLabel={invLabel}
                  value={line.fromInventoryId}
                  onValueChange={(fromInventoryId) => {
                    const next = [...lines];
                    next[idx] = { ...line, fromInventoryId };
                    setLines(next);
                  }}
                />
              </Field>
              <Field label="From location" required>
                <ResourceSelect
                  resource={Locations}
                  getLabel={(l) => l.name}
                  value={line.fromLocationId}
                  onValueChange={(fromLocationId) => {
                    const next = [...lines];
                    next[idx] = { ...line, fromLocationId };
                    setLines(next);
                  }}
                />
              </Field>
              <Field label="To inventory" required>
                <ResourceSelect
                  resource={Inventory}
                  getLabel={invLabel}
                  value={line.toInventoryId}
                  onValueChange={(toInventoryId) => {
                    const next = [...lines];
                    next[idx] = { ...line, toInventoryId };
                    setLines(next);
                  }}
                />
              </Field>
              <Field label="To location" required>
                <ResourceSelect
                  resource={Locations}
                  getLabel={(l) => l.name}
                  value={line.toLocationId}
                  onValueChange={(toLocationId) => {
                    const next = [...lines];
                    next[idx] = { ...line, toLocationId };
                    setLines(next);
                  }}
                />
              </Field>
              <Field label="Quantity" required>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, quantity: e.target.value };
                    setLines(next);
                  }}
                />
              </Field>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, newLine()])}>
            <Plus size={15} /> Add line
          </Button>
        </form>
      </FormDrawer>
    </div>
  );
}
