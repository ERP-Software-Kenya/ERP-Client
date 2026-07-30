import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  StockTransfers as StockTransfersApi,
  Stores as StoresApi,
  Organizations as OrganizationsApi,
  Inventory as InventoryApi,
  Products as ProductsApi,
  Locations as LocationsApi,
  getStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
} from '../api';
import type { InventoryItem, StockTransfer } from '../types';

const STATUS_OPTIONS = ['PENDING', 'Draft', 'In-Transit', 'Received'];

interface CreateForm {
  organizationId: string;
  fromStoreId: string;
  toStoreId: string;
  status: string;
}

interface CompleteForm {
  transferId: string;
  fromInventoryId: string;
  toInventoryId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
}

const EMPTY_CREATE: CreateForm = {
  organizationId: '',
  fromStoreId: '',
  toStoreId: '',
  status: 'PENDING',
};

const EMPTY_COMPLETE: CompleteForm = {
  transferId: '',
  fromInventoryId: '',
  toInventoryId: '',
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: '',
};

function inventoryLabel(item: InventoryItem): string {
  return item.name || `Inventory ${item.id.slice(0, 8)}`;
}

export default function StockTransfers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [completeForm, setCompleteForm] = useState<CompleteForm>(EMPTY_COMPLETE);
  const [lastTransfer, setLastTransfer] = useState<StockTransfer | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState('');
  const [cancelId, setCancelId] = useState('');

  const lookupQuery = useQuery({
    queryKey: ['stock-transfers', activeId],
    queryFn: () => getStockTransfer(activeId),
    enabled: !!activeId,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<StockTransfer>) => StockTransfersApi.create(body),
    onSuccess: (created) => {
      toast.success(`Transfer ${created.transferNumber || created.id} created`);
      setLastTransfer(created);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setLookupId(created.id);
      setActiveId(created.id);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create stock transfer'),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      completeStockTransfer(completeForm.transferId, [
        {
          fromInventoryId: completeForm.fromInventoryId,
          toInventoryId: completeForm.toInventoryId,
          productId: completeForm.productId,
          fromLocationId: completeForm.fromLocationId,
          toLocationId: completeForm.toLocationId,
          quantity: Number(completeForm.quantity),
        },
      ]),
    onSuccess: (updated) => {
      toast.success('Transfer completed');
      setLastTransfer(updated);
      setCompleteOpen(false);
      setCompleteForm(EMPTY_COMPLETE);
      if (activeId === updated.id) setActiveId(updated.id);
    },
    onError: (error: Error) => toast.error(error.message || 'Complete failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelStockTransfer(id),
    onSuccess: (updated) => {
      toast.success('Transfer cancelled');
      setLastTransfer(updated);
      setCancelId('');
      if (activeId === updated.id) setActiveId(updated.id);
    },
    onError: (error: Error) => toast.error(error.message || 'Cancel failed'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.organizationId || !createForm.fromStoreId || !createForm.toStoreId) {
      toast.error('Organization, from store, and to store are required');
      return;
    }
    createMutation.mutate({
      organizationId: createForm.organizationId,
      fromStoreId: createForm.fromStoreId,
      toStoreId: createForm.toStoreId,
      status: createForm.status || undefined,
    });
  };

  const display = lookupQuery.data || lastTransfer;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Stock Transfers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create a transfer header, look up by UUID, complete with one product line, or cancel.
            No list API exists. Create may still fail on some environments — errors will toast.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            New transfer
          </Button>
          <Button
            onClick={() => {
              setCompleteForm((f) => ({
                ...f,
                transferId: activeId || lastTransfer?.id || f.transferId,
              }));
              setCompleteOpen(true);
            }}
          >
            Complete
          </Button>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const id = lookupId.trim();
          if (!id) {
            toast.error('Enter a transfer UUID');
            return;
          }
          setActiveId(id);
        }}
      >
        <div className="min-w-[280px] flex-1">
          <Field label="Look up transfer ID">
            <Input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Paste UUID…"
            />
          </Field>
        </div>
        <Button type="submit" disabled={lookupQuery.isFetching}>
          {lookupQuery.isFetching ? 'Loading…' : 'Look up'}
        </Button>
      </form>

      {lookupQuery.error && activeId && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {(lookupQuery.error as Error).message || 'Lookup failed'}
        </div>
      )}

      {display && (
        <FormSection title="Transfer">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs break-all">{display.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Number</dt>
              <dd>{display.transferNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{display.status || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">From → To</dt>
              <dd className="font-mono text-xs break-all">
                {display.fromStoreId} → {display.toStoreId}
              </dd>
            </div>
          </dl>
        </FormSection>
      )}

      <FormSection title="Cancel transfer">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const id = cancelId.trim() || activeId || lastTransfer?.id || '';
            if (!id) {
              toast.error('Enter a transfer UUID to cancel');
              return;
            }
            cancelMutation.mutate(id);
          }}
        >
          <div className="min-w-[280px] flex-1">
            <Field label="Transfer ID">
              <Input
                value={cancelId}
                onChange={(e) => setCancelId(e.target.value)}
                placeholder={activeId || lastTransfer?.id || 'Paste UUID…'}
              />
            </Field>
          </div>
          <Button type="submit" variant="destructive" disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel transfer'}
          </Button>
        </form>
      </FormSection>

      <FormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Stock Transfer"
        footer={
          <>
            <Button type="submit" form="stock-transfer-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Close
            </Button>
          </>
        }
      >
        <form id="stock-transfer-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Organization" required>
            <ResourceSelect
              queryKey="organizations"
              fetchList={() => OrganizationsApi.list()}
              getLabel={(o) => o.name}
              value={createForm.organizationId}
              onValueChange={(organizationId) => setCreateForm({ ...createForm, organizationId })}
            />
          </Field>
          <Field label="From store" required>
            <ResourceSelect
              queryKey="stores"
              fetchList={() => StoresApi.list()}
              getLabel={(s) => s.name}
              value={createForm.fromStoreId}
              onValueChange={(fromStoreId) => setCreateForm({ ...createForm, fromStoreId })}
            />
          </Field>
          <Field label="To store" required>
            <ResourceSelect
              queryKey="stores"
              fetchList={() => StoresApi.list()}
              getLabel={(s) => s.name}
              value={createForm.toStoreId}
              onValueChange={(toStoreId) => setCreateForm({ ...createForm, toStoreId })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={createForm.status}
              onValueChange={(status) => setCreateForm({ ...createForm, status })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
      </FormDrawer>

      <FormDrawer
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete transfer (one line)"
        footer={
          <>
            <Button
              type="submit"
              form="stock-transfer-complete-form"
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Completing…' : 'Complete'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>
              Close
            </Button>
          </>
        }
      >
        <form
          id="stock-transfer-complete-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = completeForm;
            if (
              !f.transferId ||
              !f.fromInventoryId ||
              !f.toInventoryId ||
              !f.productId ||
              !f.fromLocationId ||
              !f.toLocationId ||
              !f.quantity
            ) {
              toast.error('All complete fields are required');
              return;
            }
            completeMutation.mutate();
          }}
        >
          <Field label="Transfer ID" required>
            <Input
              value={completeForm.transferId}
              onChange={(e) => setCompleteForm({ ...completeForm, transferId: e.target.value })}
              required
            />
          </Field>
          <Field label="From inventory" required>
            <ResourceSelect
              queryKey="inventory"
              fetchList={() => InventoryApi.list()}
              getLabel={inventoryLabel}
              value={completeForm.fromInventoryId}
              onValueChange={(fromInventoryId) => setCompleteForm({ ...completeForm, fromInventoryId })}
            />
          </Field>
          <Field label="To inventory" required>
            <ResourceSelect
              queryKey="inventory"
              fetchList={() => InventoryApi.list()}
              getLabel={inventoryLabel}
              value={completeForm.toInventoryId}
              onValueChange={(toInventoryId) => setCompleteForm({ ...completeForm, toInventoryId })}
            />
          </Field>
          <Field label="Product" required>
            <ResourceSelect
              queryKey="products"
              fetchList={() => ProductsApi.list()}
              getLabel={(p) => p.name || p.id}
              value={completeForm.productId}
              onValueChange={(productId) => setCompleteForm({ ...completeForm, productId })}
            />
          </Field>
          <Field label="From location" required>
            <ResourceSelect
              queryKey="locations"
              fetchList={() => LocationsApi.list()}
              getLabel={(l) => l.name}
              value={completeForm.fromLocationId}
              onValueChange={(fromLocationId) => setCompleteForm({ ...completeForm, fromLocationId })}
            />
          </Field>
          <Field label="To location" required>
            <ResourceSelect
              queryKey="locations"
              fetchList={() => LocationsApi.list()}
              getLabel={(l) => l.name}
              value={completeForm.toLocationId}
              onValueChange={(toLocationId) => setCompleteForm({ ...completeForm, toLocationId })}
            />
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="any"
              value={completeForm.quantity}
              onChange={(e) => setCompleteForm({ ...completeForm, quantity: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
