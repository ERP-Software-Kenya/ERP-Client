import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, RefreshCw, ShoppingCart, Users, CheckCircle2, XCircle, Landmark } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { SupplierFormDrawer } from '../../components/SupplierFormDrawer';
import { SupplierAccountDrawer } from '../../components/SupplierAccountDrawer';
import { Button } from '../../components/ui/button';
import { Suppliers } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { Supplier } from '../../types';

type FilterMode = 'all' | 'active' | 'inactive';

export default function PurchaseCreditorsPage() {
  const navigate = useNavigate();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountSupplierId, setAccountSupplierId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = Suppliers.useSearch({
    page,
    search: debouncedSearch,
  });

  const allSuppliers = data?.items ?? [];

  const filteredSuppliers = useMemo(() => {
    if (filterMode === 'active') {
      return allSuppliers.filter((s) => s.isActive !== false);
    }
    if (filterMode === 'inactive') {
      return allSuppliers.filter((s) => s.isActive === false);
    }
    return allSuppliers;
  }, [allSuppliers, filterMode]);

  const activeCount = useMemo(
    () => allSuppliers.filter((s) => s.isActive !== false).length,
    [allSuppliers],
  );

  const inactiveCount = useMemo(
    () => allSuppliers.filter((s) => s.isActive === false).length,
    [allSuppliers],
  );

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      label: 'Debtor / Supplier Name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.name || '—'}</span>
          {row.address && <span className="text-[11px] text-muted-foreground truncate max-w-xs">{row.address}</span>}
        </div>
      ),
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      render: (row) => row.contactPerson || '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="font-mono text-xs text-foreground">
          {row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => row.email || '—',
    },
    {
      key: 'taxId',
      label: 'Tax ID / GSTIN',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.taxId || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) =>
        row.isActive === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">
            <XCircle size={10} /> Inactive
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            <CheckCircle2 size={10} /> Active
          </span>
        ),
    },
    {
      key: 'actions' as any,
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => setAccountSupplierId(row.id)}
            title="View account & payments"
          >
            <Landmark size={12} className="mr-1" /> Account
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => navigate(`/pos/purchase`)}
            title="Create Purchase Order"
          >
            <ShoppingCart size={12} className="mr-1" /> New Order
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => navigate(`/purchase-orders`)}
          >
            Orders
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Debtors (Suppliers)</span>
            <Building2 size={16} className="text-primary" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground font-mono">{data?.total ?? allSuppliers.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Debtors</span>
            <Users size={16} className="text-emerald-500" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground font-mono">{activeCount}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Inactive Debtors</span>
            <Building2 size={16} className="text-muted-foreground" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground font-mono">{inactiveCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5" aria-label="Debtor filter mode">
          <Button
            size="sm"
            type="button"
            variant={filterMode === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterMode('all')}
          >
            All Debtors ({allSuppliers.length})
          </Button>
          <Button
            size="sm"
            type="button"
            variant={filterMode === 'active' ? 'default' : 'outline'}
            onClick={() => setFilterMode('active')}
          >
            Active ({activeCount})
          </Button>
          <Button
            size="sm"
            type="button"
            variant={filterMode === 'inactive' ? 'default' : 'outline'}
            onClick={() => setFilterMode('inactive')}
          >
            Inactive ({inactiveCount})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" type="button" onClick={() => setDrawerOpen(true)}>
            <Plus size={14} className="mr-1" /> Add Debtor
          </Button>
          <Button
            size="icon"
            type="button"
            variant="ghost"
            title="Refresh"
            onClick={() => void refetch()}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="min-h-0 flex-1">
        <DataTable
          title="Debtors (Suppliers / Vendors)"
          description="Registered suppliers and vendor accounts for purchasing."
          columns={columns}
          rows={filteredSuppliers}
          total={data?.total ?? filteredSuppliers.length}
          page={page}
          limit={20}
          loading={isLoading}
          error={error instanceof Error ? error.message : null}
          onPageChange={setPage}
          onSearchChange={setSearch}
          onRefetch={() => void refetch()}
          searchPlaceholder="Search debtors by name, contact, phone, tax ID…"
          onRowClick={(row) => setAccountSupplierId(row.id)}
        />
      </div>

      <SupplierFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          void refetch();
        }}
      />

      <SupplierAccountDrawer
        supplierId={accountSupplierId}
        open={!!accountSupplierId}
        onClose={() => setAccountSupplierId(null)}
      />
    </div>
  );
}
