import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, Plus, RefreshCw, UserCheck, Users, Wallet } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { CustomerDetailDrawer } from '../../components/CustomerDetailDrawer';
import { CustomerFormDrawer } from '../../components/CustomerFormDrawer';
import { Button } from '../../components/ui/button';
import { Customers } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { loadErrorMessage } from '../../lib/api-error';
import { fmt } from '../pos/posHelpers';
import type { CreditStatus, Customer, CustomerType } from '../../types';

const CUSTOMER_TYPE_STYLES: Record<CustomerType, string> = {
  regular: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  shop: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  big_customer: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
};

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  regular: 'Regular',
  new: 'New',
  shop: 'Shop',
  big_customer: 'Company',
};

function CustomerTypeBadge({ type }: { type: CustomerType | string | undefined | null }) {
  if (!type) return <span className="text-muted-foreground">—</span>;
  const key = type as CustomerType;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CUSTOMER_TYPE_STYLES[key] ?? 'bg-muted text-foreground'}`}
    >
      {CUSTOMER_TYPE_LABELS[key] ?? String(type).replace(/_/g, ' ')}
    </span>
  );
}

function CreditStatusDot({ status }: { status?: CreditStatus }) {
  const cls: Record<string, string> = {
    over: 'bg-red-500',
    warning: 'bg-amber-500',
    available: 'bg-green-500',
    none: 'bg-muted-foreground/30',
  };
  const labels: Record<string, string> = {
    over: 'Over limit',
    warning: 'Nearing limit',
    available: 'Credit available',
    none: 'No limit',
  };
  const key = status ?? 'none';
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${cls[key]}`}
      title={labels[key]}
    />
  );
}

type FilterMode = 'all' | 'with-dues' | 'over-limit';

