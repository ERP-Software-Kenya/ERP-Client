import { type ReactNode, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  Clock,
  HelpCircle,
  History,
  Lock,
  Minus,
  PackageSearch,
  Plus,
  RotateCcw,
  ShieldOff,
  Unlock,
  XCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { GuideModal, type GuideStep } from '../../components/GuideModal';
import { Field } from '../../components/FormDrawer';
import { ResourceSelect } from '../../components/ResourceSelect';
import {
  Inventory,
  Locations,
  Products,
  useStockMovementsByInventory,
  useStockOperation,
  get,
} from '../../api';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { useAutoSelectFirst } from '../../hooks/useAutoSelectFirst';
import type { InventoryItem, StockMovement, StockMovementOp, PlatformUser } from '../../types';

const GUIDE_KEY = 'guide-stock-history-v1';

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <PackageSearch size={16} />,
    title: 'Pick an inventory item',
    description: 'Select a product at a location from the dropdown to load its complete movement history.',
  },
  {
    icon: <History size={16} />,
    title: 'Review every change',
    description: 'See before and after quantities for each operation, color-coded by movement type.',
  },
  {
    icon: <Activity size={16} />,
    title: 'Record a new operation',
    description: 'Use the panel below the table to add, remove, adjust, reserve, or write off stock.',
  },
];

type OpDef = {
  op: StockMovementOp;
  label: string;
  icon: ReactNode;
  usesAbsolute?: boolean;
  showCost?: boolean;
  iconColor: string;
  badgeColor: string;
};

const OPS: OpDef[] = [
  {
    op: 'add',
    label: 'Add',
    icon: <Plus size={13} />,
    showCost: true,
    iconColor: 'text-green-600 dark:text-green-400',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    op: 'remove',
    label: 'Remove',
    icon: <Minus size={13} />,
    iconColor: 'text-red-600 dark:text-red-400',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    op: 'adjust',
    label: 'Adjust',
    icon: <RotateCcw size={13} />,
    usesAbsolute: true,
    showCost: true,
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    op: 'reserve',
    label: 'Reserve',
    icon: <Lock size={13} />,
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    op: 'release-reservation',
    label: 'Release',
    icon: <Unlock size={13} />,
    iconColor: 'text-teal-600 dark:text-teal-400',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    op: 'damage',
    label: 'Damage',
    icon: <ShieldOff size={13} />,
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    op: 'write-off',
    label: 'Write Off',
    icon: <XCircle size={13} />,
    iconColor: 'text-rose-700 dark:text-rose-400',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
];

function MovementBadge({ type }: { type: string }) {
  const def = OPS.find((o) => o.op === type);
  const color = def?.badgeColor ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {def?.icon}
      {def?.label ?? type}
    </span>
  );
}

interface OpForm {
  qty: string;
  absoluteQty: string;
  unitCost: string;
  notes: string;
  productUnitId?: string;
  mixedMode: boolean;
  components: Record<string, string>;
}

const EMPTY_OP: OpForm = { qty: '', absoluteQty: '', unitCost: '', notes: '', productUnitId: undefined, mixedMode: false, components: {} };

