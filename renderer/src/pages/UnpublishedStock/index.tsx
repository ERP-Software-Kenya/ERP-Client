import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  DollarSign,
  HelpCircle,
  ListTree,
  Loader2,
  Lock,
  MousePointerClick,
  Package,
  PackagePlus,
  Send,
  ShoppingCart,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react';
import { GuideModal, type GuideStep } from '../../components/GuideModal';
import { ResourceSelect } from '../../components/ResourceSelect';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DataTable, type Column } from '../../components/DataTable';
import { FilterDropdown } from '../../components/FilterDropdown';
import {
  Inventory,
  Locations,
  Products,
  useUnpublishedStockList,
  useUnpublishedStock,
  useUnpublishedStockMovements,
  useAddUnpublishedStock,
  usePublishUnpublishedStock,
  get,
} from '../../api';
import { useSession } from '../../context/SessionContext';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel } from '../../lib/entityLabel';
import { cn } from '../../lib/utils';
import type { UnpublishedStock, UnpublishedStockMovement, PlatformUser } from '../../types';

const GUIDE_KEY = 'guide-unpublished-stock-v2';

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <PackagePlus size={16} />,
    title: 'Add staging stock',
    description: 'Fill in the product, location, and quantity. The stock is staged for review — not yet live.',
  },
  {
    icon: <ChevronRight size={16} />,
    title: 'Select a record from the list',
    description: 'All unpublished records appear on the right. See side-by-side Black and White stock levels.',
  },
  {
    icon: <Send size={16} />,
    title: 'Publish to live inventory',
    description: 'Confirm the quantity to transfer from Black Staging into White Live inventory with real-time balance simulation.',
  },
];

