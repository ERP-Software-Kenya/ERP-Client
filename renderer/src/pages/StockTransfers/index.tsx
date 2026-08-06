import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { StockTransfers, Products, Locations, Inventory, useCompleteStockTransfer } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { StockTransfer } from '../../types';

function TransferStatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toUpperCase();
  if (s === 'COMPLETED') return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"><CheckCircle2 size={11} />Completed</span>;
  if (s === 'CANCELLED') return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"><XCircle size={11} />Cancelled</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"><AlertCircle size={11} />Pending</span>;
}

export default function StockTransfersPage() {
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  
  // Modal State
  const [productId, setProductId] = useState<string>('');
  const [fromInventoryId, setFromInventoryId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');

  const { data: locations } = Locations.useList();
  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const { data, isLoading, isError, error, refetch } = StockTransfers.useSearch({
    page, limit: 15, filters: debouncedSearch ? { search: debouncedSearch } : undefined,
  });

  const listError = isError ? `Unable to load transfers.${error instanceof Error && error.message ? ` (${error.message})` : ''}` : null;
  const transferRows = listError ? [] : (data?.items ?? []);
  const total = data?.total ?? 0;

  const createMutation = StockTransfers.useCreate();
  const completeMutation = useCompleteStockTransfer();

  const { data: availableInventory } = Inventory.useByProduct(productId);
  
  const selectedInventory = availableInventory?.find(i => i.id === fromInventoryId);
  const maxQty = selectedInventory ? Number(selectedInventory.quantityOnHand) : 0;

  const handleClose = () => {
    setModalOpen(false);
    setTimeout(() => {
      setSuccessMode(false);
      setProductId('');
      setFromInventoryId('');
      setToLocationId('');
      setQuantity('');
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !fromInventoryId || !toLocationId || !quantity) {
      toast.error('All fields are required');
      return;
    }
    const qtyNum = Number(quantity);
    if (qtyNum <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (qtyNum > maxQty) {
      toast.error(`Cannot transfer more than available (${maxQty})`);
      return;
    }
    if (selectedInventory?.locationId === toLocationId) {
      toast.error('Source and destination locations cannot be the same');
      return;
    }

    createMutation.mutate(
      { fromLocationId: selectedInventory!.locationId, toLocationId },
      {
        onSuccess: (created) => {
          completeMutation.mutate(
            {
              id: created.id,
              items: [{
                fromInventoryId,
                // NEEDS BACKEND: resolve/create the destination inventory row server-side —
                // see docs/superpowers/plans/2026-08-04-backend-requirements.md. Omitted here
                // rather than guessed, since the target location may never have held this
                // product before (no inventory row id exists yet on the client).
                productId,
                fromLocationId: selectedInventory!.locationId,
                toLocationId,
                quantity: qtyNum,
              }]
            },
            {
              onSuccess: () => {
                setSuccessMode(true);
                refetch();
                // Optionally close after a delay
                setTimeout(handleClose, 2000);
              },
              onError: (err) => {
                toast.error(`Header created but items failed: ${err.message}`);
                handleClose();
                refetch();
              }
            }
          );
        },
      }
    );
  };

  const columns: Column<StockTransfer>[] = [
    { key: 'transferNumber', label: 'Transfer #', render: (row) => row.transferNumber || '—' },
    { key: 'status', label: 'Status', render: (row) => <TransferStatusBadge status={row.status} /> },
    { key: 'fromLocation', label: 'From', render: (row) => locationMap.get(row.fromLocationId) || row.fromLocationId },
    { key: 'toLocation', label: 'To', render: (row) => locationMap.get(row.toLocationId) || row.toLocationId },
  ];

  return (
    <div className="flex h-full flex-col">
      <DataTable
        title="Stock Transfers"
        description="History of all stock transfers."
        columns={columns}
        rows={transferRows}
        total={total}
        page={page}
        loading={isLoading}
        error={listError}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={refetch}
        toolbar={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <ArrowLeftRight size={15} className="mr-1.5" /> New Transfer
          </Button>
        }
      />

      <FormDrawer
        open={modalOpen}
        onClose={handleClose}
        title="New Stock Transfer"
        width={500}
        footer={!successMode && (
          <>
            <Button type="submit" form="transfer-form" disabled={createMutation.isPending || completeMutation.isPending}>
              {(createMutation.isPending || completeMutation.isPending) ? 'Transferring...' : 'Transfer Stock'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </>
        )}
      >
        {successMode ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6 shadow-sm">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-foreground">Transfer Successful</h3>
            <p className="mt-2 text-sm text-muted-foreground">Stock has been successfully moved to the destination.</p>
          </div>
        ) : (
          <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
            <Field label="1. Select Product" required>
              <ResourceSelect 
                resource={Products} 
                getLabel={(p) => p.name || 'Unknown'} 
                value={productId} 
                onValueChange={(v) => { setProductId(v); setFromInventoryId(''); setQuantity(''); }} 
                placeholder="Search products..." 
              />
            </Field>

            {productId && (
              <Field label="2. Source Inventory" required>
                <div className="space-y-2">
                  {!availableInventory ? (
                    <p className="text-xs text-muted-foreground">Loading inventory...</p>
                  ) : availableInventory.length === 0 ? (
                    <p className="text-xs text-destructive">No inventory available for this product.</p>
                  ) : (
                    availableInventory.map(inv => {
                      const locName = locationMap.get(inv.locationId) || inv.locationId;
                      return (
                        <div 
                          key={inv.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${fromInventoryId === inv.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                          onClick={() => setFromInventoryId(inv.id)}
                        >
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-foreground">{locName}</span>
                            <span className="text-primary font-semibold">{inv.quantityOnHand} available</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Field>
            )}

            {fromInventoryId && (
              <>
                <Field label="3. Destination Location" required>
                  <ResourceSelect 
                    resource={Locations} 
                    getLabel={(l) => l.name} 
                    value={toLocationId} 
                    onValueChange={setToLocationId} 
                    placeholder="Select destination warehouse..." 
                  />
                </Field>
                
                <Field label="4. Quantity to Move" required hint={`Max available: ${maxQty}`}>
                  <Input 
                    type="number" 
                    min="1" 
                    max={maxQty} 
                    step="1"
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="0"
                  />
                </Field>
              </>
            )}
          </form>
        )}
      </FormDrawer>
    </div>
  );
}