export default function StockHistoryPage() {
  const [guideOpen, setGuideOpen] = useState(() => !localStorage.getItem(GUIDE_KEY));
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeOp, setActiveOp] = useState<OpDef>(OPS[0]);
  const [opForm, setOpForm] = useState<OpForm>(EMPTY_OP);

  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();
  const { data: inventoryList } = Inventory.useList();
  const { data: selectedProduct } = Products.useGet(selectedProductId || undefined);
  const stockUnits = (selectedProduct?.units ?? []).filter((u) => u.id && u.isActive !== false);

  useAutoSelectFirst(inventoryList, (item: InventoryItem) => {
    setSelectedProductId(item.productId);
    setSelectedLocationId(item.locationId);
  });

  const selectedInventoryId = useMemo(() => {
    if (!selectedProductId || !selectedLocationId) return undefined;
    return inventoryList?.find((i) => i.productId === selectedProductId && i.locationId === selectedLocationId)?.id;
  }, [inventoryList, selectedProductId, selectedLocationId]);

  const { data: movements, isLoading: movLoading, refetch } = useStockMovementsByInventory(
    selectedInventoryId,
  );
  const stockOp = useStockOperation();

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    return m;
  }, [products]);

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    return m;
  }, [locations]);

  const sortedMovements = useMemo(() => {
    let rows = [...(movements ?? [])];
    if (filterType !== 'all') {
      rows = rows.filter((m) => m.movementType === filterType);
    }
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [movements, filterType]);

  const uniqueUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of sortedMovements) {
      if (m.performedById) ids.add(m.performedById);
    }
    return [...ids];
  }, [sortedMovements]);

  const userQueries = useQueries({
    queries: uniqueUserIds.map((id) => ({
      queryKey: ['users', id] as const,
      queryFn: () => get<PlatformUser>(`/api/v1/users/${id}`),
      staleTime: 300_000,
      retry: false,
    })),
  });

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    uniqueUserIds.forEach((id, idx) => {
      const data = userQueries[idx]?.data;
      if (data) {
        const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || id;
        m.set(id, name);
      }
    });
    return m;
  }, [uniqueUserIds, userQueries]);

  const totalMovements = sortedMovements.length;

  const lastMovement = sortedMovements[0]?.createdAt
    ? new Date(sortedMovements[0].createdAt).toLocaleDateString()
    : '—';

  const mostUsedOp = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of sortedMovements) {
      counts.set(m.movementType, (counts.get(m.movementType) ?? 0) + 1);
    }
    let best = '';
    let bestCount = 0;
    for (const [op, count] of counts) {
      if (count > bestCount) { best = op; bestCount = count; }
    }
    return best ? (OPS.find((o) => o.op === best)?.label ?? best) : '—';
  }, [sortedMovements]);

  // We need selectedItem to build the op body; fetch it from inventory list
  const selectedItem = useMemo(
    () => inventoryList?.find((i) => i.id === selectedInventoryId),
    [inventoryList, selectedInventoryId],
  );

  const submitOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) { toast.error('Select an inventory item first'); return; }
    const baseBody = {
      inventoryId: selectedItem.id,
      locationId: selectedItem.locationId,
      productId: selectedItem.productId,
      unitCost: opForm.unitCost ? Number(opForm.unitCost) : undefined,
      notes: opForm.notes || undefined,
    };
    const onSuccess = () => { toast.success(`${activeOp.label} recorded`); setOpForm(EMPTY_OP); void refetch(); };
    const onError = (err: Error) => toast.error(err.message || 'Operation failed');

    if (opForm.mixedMode) {
      const components = stockUnits
        .filter((u) => u.id && opForm.components[u.id] && Number(opForm.components[u.id]) > 0)
        .map((u) => ({ productUnitId: u.id!, quantity: Number(opForm.components[u.id!]) }));
      if (!components.length) { toast.error('Enter at least one quantity'); return; }
      stockOp.mutate({ op: activeOp.op, body: { ...baseBody, quantityComponents: components } }, { onSuccess, onError });
      return;
    }

    if (activeOp.usesAbsolute) {
      if (!opForm.absoluteQty) { toast.error('Absolute quantity is required for Adjust'); return; }
      stockOp.mutate({ op: activeOp.op, body: { ...baseBody, absoluteQuantity: Number(opForm.absoluteQty) } }, { onSuccess, onError });
      return;
    }

    if (!opForm.qty) { toast.error('Quantity is required'); return; }
    stockOp.mutate(
      { op: activeOp.op, body: { ...baseBody, productUnitId: opForm.productUnitId || undefined, quantity: Number(opForm.qty) } },
      { onSuccess, onError },
    );
  };

  return (
    <div className="space-y-5">
      <GuideModal
        open={guideOpen}
        onClose={() => { localStorage.setItem(GUIDE_KEY, '1'); setGuideOpen(false); }}
        title="Welcome to Stock History"
        description="Track every quantity change for any inventory item and record new stock operations."
        steps={GUIDE_STEPS}
        tip="Movement type badges are color-coded — green for adds, red for removes, blue for adjustments."
      />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Stock History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full audit trail of every stock operation.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} className="gap-1.5">
          <HelpCircle size={15} />
          Guide
        </Button>
      </div>

      {/* Dedicated Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Product:</span>
          <div className="w-48">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => productMap.get(p.id) ?? truncateId(p.id)}
              value={selectedProductId}
              onValueChange={(id) => { setSelectedProductId(id); setOpForm(EMPTY_OP); }}
              placeholder="Select product…"
              allowNone
              noneLabel="— Clear product —"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Location:</span>
          <div className="w-48">
            <ResourceSelect
              resource={Locations}
              getLabel={(l) => locationMap.get(l.id) ?? truncateId(l.id)}
              value={selectedLocationId}
              onValueChange={(id) => { setSelectedLocationId(id); setOpForm(EMPTY_OP); }}
              placeholder="Select location…"
              allowNone
              noneLabel="— Clear location —"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Action:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {OPS.map((def) => (
                <SelectItem key={def.op} value={def.op}>
                  {def.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedInventoryId && selectedItem ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Total Movements</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <History size={14} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{totalMovements}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Last Activity</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock size={14} />
                </div>
              </div>
              <p className="mt-2 truncate text-2xl font-bold text-foreground">{lastMovement}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Top Operation</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                  <Activity size={14} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{mostUsedOp}</p>
            </div>
          </div>

          {/* History table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">Movement History</h2>
              <span className="text-xs text-muted-foreground">Newest first</span>
            </div>
            <div className="p-5">
              {movLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : sortedMovements.length === 0 ? (
                <div className="py-8 text-center">
                  <History size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Date & Time', 'Type', 'Qty', 'Before → After', 'Notes', 'By'].map((h) => (
                          <th
                            key={h}
                            className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground last:pr-0"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedMovements.map((m: StockMovement) => (
                        <tr key={m.id} className="transition-colors hover:bg-muted/40">
                          <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                            {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2.5 pr-4">
                            <MovementBadge type={m.movementType} />
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-sm font-medium tabular-nums text-foreground">
                            {m.enteredQuantity && m.selectedUnitSymbolSnapshot
                              ? `${m.enteredQuantity} ${m.selectedUnitSymbolSnapshot} (${m.quantity} base)`
                              : String(m.quantity)}
                          </td>
                          <td className="py-2.5 pr-4 text-xs whitespace-nowrap">
                            <span className="text-muted-foreground">{m.quantityBefore}</span>
                            <span className="mx-1.5 text-muted-foreground/50">→</span>
                            <span className="font-medium text-foreground">{m.quantityAfter}</span>
                          </td>
                          <td className="max-w-[140px] truncate py-2.5 pr-4 text-xs text-muted-foreground">
                            {m.notes ?? '—'}
                          </td>
                          <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {m.performedById ? (userMap.get(m.performedById) ?? '…') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Record operation */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">Record Operation</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {productMap.get(selectedItem.productId) ?? selectedItem.productId}
                {' @ '}
                {locationMap.get(selectedItem.locationId) ?? selectedItem.locationId}
                {' · On hand: '}
                <span className="font-medium text-foreground">{selectedItem.quantityOnHand}</span>
              </p>
            </div>
            <form onSubmit={submitOp} className="space-y-4 p-5">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {OPS.map((def) => (
                  <button
                    key={def.op}
                    type="button"
                    onClick={() => { setActiveOp(def); setOpForm(EMPTY_OP); }}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                      activeOp.op === def.op
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className={activeOp.op === def.op ? 'text-primary' : def.iconColor}>
                      {def.icon}
                    </span>
                    {def.label}
                  </button>
                ))}
              </div>

              {stockUnits.length > 1 && !activeOp.usesAbsolute && (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-xs text-muted-foreground">Enter quantities across multiple units at once</span>
                  <button
                    type="button"
                    onClick={() => setOpForm((prev) => ({ ...prev, mixedMode: !prev.mixedMode, components: {}, productUnitId: undefined }))}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      opForm.mixedMode
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opForm.mixedMode ? 'Mixed units ✓' : 'Mixed units'}
                  </button>
                </div>
              )}

              {opForm.mixedMode ? (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Enter the quantity for each unit. Leave blank or 0 to skip.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {stockUnits.map((u) => (
                      <Field key={u.id} label={`${u.unitName ?? u.unitSymbol ?? u.unitId} (${u.unitSymbol ?? ''})`}>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={opForm.components[u.id!] ?? ''}
                          onChange={(e) => setOpForm((prev) => ({
                            ...prev,
                            components: { ...prev.components, [u.id!]: e.target.value },
                          }))}
                        />
                      </Field>
                    ))}
                    {activeOp.showCost && (
                      <Field label="Unit cost (optional)">
                        <Input type="number" min="0" step="any" placeholder="0.00" value={opForm.unitCost}
                          onChange={(e) => setOpForm((prev) => ({ ...prev, unitCost: e.target.value }))} />
                      </Field>
                    )}
                    <Field label="Notes (optional)">
                      <Input placeholder="Reason or reference…" value={opForm.notes}
                        onChange={(e) => setOpForm((prev) => ({ ...prev, notes: e.target.value }))} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={activeOp.usesAbsolute ? 'Set to quantity (absolute)' : 'Quantity'} required>
                    <Input
                      type="number" min="0" step="any"
                      placeholder={activeOp.usesAbsolute ? 'New total on hand' : 'Amount to change'}
                      value={activeOp.usesAbsolute ? opForm.absoluteQty : opForm.qty}
                      onChange={(e) =>
                        setOpForm((prev) =>
                          activeOp.usesAbsolute ? { ...prev, absoluteQty: e.target.value } : { ...prev, qty: e.target.value },
                        )
                      }
                    />
                  </Field>
                  {activeOp.showCost && (
                    <Field label="Unit cost (optional)">
                      <Input type="number" min="0" step="any" placeholder="0.00" value={opForm.unitCost}
                        onChange={(e) => setOpForm((prev) => ({ ...prev, unitCost: e.target.value }))} />
                    </Field>
                  )}
                  {stockUnits.length > 1 && (
                    <Field label="Unit">
                      <Select
                        value={opForm.productUnitId ?? ''}
                        onValueChange={(v) => setOpForm((prev) => ({ ...prev, productUnitId: v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Base unit (default)" /></SelectTrigger>
                        <SelectContent>
                          {stockUnits.map((u) => (
                            <SelectItem key={u.id!} value={u.id!}>
                              {u.unitName ?? u.unitSymbol ?? u.unitId}
                              {Number(u.conversionFactor) !== 1 ? ` (×${u.conversionFactor})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <div className={activeOp.showCost || stockUnits.length > 1 ? '' : 'sm:col-span-2'}>
                    <Field label="Notes (optional)">
                      <Input placeholder="Reason or reference…" value={opForm.notes}
                        onChange={(e) => setOpForm((prev) => ({ ...prev, notes: e.target.value }))} />
                    </Field>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={stockOp.isPending} className="gap-1.5">
                  {stockOp.isPending ? 'Saving…' : `Record ${activeOp.label}`}
                </Button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <PackageSearch size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {selectedProductId && selectedLocationId ? 'No inventory record found' : 'Selection required'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {selectedProductId && selectedLocationId
              ? 'This product is not currently stocked at the selected location.'
              : 'Select both a Product and a Location above to view movement history.'}
          </p>
        </div>
      )}
    </div>
  );
}
