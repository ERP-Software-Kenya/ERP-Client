import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, CheckCircle2, AlertCircle, XCircle, Plus, Trash2, Package } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ResourceSelect } from '../../components/ResourceSelect';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { StockTransfers, Products, Locations, Inventory, useCompleteStockTransfer } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { loadErrorMessage } from '../../lib/api-error';
import type { StockTransfer, Product } from '../../types';

function TransferStatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toUpperCase();
  if (s === 'COMPLETED') return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"><CheckCircle2 size={11} />Completed</span>;
  if (s === 'CANCELLED') return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"><XCircle size={11} />Cancelled</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"><AlertCircle size={11} />Pending</span>;
}

interface TransferLineItem {
  inventoryId: string;
  productId: string;
  productName: string;
  sku?: string;
  availableOnHand: number;
  quantity: number;
}

export default function StockTransfersPage() {
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  
  const [modalOpen, setModalOpen] = useState(false);
  
  // Route selection
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');

  // Staged transfer items (multi-item)
  const [transferItems, setTransferItems] = useState<TransferLineItem[]>([]);

  // Add Item form controls
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<string>('1');

  const { data: locations } = Locations.useList();
  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const { data, isLoading, isError, error, refetch } = StockTransfers.useSearch({
    page, limit: 15, filters: debouncedSearch ? { search: debouncedSearch } : undefined,
  });

  const listError = isError ? loadErrorMessage(error, 'transfers') : null;
  const transferRows = listError ? [] : (data?.items ?? []);
  const total = data?.total ?? 0;

  const createMutation = StockTransfers.useCreate();
  const completeMutation = useCompleteStockTransfer();

  // Load products and source location's inventory
  const { data: products = [] } = Products.useList();
  const { data: sourceInventory = [], isLoading: isInventoryLoading } = Inventory.useList(fromLocationId || undefined);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products ?? []) map.set(p.id, p);
    return map;
  }, [products]);

  // Inventory available at the source location with stock > 0
  const availableInventoryItems = useMemo(() => {
    if (!fromLocationId) return [];
    return (sourceInventory ?? [])
      .filter((inv) => Number(inv.quantityOnHand) > 0)
      .map((inv) => {
        const prod = productMap.get(inv.productId);
        return {
          inventoryId: inv.id,
          productId: inv.productId,
          productName: prod?.name || 'Unknown Product',
          sku: prod?.sku || '',
          availableOnHand: Number(inv.quantityOnHand),
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [sourceInventory, fromLocationId, productMap]);

  // SearchableSelect items derived from the above — label = "Product Name (N available)", sublabel = SKU
  const inventorySearchItems = useMemo(
    () =>
      availableInventoryItems.map((it) => ({
        id: it.inventoryId,
        label: `${it.productName} — ${it.availableOnHand} available`,
        sublabel: it.sku || undefined,
      })),
    [availableInventoryItems],
  );

  // Currently selected item in the "Add Item" dropdown
  const selectedItemToAdd = useMemo(() => {
    return availableInventoryItems.find((it) => it.inventoryId === selectedInventoryId);
  }, [availableInventoryItems, selectedInventoryId]);

  // Calculate remaining stock available to stage for this item
  const stagedQty = useMemo(() => {
    const item = transferItems.find((it) => it.inventoryId === selectedInventoryId);
    return item ? item.quantity : 0;
  }, [transferItems, selectedInventoryId]);

  const remainingAvailable = selectedItemToAdd
    ? Math.max(0, selectedItemToAdd.availableOnHand - stagedQty)
    : 0;

  const totalUnits = useMemo(() => {
    return transferItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [transferItems]);

  const handleClose = () => {
    setModalOpen(false);
    setFromLocationId('');
    setToLocationId('');
    setTransferItems([]);
    setSelectedInventoryId('');
    setAddQuantity('1');
  };

  const handleFromLocationChange = (newLocId: string) => {
    if (newLocId !== fromLocationId) {
      setFromLocationId(newLocId);
      setTransferItems([]);
      setSelectedInventoryId('');
      setAddQuantity('1');
      if (newLocId === toLocationId) {
        setToLocationId('');
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedItemToAdd) {
      toast.error('Please select a product first');
      return;
    }
    const qty = Number(addQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (qty > remainingAvailable) {
      toast.error(`Cannot transfer more than remaining stock (${remainingAvailable} available)`);
      return;
    }

    setTransferItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.inventoryId === selectedItemToAdd.inventoryId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          inventoryId: selectedItemToAdd.inventoryId,
          productId: selectedItemToAdd.productId,
          productName: selectedItemToAdd.productName,
          sku: selectedItemToAdd.sku,
          availableOnHand: selectedItemToAdd.availableOnHand,
          quantity: qty,
        },
      ];
    });

    setSelectedInventoryId('');
    setAddQuantity('1');
  };

  const handleUpdateItemQuantity = (inventoryId: string, newQty: number) => {
    setTransferItems((prev) =>
      prev.map((it) => {
        if (it.inventoryId !== inventoryId) return it;
        const clamped = Math.max(1, Math.min(it.availableOnHand, newQty || 1));
        return { ...it, quantity: clamped };
      })
    );
  };

  const handleRemoveItem = (inventoryId: string) => {
    setTransferItems((prev) => prev.filter((it) => it.inventoryId !== inventoryId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId) {
      toast.error('Both source and destination locations are required');
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error('Source and destination locations cannot be the same');
      return;
    }
    if (transferItems.length === 0) {
      toast.error('Please add at least one item to transfer');
      return;
    }

    for (const item of transferItems) {
      if (item.quantity <= 0) {
        toast.error(`Quantity for "${item.productName}" must be greater than zero`);
        return;
      }
      if (item.quantity > item.availableOnHand) {
        toast.error(`Cannot transfer more than available for "${item.productName}" (max: ${item.availableOnHand})`);
        return;
      }
    }

    const fromLocName = locationMap.get(fromLocationId) || fromLocationId;
    const toLocName = locationMap.get(toLocationId) || toLocationId;

    createMutation.mutate(
      { fromLocationId, toLocationId },
      {
        onSuccess: (created) => {
          completeMutation.mutate(
            {
              id: created.id,
              items: transferItems.map((item) => ({
                fromInventoryId: item.inventoryId,
                productId: item.productId,
                fromLocationId,
                toLocationId,
                quantity: item.quantity,
              })),
            },
            {
              onSuccess: () => {
                toast.success(`Successfully transferred ${totalUnits} units from ${fromLocName} to ${toLocName}`);
                handleClose();
                refetch();
              },
              onError: (err) => {
                toast.error(`Transfer created, but completing items failed: ${err.message}`);
                handleClose();
                refetch();
              },
            }
          );
        },
        onError: (err) => {
          toast.error(`Failed to create transfer: ${err.message}`);
        },
      }
    );
  };

  const columns: Column<StockTransfer>[] = [
    { key: 'transferNumber', label: 'Transfer #', render: (row) => <span className="font-mono font-medium">{row.transferNumber || '—'}</span> },
    { key: 'status', label: 'Status', render: (row) => <TransferStatusBadge status={row.status} /> },
    { key: 'fromLocation', label: 'From Location', render: (row) => locationMap.get(row.fromLocationId) || row.fromLocationId },
    { key: 'toLocation', label: 'To Location', render: (row) => locationMap.get(row.toLocationId) || row.toLocationId },
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
        width={560}
        footer={
          <>
            <Button
              type="submit"
              form="transfer-form"
              disabled={
                createMutation.isPending ||
                completeMutation.isPending ||
                !fromLocationId ||
                !toLocationId ||
                fromLocationId === toLocationId ||
                transferItems.length === 0
              }
            >
              {(createMutation.isPending || completeMutation.isPending)
                ? 'Transferring...'
                : transferItems.length > 0
                  ? `Transfer ${transferItems.length} ${transferItems.length === 1 ? 'Item' : 'Items'}`
                  : 'Transfer Stock'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </>
        }
      >
        <form id="transfer-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Locations */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Route Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Source Location (From)" required>
                  <ResourceSelect 
                    resource={Locations} 
                    getLabel={(l) => l.name} 
                    value={fromLocationId} 
                    onValueChange={handleFromLocationChange} 
                    placeholder="Select source..." 
                  />
                </Field>

                <Field label="Destination Location (To)" required>
                  <ResourceSelect 
                    resource={Locations} 
                    getLabel={(l) => l.name} 
                    value={toLocationId} 
                    onValueChange={setToLocationId} 
                    placeholder="Select destination..." 
                    excludeId={fromLocationId}
                  />
                </Field>
              </div>
            </div>

            {/* Step 2: Add Items */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3.5">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Add Products</h4>
                {fromLocationId && (
                  <span className="text-xs text-muted-foreground">
                    {availableInventoryItems.length} product(s) in stock
                  </span>
                )}
              </div>

              {!fromLocationId ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Select a source location above to see available products.
                </p>
              ) : isInventoryLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading source inventory...</p>
              ) : availableInventoryItems.length === 0 ? (
                <p className="text-xs text-destructive py-2">No stock currently available at this source location.</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Select Product</label>
                    <SearchableSelect
                      items={inventorySearchItems}
                      value={selectedInventoryId}
                      onValueChange={(v) => { setSelectedInventoryId(v); setAddQuantity('1'); }}
                      placeholder="SKU or product name…"
                    />
                  </div>

                  {selectedItemToAdd && (
                    <div className="flex items-end gap-3 pt-1">
                      <div className="w-32">
                        <label className="text-xs font-medium text-foreground block mb-1">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max={remainingAvailable}
                          step="1"
                          value={addQuantity}
                          onChange={(e) => setAddQuantity(e.target.value)}
                          placeholder="1"
                          className="h-9"
                        />
                      </div>
                      <div className="flex-1 pb-1">
                        <span className="text-xs text-muted-foreground">
                          Max available: <strong className="text-primary">{remainingAvailable}</strong>
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddItem}
                        disabled={remainingAvailable <= 0}
                        className="h-9"
                      >
                        <Plus size={14} className="mr-1" /> Add to Transfer
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Staged Items List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  3. Items in this Transfer ({transferItems.length})
                </h4>
                {transferItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTransferItems([])}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove all
                  </button>
                )}
              </div>

              {transferItems.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground space-y-1">
                  <Package className="mx-auto h-6 w-6 text-muted-foreground/60 mb-1" />
                  <p className="font-medium text-foreground">No items added yet</p>
                  <p>Choose a product above and click "Add to Transfer" to include it.</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden max-h-64 overflow-y-auto bg-card">
                  {transferItems.map((item) => (
                    <div key={item.inventoryId} className="flex items-center justify-between p-3 gap-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.productName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.sku && <span>•</span>}
                          <span>Available: <strong className="text-primary">{item.availableOnHand}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Qty:</span>
                          <Input
                            type="number"
                            min="1"
                            max={item.availableOnHand}
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQuantity(item.inventoryId, Number(e.target.value))}
                            className="h-8 w-20 text-center font-semibold"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.inventoryId)}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {transferItems.length > 0 && (
                <div className="bg-muted/40 rounded-lg p-3 flex justify-between items-center text-xs font-medium">
                  <span className="text-muted-foreground">Total to move:</span>
                  <span className="text-sm font-bold text-foreground">
                    {totalUnits} units across {transferItems.length} {transferItems.length === 1 ? 'product' : 'products'}
                  </span>
                </div>
              )}
            </div>
          </form>
      </FormDrawer>
    </div>
  );
}