const MOVEMENT_COLORS: Record<string, string> = {
  add: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  remove: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  publish: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  adjust: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function MovementBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/-/g, '_');
  const color = MOVEMENT_COLORS[key] ?? MOVEMENT_COLORS[type.toLowerCase()] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {type}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-left">
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded-lg p-1.5 ${colorClass}`}>{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

interface AddForm {
  productId: string;
  locationId: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

interface PublishForm {
  quantity: string;
  notes: string;
}

interface LastAdded {
  productId: string;
  locationId: string;
  quantity: number;
}

const EMPTY_ADD: AddForm = { productId: '', locationId: '', quantity: '', unitCost: '', notes: '' };
const EMPTY_PUBLISH: PublishForm = { quantity: '', notes: '' };

type PageTab = 'workflow' | 'browse';

export default function UnpublishedStockPage() {
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(() => !localStorage.getItem(GUIDE_KEY));
  const [activeTab, setActiveTab] = useState<PageTab>('workflow');

  // Session & location scoping
  const { raw, isOrgAdmin, isSuperAdmin } = useSession();
  const hasOrgWideAccess = Boolean(raw?.hasOrgWideAccess ?? (isOrgAdmin || isSuperAdmin));
  const assignedLocationId = raw?.locationIds?.[0] || raw?.branchId;

  const [addForm, setAddForm] = useState<AddForm>(() => ({
    ...EMPTY_ADD,
    locationId: !hasOrgWideAccess && assignedLocationId ? assignedLocationId : '',
  }));
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);

  const [filterLocationId, setFilterLocationId] = useState<string>(() =>
    !hasOrgWideAccess && assignedLocationId ? assignedLocationId : '',
  );
  const [filterProductId, setFilterProductId] = useState('');

  const [activeId, setActiveId] = useState<string | undefined>();
  const [publishForm, setPublishForm] = useState<PublishForm>(EMPTY_PUBLISH);
  const [showHistory, setShowHistory] = useState(false);

  // Sync assignedLocationId if it loads after initial render for single-location users
  useEffect(() => {
    if (!hasOrgWideAccess && assignedLocationId) {
      setAddForm((prev) => (prev.locationId ? prev : { ...prev, locationId: assignedLocationId }));
      setFilterLocationId((prev) => prev || assignedLocationId);
      setBrowseLocationId((prev) => prev || assignedLocationId);
    }
  }, [hasOrgWideAccess, assignedLocationId]);

  // Scoped queries:
  // For single-location users, ALWAYS pass assignedLocationId to avoid backend 403 LocationAccessDeniedException.
  const queryLocationId = hasOrgWideAccess ? undefined : (assignedLocationId || undefined);
  const { data: whiteStockItems } = Inventory.useList(queryLocationId);

  // Effective location for workflow list
  const effectiveWorkflowLocationId = hasOrgWideAccess ? (filterLocationId || undefined) : (assignedLocationId || undefined);
  const { data: stagingList, isLoading: listLoading } = useUnpublishedStockList({
    locationId: effectiveWorkflowLocationId,
    productId: filterProductId || undefined,
  });

  const { data: record, isLoading: recordLoading } = useUnpublishedStock(activeId);
  const { data: movements, isLoading: movLoading } = useUnpublishedStockMovements(activeId);
  const addMutation = useAddUnpublishedStock();
  const publishMutation = usePublishUnpublishedStock();

  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();

  // Full list for Browse All tab — scoped to assigned location if not org-wide
  const { data: allStock, isLoading: allStockLoading } = useUnpublishedStockList(
    hasOrgWideAccess ? undefined : (assignedLocationId ? { locationId: assignedLocationId } : undefined),
  );

  const {
    page: browsePage,
    setPage: setBrowsePage,
    setSearch: setBrowseSearch,
    debouncedSearch: browseSearch,
  } = usePagination();

  const [browseLocationId, setBrowseLocationId] = useState<string>(() =>
    !hasOrgWideAccess && assignedLocationId ? assignedLocationId : '',
  );

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, p.name);
    return m;
  }, [products]);

  const productSearchItems = useMemo(
    () =>
      (products ?? []).map((p) => ({
        id: p.id,
        label: p.name ?? p.id,
        sublabel: p.sku ?? undefined,
      })),
    [products],
  );

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const locationOptions = useMemo(() => {
    if (!hasOrgWideAccess && assignedLocationId) {
      const loc = (locations ?? []).find((l) => l.id === assignedLocationId);
      return loc ? [{ value: loc.id, label: loc.name ?? loc.id }] : [];
    }
    return (locations ?? []).map((l) => ({ value: l.id, label: l.name ?? l.id }));
  }, [hasOrgWideAccess, assignedLocationId, locations]);

  // Lookup map: `${locationId}:${productId}` -> white QuantityOnHand
  const whiteStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of whiteStockItems ?? []) {
      map.set(`${item.locationId}:${item.productId}`, Number(item.quantityOnHand || 0));
    }
    return map;
  }, [whiteStockItems]);

  const getWhiteStock = (productId: string, locationId: string): number => {
    return whiteStockMap.get(`${locationId}:${productId}`) ?? 0;
  };

  const browseFiltered = useMemo(() => {
    const term = browseSearch.trim().toLowerCase();
    const effectiveLoc = hasOrgWideAccess ? browseLocationId : (assignedLocationId || browseLocationId);
    return (allStock ?? []).filter((item) => {
      if (effectiveLoc && item.locationId !== effectiveLoc) return false;
      if (!term) return true;
      const productName = (productMap.get(item.productId) ?? '').toLowerCase();
      const locationName = (locationMap.get(item.locationId) ?? '').toLowerCase();
      return productName.includes(term) || locationName.includes(term);
    });
  }, [allStock, browseLocationId, browseSearch, productMap, locationMap, hasOrgWideAccess, assignedLocationId]);

  const BROWSE_PAGE_SIZE = 15;
  const browsePageRows = useMemo(
    () => browseFiltered.slice((browsePage - 1) * BROWSE_PAGE_SIZE, browsePage * BROWSE_PAGE_SIZE),
    [browseFiltered, browsePage],
  );

  const browseTotals = useMemo(() => {
    const items = browseFiltered;
    return items.reduce(
      (acc, item) => {
        const blackQty = Number(item.quantityOnHand || 0);
        const whiteQty = getWhiteStock(item.productId, item.locationId);
        const avgCost = Number(item.averageCost || 0);
        return {
          blackQuantity: acc.blackQuantity + blackQty,
          whiteQuantity: acc.whiteQuantity + whiteQty,
          totalQuantity: acc.totalQuantity + blackQty + whiteQty,
          value: acc.value + blackQty * avgCost,
        };
      },
      { blackQuantity: 0, whiteQuantity: 0, totalQuantity: 0, value: 0 },
    );
  }, [browseFiltered, whiteStockMap]);

  const browseColumns: Column<UnpublishedStock>[] = [
    {
      key: 'productId',
      label: 'Product',
      render: (r) => (
        <span className="font-medium">
          {productMap.get(r.productId) ?? formatEntityLabel({ id: r.productId })}
        </span>
      ),
    },
    {
      key: 'locationId',
      label: 'Location',
      render: (r) => (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {locationMap.get(r.locationId) ?? formatEntityLabel({ id: r.locationId })}
          {!hasOrgWideAccess && r.locationId === assignedLocationId && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              My Branch
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'quantityOnHand',
      label: 'Black Stock',
      render: (r) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-100 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
          title="Segregated / Staged Black Stock"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {Number(r.quantityOnHand || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'whiteStock',
      label: 'White Stock',
      render: (r) => {
        const whiteQty = getWhiteStock(r.productId, r.locationId);
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
            title="Published / Live White Inventory"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {whiteQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'totalStock',
      label: 'Total Stock',
      render: (r) => {
        const whiteQty = getWhiteStock(r.productId, r.locationId);
        const total = Number(r.quantityOnHand || 0) + whiteQty;
        return (
          <span className="font-mono text-sm font-bold text-foreground">
            {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'averageCost',
      label: 'Avg Cost',
      render: (r) => (r.averageCost != null ? `KSh ${Number(r.averageCost).toFixed(2)}` : '—'),
    },
    {
      key: 'value',
      label: 'Staged Value',
      render: (r) =>
        `KSh ${(Number(r.quantityOnHand || 0) * Number(r.averageCost || 0)).toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}`,
    },
    { key: 'binLocation', label: 'Bin', render: (r) => r.binLocation || '—' },
  ];

  const handleBrowseView = (item: UnpublishedStock) => {
    setActiveTab('workflow');
    handleSelectRecord(item);
  };

  const sortedMovements = useMemo(() => {
    const rows = [...(movements ?? [])];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [movements]);

  const uniqueUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of sortedMovements) if (m.performedById) ids.add(m.performedById);
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

  const effectiveAddLocationId = hasOrgWideAccess ? addForm.locationId : (assignedLocationId || addForm.locationId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.productId || !effectiveAddLocationId || !addForm.quantity) {
      toast.error('Product, location, and quantity are required');
      return;
    }
    const qty = Number(addForm.quantity);
    addMutation.mutate(
      {
        productId: addForm.productId,
        locationId: effectiveAddLocationId,
        quantity: qty,
        unitCost: addForm.unitCost ? Number(addForm.unitCost) : undefined,
        notes: addForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setLastAdded({ productId: addForm.productId, locationId: effectiveAddLocationId, quantity: qty });
          setPublishForm({ quantity: String(qty), notes: '' });
          setAddForm({
            ...EMPTY_ADD,
            locationId: !hasOrgWideAccess && assignedLocationId ? assignedLocationId : '',
          });
          toast.success('Staging stock added — select it from the list on the right to publish');
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to add staging stock'),
      },
    );
  };

  const handleSelectRecord = (item: UnpublishedStock) => {
    setActiveId(item.id);
    setPublishForm({ quantity: String(item.quantityOnHand), notes: '' });
    setShowHistory(false);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) {
      toast.error('Select a record first');
      return;
    }
    const qty = Number(publishForm.quantity || record.quantityOnHand);
    if (!qty || Number.isNaN(qty)) {
      toast.error('Quantity is required');
      return;
    }
    publishMutation.mutate(
      { unpublishedStockId: record.id, quantity: qty, notes: publishForm.notes || undefined },
      {
        onSuccess: () => {
          toast.success('Published to live inventory');
          setPublishForm(EMPTY_PUBLISH);
          setLastAdded(null);
          setActiveId(undefined);
          setShowHistory(false);
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to publish'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <GuideModal
        open={guideOpen}
        onClose={() => {
          localStorage.setItem(GUIDE_KEY, '1');
          setGuideOpen(false);
        }}
        title="Welcome to Unpublished Stock"
        description="Stage stock for review and track side-by-side Black and White stock balances before publishing."
        steps={GUIDE_STEPS}
        tip="Staged Black stock remains segregated from public POS until published to White live inventory."
      />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Black Inventory</h1>
            {!hasOrgWideAccess && assignedLocationId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Lock size={11} />
                {locationMap.get(assignedLocationId) || 'Assigned Branch'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage stock for review and monitor side-by-side Black (staging) and White (live) inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate('/pos/black-sale')} className="gap-1.5">
            <ShoppingCart size={15} />
            Sell Black Stock
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} className="gap-1.5">
            <HelpCircle size={15} />
            Guide
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 self-start rounded-xl bg-muted p-1">
        {[
          { id: 'workflow' as const, icon: Workflow, label: 'Add & Publish' },
          { id: 'browse' as const, icon: ListTree, label: 'Browse All' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
              activeTab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Stat cards - Side by side breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Boxes size={18} />}
              label="Black Stock (Staged)"
              value={browseTotals.blackQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              colorClass="bg-zinc-800 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-100"
            />
            <StatCard
              icon={<Package size={18} />}
              label="White Stock (Live)"
              value={browseTotals.whiteQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              colorClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<CheckCircle2 size={18} />}
              label="Total Physical Stock"
              value={browseTotals.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              colorClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<DollarSign size={18} />}
              label="Staging Value"
              value={`KSh ${browseTotals.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              colorClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {hasOrgWideAccess ? (
              <FilterDropdown
                label="Location"
                options={locationOptions}
                value={browseLocationId || null}
                onChange={(v) => {
                  setBrowseLocationId(v ?? '');
                  setBrowsePage(1);
                }}
                searchable
              />
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span>📍 Branch Scope:</span>
                <span className="font-semibold text-foreground">
                  {locationMap.get(assignedLocationId ?? '') || 'Assigned Branch'}
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Locked</span>
              </div>
            )}
          </div>

          <DataTable
            title=""
            columns={browseColumns}
            rows={browsePageRows}
            total={browseFiltered.length}
            page={browsePage}
            loading={allStockLoading}
            onPageChange={setBrowsePage}
            onSearchChange={(s) => {
              setBrowseSearch(s);
              setBrowsePage(1);
            }}
            onRefetch={() => void 0}
            onView={handleBrowseView}
            onAdd={() => setActiveTab('workflow')}
            addLabel="Add to Staging"
            searchPlaceholder="Search by product or location…"
            limit={BROWSE_PAGE_SIZE}
          />
        </div>
      )}

      {/* Two-column layout */}
      {activeTab === 'workflow' && (
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          {/* ─── Left: Add Staging Stock ─── */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <PackagePlus size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Step 1 — Add Staging Stock</p>
                  <p className="text-xs text-muted-foreground">Stage new stock without making it live</p>
                </div>
              </div>

              <form onSubmit={handleAdd} className="space-y-4 p-5">
                <Field label="Product" required>
                  <SearchableSelect
                    items={productSearchItems}
                    value={addForm.productId}
                    onValueChange={(v) => setAddForm({ ...addForm, productId: v })}
                    placeholder="SKU or product name…"
                  />
                </Field>

                <Field label="Location" required>
                  {hasOrgWideAccess ? (
                    <ResourceSelect
                      resource={Locations}
                      getLabel={(l) => l.name}
                      value={addForm.locationId}
                      onValueChange={(v) => setAddForm({ ...addForm, locationId: v })}
                    />
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                      <span className="font-medium">{locationMap.get(assignedLocationId ?? '') || 'Your Branch'}</span>
                      <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Lock size={10} /> Locked to your branch
                      </span>
                    </div>
                  )}
                </Field>

                {/* Real-time Side-by-side Stock Indicator for selected Product + Location */}
                {addForm.productId && effectiveAddLocationId && (
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Current stock at {locationMap.get(effectiveAddLocationId) ?? 'selected location'}:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-zinc-900 p-2 text-zinc-100 dark:bg-zinc-800">
                        <p className="text-[10px] text-zinc-400">Black (Staged)</p>
                        <p className="font-mono text-sm font-bold text-white">
                          {(() => {
                            const stagedItem = (allStock ?? []).find(
                              (s) => s.productId === addForm.productId && s.locationId === effectiveAddLocationId,
                            );
                            return Number(stagedItem?.quantityOnHand || 0).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            });
                          })()}
                        </p>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-2 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">White (Live)</p>
                        <p className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                          {getWhiteStock(addForm.productId, effectiveAddLocationId).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-2 text-foreground">
                        <p className="text-[10px] text-muted-foreground">Total Physical</p>
                        <p className="font-mono text-sm font-bold">
                          {(() => {
                            const stagedItem = (allStock ?? []).find(
                              (s) => s.productId === addForm.productId && s.locationId === effectiveAddLocationId,
                            );
                            const black = Number(stagedItem?.quantityOnHand || 0);
                            const white = getWhiteStock(addForm.productId, effectiveAddLocationId);
                            return (black + white).toLocaleString(undefined, { maximumFractionDigits: 2 });
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantity" required>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={addForm.quantity}
                      onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    />
                  </Field>
                  <Field label="Unit cost">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={addForm.unitCost}
                      onChange={(e) => setAddForm({ ...addForm, unitCost: e.target.value })}
                    />
                  </Field>
                </div>

                <Field label="Notes">
                  <Input
                    placeholder="e.g. Received from supplier"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  />
                </Field>

                <Button type="submit" disabled={addMutation.isPending} className="w-full gap-1.5">
                  {addMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <PackagePlus size={14} />
                      Add to staging
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Success hint after add */}
            {lastAdded && (
              <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/8 p-4">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-foreground">
                    Staged {lastAdded.quantity} ×{' '}
                    {productMap.get(lastAdded.productId) ?? formatEntityLabel({ id: lastAdded.productId })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    at {locationMap.get(lastAdded.locationId) ?? formatEntityLabel({ id: lastAdded.locationId })}
                  </p>
                  <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                    → Select it from the list on the right to publish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLastAdded(null)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* ─── Right: Browse + Publish ─── */}
          <div className="flex flex-col gap-4">
            {/* Step 2 — Staging Records List */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-blue-500/10 to-transparent px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <ChevronRight size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Step 2 — Select a Record</p>
                    <p className="text-xs text-muted-foreground">Click any row to review side-by-side stock and publish</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!hasOrgWideAccess && assignedLocationId && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      📍 {locationMap.get(assignedLocationId) || 'Assigned Branch'}
                    </span>
                  )}
                  {stagingList && stagingList.length > 0 && (
                    <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {stagingList.length} record{stagingList.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-3 border-b border-border px-5 py-3">
                <div className="flex-1">
                  <SearchableSelect
                    items={productSearchItems}
                    value={filterProductId}
                    onValueChange={setFilterProductId}
                    placeholder="Filter by product…"
                  />
                </div>
                <div className="flex-1">
                  {hasOrgWideAccess ? (
                    <ResourceSelect
                      resource={Locations}
                      getLabel={(l) => l.name}
                      value={filterLocationId}
                      onValueChange={setFilterLocationId}
                      placeholder="Filter by location…"
                    />
                  ) : (
                    <div className="flex h-10 items-center justify-between rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
                      <span>{locationMap.get(assignedLocationId ?? '') || 'Your Branch'}</span>
                      <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Lock size={10} /> Your Store
                      </span>
                    </div>
                  )}
                </div>
                {(filterProductId || (hasOrgWideAccess && filterLocationId)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterProductId('');
                      if (hasOrgWideAccess) setFilterLocationId('');
                    }}
                    className="shrink-0 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Click-to-publish hint */}
              {!listLoading && stagingList && stagingList.length > 0 && !activeId && (
                <div className="flex items-center gap-2 border-b border-border bg-blue-500/5 px-5 py-2">
                  <MousePointerClick size={13} className="shrink-0 text-blue-500" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Click a row below to compare stock and open publishing options
                  </p>
                </div>
              )}

              {/* List body */}
              <div className="max-h-72 overflow-y-auto">
                {listLoading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : !stagingList || stagingList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm font-medium text-muted-foreground">No staging records found</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">Add stock on the left to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {stagingList.map((item: UnpublishedStock) => {
                      const isSelected = item.id === activeId;
                      const whiteQty = getWhiteStock(item.productId, item.locationId);
                      const totalQty = Number(item.quantityOnHand || 0) + whiteQty;
                      return (
                        <div
                          key={item.id}
                          className={`flex w-full items-center transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/8 ring-1 ring-inset ring-primary/30' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectRecord(item)}
                            className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-5 pr-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {productMap.get(item.productId) ?? formatEntityLabel({ id: item.productId })}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {locationMap.get(item.locationId) ?? formatEntityLabel({ id: item.locationId })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span
                                  className="inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-100 shadow-sm dark:bg-zinc-800"
                                  title="Black Stock (Staged)"
                                >
                                  <span className="h-1 w-1 rounded-full bg-amber-400" />
                                  B: {Number(item.quantityOnHand).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span
                                  className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
                                  title="White Stock (Live)"
                                >
                                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                                  W: {whiteQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                Total: <strong className="font-semibold text-foreground">{totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2 py-3 pl-2 pr-5">
                            <button
                              type="button"
                              title="Copy record ID"
                              onClick={() => {
                                void navigator.clipboard.writeText(item.id);
                                toast.success('Record ID copied');
                              }}
                              className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Copy size={12} />
                            </button>
                            {isSelected && <CheckCircle2 size={14} className="shrink-0 text-primary" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 — Publish (shown when a record is selected) */}
            {activeId && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-green-500/10 to-transparent px-5 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15 text-green-600 dark:text-green-400">
                    <Send size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Step 3 — Publish to Inventory</p>
                    <p className="text-xs text-muted-foreground">Review side-by-side stock impact and publish</p>
                  </div>
                  <button
                    type="button"
                    title="Close"
                    onClick={() => {
                      setActiveId(undefined);
                      setPublishForm(EMPTY_PUBLISH);
                      setShowHistory(false);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X size={15} />
                  </button>
                </div>

                {recordLoading ? (
                  <div className="space-y-2 p-5">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : record ? (
                  <div className="space-y-5 p-5">
                    {/* Side-by-side Stock & Transfer Impact Simulation */}
                    {(() => {
                      const currentBlack = Number(record.quantityOnHand || 0);
                      const currentWhite = getWhiteStock(record.productId, record.locationId);
                      const totalPhysical = currentBlack + currentWhite;
                      const pubQty = Number(publishForm.quantity || 0);
                      const validPub = !Number.isNaN(pubQty) && pubQty > 0 && pubQty <= currentBlack;
                      const afterBlack = validPub ? currentBlack - pubQty : currentBlack;
                      const afterWhite = validPub ? currentWhite + pubQty : currentWhite;

                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                              <p className="text-xs text-muted-foreground">Product</p>
                              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                                {productMap.get(record.productId) ?? formatEntityLabel({ id: record.productId })}
                              </p>
                            </div>
                            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                                {locationMap.get(record.locationId) ?? formatEntityLabel({ id: record.locationId })}
                              </p>
                            </div>
                          </div>

                          {/* Side-by-Side Comparison & Simulation Cards */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Left: Black Stock Pool */}
                            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900 p-3 text-zinc-100 shadow-sm dark:bg-zinc-800">
                              <div className="flex items-center justify-between text-xs text-zinc-300">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                                  Black Stock (Staging)
                                </span>
                              </div>
                              <div className="mt-2 flex items-baseline justify-between">
                                <span className="font-mono text-2xl font-bold text-white">
                                  {currentBlack.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                {validPub && (
                                  <span className="font-mono text-xs text-amber-400">
                                    -{pubQty} → {afterBlack.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-zinc-400">
                                Avg cost:{' '}
                                {record.averageCost != null ? `KSh ${Number(record.averageCost).toFixed(2)}` : '—'}
                              </p>
                            </div>

                            {/* Right: White Stock Pool */}
                            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-blue-900 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
                              <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  White Stock (Live ERP)
                                </span>
                              </div>
                              <div className="mt-2 flex items-baseline justify-between">
                                <span className="font-mono text-2xl font-bold text-blue-950 dark:text-blue-100">
                                  {currentWhite.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                {validPub && (
                                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-300">
                                    +{pubQty} → {afterWhite.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-blue-600/80 dark:text-blue-400">
                                Total Physical: <strong>{totalPhysical.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                              </p>
                            </div>
                          </div>

                          {validPub && (
                            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
                              <span>Publishing will transfer {pubQty} units into Live Stock</span>
                              <span className="font-mono font-medium text-foreground">
                                Total Physical: {totalPhysical.toLocaleString(undefined, { maximumFractionDigits: 2 })} (Conserved)
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Publish form */}
                    <form onSubmit={handlePublish} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Quantity to publish" required>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={publishForm.quantity || String(record.quantityOnHand ?? '')}
                            onChange={(e) => setPublishForm({ ...publishForm, quantity: e.target.value })}
                          />
                        </Field>
                        <Field label="Notes">
                          <Input
                            placeholder="Optional note…"
                            value={publishForm.notes}
                            onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })}
                          />
                        </Field>
                      </div>
                      <Button type="submit" disabled={publishMutation.isPending} className="w-full gap-1.5">
                        {publishMutation.isPending ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Publishing…
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Publish to live inventory
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Movement history — collapsible */}
                    <div className="border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => setShowHistory((v) => !v)}
                        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={14} className="text-muted-foreground" />
                          Movement History
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {sortedMovements.length}
                          </span>
                        </span>
                        {showHistory ? (
                          <ChevronUp size={14} className="text-muted-foreground" />
                        ) : (
                          <ChevronDown size={14} className="text-muted-foreground" />
                        )}
                      </button>

                      {showHistory && (
                        <div className="mt-3">
                          {movLoading ? (
                            <div className="space-y-2">
                              {[1, 2].map((i) => (
                                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
                              ))}
                            </div>
                          ) : sortedMovements.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">No movements yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border">
                                    {['Date', 'Type', 'Qty', 'Before → After', 'By'].map((h) => (
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
                                  {sortedMovements.map((m: UnpublishedStockMovement) => (
                                    <tr key={m.id} className="transition-colors hover:bg-muted/40">
                                      <td className="whitespace-nowrap py-2 pr-4 text-xs text-muted-foreground">
                                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                                      </td>
                                      <td className="py-2 pr-4">
                                        <MovementBadge type={m.movementType} />
                                      </td>
                                      <td className="py-2 pr-4 font-mono text-sm font-medium tabular-nums text-foreground">
                                        {m.quantity}
                                      </td>
                                      <td className="whitespace-nowrap py-2 pr-4 text-xs">
                                        <span className="text-muted-foreground">{m.quantityBefore}</span>
                                        <span className="mx-1.5 text-muted-foreground/50">→</span>
                                        <span className="font-medium text-foreground">{m.quantityAfter}</span>
                                      </td>
                                      <td className="whitespace-nowrap py-2 text-xs text-muted-foreground">
                                        {m.performedById ? (userMap.get(m.performedById) ?? '…') : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