export default function DebtorsPage() {
  const navigate = useNavigate();
  const { setSearch, debouncedSearch } = usePagination();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = Customers.useSearch({
    search: debouncedSearch,
  });

  const listError = isError ? loadErrorMessage(error, 'debtors') : null;
  const allCustomers = listError ? [] : (data?.items ?? []);

  // Filter only customers who have an active credit line or positive credit balance
  const allDebtors = useMemo(() => {
    return allCustomers.filter(
      (c) => (Number(c.creditLimit) > 0) || (Number(c.creditBalance) > 0),
    );
  }, [allCustomers]);

  // Apply sub-filter
  const filteredDebtors = useMemo(() => {
    if (filterMode === 'with-dues') {
      return allDebtors.filter((c) => Number(c.creditBalance ?? 0) > 0);
    }
    if (filterMode === 'over-limit') {
      return allDebtors.filter((c) => {
        const bal = Number(c.creditBalance ?? 0);
        const lim = Number(c.creditLimit ?? 0);
        return lim > 0 && bal > lim;
      });
    }
    return allDebtors;
  }, [allDebtors, filterMode]);

  // Summary Metrics
  const totalReceivables = useMemo(
    () => allDebtors.reduce((sum, c) => sum + Number(c.creditBalance ?? 0), 0),
    [allDebtors],
  );

  const totalCreditLimit = useMemo(
    () => allDebtors.reduce((sum, c) => sum + Number(c.creditLimit ?? 0), 0),
    [allDebtors],
  );

  const overLimitCount = useMemo(
    () =>
      allDebtors.filter((c) => {
        const bal = Number(c.creditBalance ?? 0);
        const lim = Number(c.creditLimit ?? 0);
        return lim > 0 && bal > lim;
      }).length,
    [allDebtors],
  );

  const columns: Column<Customer>[] = [
    {
      key: 'creditStatus' as any,
      label: '',
      render: (row) => <CreditStatusDot status={row.creditStatus} />,
    },
    {
      key: 'name',
      label: 'Debtor Name',
      render: (row) => (
        <div className="flex flex-col">
          <button
            type="button"
            className="font-medium text-primary hover:underline text-left"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${row.id}`);
            }}
          >
            {row.name || '—'}
          </button>
          {row.shopName && <span className="text-[11px] text-muted-foreground">{row.shopName}</span>}
        </div>
      ),
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
      key: 'customerType',
      label: 'Type',
      render: (row) => <CustomerTypeBadge type={row.customerType} />,
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      render: (row) => (
        <span className="font-mono tabular-nums text-foreground">
          {row.creditLimit != null ? fmt(row.creditLimit) : '—'}
        </span>
      ),
    },
    {
      key: 'creditBalance',
      label: 'Outstanding Dues',
      render: (row) => {
        const bal = Number(row.creditBalance ?? 0);
        const lim = Number(row.creditLimit ?? 0);
        const isOver = lim > 0 && bal > lim;
        return (
          <span
            className={`font-mono font-semibold tabular-nums ${
              isOver
                ? 'text-red-600 dark:text-red-400'
                : bal > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
            }`}
          >
            {fmt(bal)}
          </span>
        );
      },
    },
    {
      key: 'id' as any,
      label: 'Available Credit',
      render: (row) => {
        const lim = Number(row.creditLimit ?? 0);
        const bal = Number(row.creditBalance ?? 0);
        const avail = Math.max(0, lim - bal);
        return (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {lim > 0 ? fmt(avail) : '—'}
          </span>
        );
      },
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
            onClick={() => setSelectedCustomerId(row.id)}
          >
            <FileText size={12} className="mr-1" /> Statement
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Receivables (Dues)</span>
            <Wallet size={16} className="text-primary" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground font-mono">{fmt(totalReceivables)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Credit Extended</span>
            <UserCheck size={16} className="text-blue-500" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground font-mono">{fmt(totalCreditLimit)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Debtors</span>
            <Users size={16} className="text-green-500" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground font-mono">{allDebtors.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Over Limit Accounts</span>
            <AlertCircle size={16} className={overLimitCount > 0 ? 'text-red-500' : 'text-muted-foreground'} />
          </div>
          <p className={`mt-1 text-lg font-bold font-mono ${overLimitCount > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {overLimitCount}
          </p>
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
            All Debtors ({allDebtors.length})
          </Button>
          <Button
            size="sm"
            type="button"
            variant={filterMode === 'with-dues' ? 'default' : 'outline'}
            onClick={() => setFilterMode('with-dues')}
          >
            With Dues ({allDebtors.filter((c) => Number(c.creditBalance ?? 0) > 0).length})
          </Button>
          <Button
            size="sm"
            type="button"
            variant={filterMode === 'over-limit' ? 'default' : 'outline'}
            onClick={() => setFilterMode('over-limit')}
          >
            Over Limit ({overLimitCount})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" type="button" onClick={() => setDrawerOpen(true)}>
            <Plus size={14} className="mr-1" /> Register Debtor
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
          title="Debtors (Customer Accounts)"
          description="Customers with open credit facilities or pending balances."
          columns={columns}
          rows={filteredDebtors}
          total={filteredDebtors.length}
          page={1}
          limit={Math.max(filteredDebtors.length, 1)}
          loading={isLoading && !isError}
          error={listError}
          onPageChange={() => {}}
          onSearchChange={setSearch}
          onRefetch={() => void refetch()}
          searchPlaceholder="Search debtors by name, phone, shop…"
          onRowClick={(row) => setSelectedCustomerId(row.id)}
        />
      </div>

      {/* Slide-over Customer Account Drawer */}
      {selectedCustomerId && (
        <CustomerDetailDrawer
          customerId={selectedCustomerId}
          open={!!selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onCreditUpdated={() => void refetch()}
        />
      )}

      {/* Slide-over Form Drawer to Register New Debtor */}
      <CustomerFormDrawer
        open={drawerOpen}
        requireCreditLimit={true}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          void refetch();
        }}
      />
    </div>
  );
}
