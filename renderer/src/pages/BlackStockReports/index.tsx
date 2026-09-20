import { useMemo, useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Eye,
  Boxes,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DataTable, type Column } from '../../components/DataTable';
import { FilterDropdown } from '../../components/FilterDropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { ExtraAction } from '../../components/RowActionsMenu';
import {
  CreditApprovals,
  Locations,
  Products,
  useUnpublishedStockList,
} from '../../api';
import {
  type BlackReportLog,
  type GenerateBlackReportInput,
  BLACK_REPORT_TYPE_LABEL,
  BLACK_REPORT_TYPE_FILTER_OPTIONS,
  PERIOD_LABEL,
  PERIOD_FILTER_OPTIONS,
  blackReportChipClass,
} from './constants';
import { GenerateModal } from './GenerateModal';
import { ReportDetailModal } from './ReportDetailModal';
import { generateReportData } from './generator';

const STORAGE_KEY = 'erp_black_stock_reports_cache';

function formatDuration(log: BlackReportLog): string {
  if (!log.fromDate) return '—';
  const from = new Date(log.fromDate);
  const to = log.toDate ? new Date(log.toDate) : from;
  const fmt = (d: Date): string =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (log.reportPeriod === 'DAILY') return fmt(from);
  if (log.reportPeriod === 'MONTHLY')
    return from.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  if (log.reportPeriod === 'YEARLY') return String(from.getFullYear());
  const fromStr = from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${fromStr} – ${fmt(to)}`;
}

function StatCard({
  icon,
  label,
  value,
  borderColor,
  bgColor,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  borderColor: string;
  bgColor: string;
  textColor: string;
}): React.ReactElement {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-card p-5', borderColor)}>
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', bgColor, textColor)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value ?? '—'}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function BlackStockReportsPage(): React.ReactElement {
  const [reports, setReports] = useState<BlackReportLog[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BlackReportLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlackReportLog | null>(null);

  // Live queries
  const { data: unpublishedStock = [], isLoading: stockLoading } = useUnpublishedStockList();
  const { data: blackLedgerData, isLoading: ledgerLoading } = CreditApprovals.useBlackLedger();
  const { data: products = [] } = Products.useList();
  const { data: locations = [] } = Locations.useList();

  const bills = blackLedgerData?.bills || [];
  const commissions = blackLedgerData?.commissions || [];

  // Persist reports
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to cache black reports', e);
    }
  }, [reports]);

  // Pre-seed standard overview reports if completely empty once data is available
  useEffect(() => {
    if (reports.length === 0 && !stockLoading && !ledgerLoading) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();

      const initialReport1 = generateReportData(
        {
          reportType: 'black_closing_stock',
          reportPeriod: 'MONTHLY',
          fromDate: startOfYear,
          toDate: endOfYear,
        },
        unpublishedStock,
        bills,
        commissions,
        products,
        locations,
      );

      const initialReport2 = generateReportData(
        {
          reportType: 'black_markup_profit',
          reportPeriod: 'MONTHLY',
          fromDate: startOfYear,
          toDate: endOfYear,
        },
        unpublishedStock,
        bills,
        commissions,
        products,
        locations,
      );

      setReports([initialReport1, initialReport2]);
    }
  }, [reports.length, stockLoading, ledgerLoading, unpublishedStock, bills, commissions, products, locations]);

  // Overall KPIs
  const totalStockOnHand = useMemo(() => {
    return Math.round(unpublishedStock.reduce((acc, s) => acc + Number(s.quantityOnHand || 0), 0));
  }, [unpublishedStock]);

  const totalBlackSales = useMemo(() => {
    const sum = bills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sum);
  }, [bills]);

  const totalBlackMarkup = useMemo(() => {
    const sum = bills.reduce((acc, b) => acc + Number(b.blackAmount || 0), 0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sum);
  }, [bills]);

  // Handle generation
  const handleGenerate = (input: GenerateBlackReportInput) => {
    const newReport = generateReportData(
      input,
      unpublishedStock,
      bills,
      commissions,
      products,
      locations,
    );
    setReports((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
  };

  // Filter & paginate reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (reportTypeFilter && r.reportType !== reportTypeFilter) return false;
      if (periodFilter && r.reportPeriod !== periodFilter) return false;
      if (locationFilter && r.locationId !== locationFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.reportName.toLowerCase().includes(q) ||
          r.reportType.toLowerCase().includes(q) ||
          (r.locationName && r.locationName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [reports, reportTypeFilter, periodFilter, locationFilter, search]);

  const pageSize = 10;
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, page]);

  const columns: Column<BlackReportLog>[] = useMemo(
    () => [
      {
        key: 'reportName',
        label: 'Report Name',
        render: (row) => (
          <div>
            <div className="font-semibold text-foreground">{row.reportName}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {BLACK_REPORT_TYPE_LABEL[row.reportType] || row.reportType}
            </div>
          </div>
        ),
      },
      {
        key: 'reportType',
        label: 'Report Type',
        render: (row) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              blackReportChipClass(row.reportType),
            )}
          >
            {BLACK_REPORT_TYPE_LABEL[row.reportType]}
          </span>
        ),
      },
      {
        key: 'reportPeriod',
        label: 'Period',
        render: (row) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {PERIOD_LABEL[row.reportPeriod] ?? row.reportPeriod}
          </span>
        ),
      },
      {
        key: 'fromDate',
        label: 'Duration',
        render: (row) => <span className="text-sm text-muted-foreground">{formatDuration(row)}</span>,
      },
      {
        key: 'locationId',
        label: 'Location',
        render: (row) => <span className="text-sm">{row.locationName || 'All Locations'}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        render: () => (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: 'Generated On',
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.createdAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
    ],
    [],
  );

  const extraRowActions = useMemo(
    () => (row: BlackReportLog): ExtraAction[] => [
      {
        label: 'View Report',
        icon: <Eye size={14} />,
        onSelect: () => setSelectedReport(row),
      },
      {
        label: 'Print / Export PDF',
        icon: <Printer size={14} />,
        onSelect: () => setSelectedReport(row),
      },
    ],
    [],
  );

  const locationFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'All Locations' },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Report Type"
        options={BLACK_REPORT_TYPE_FILTER_OPTIONS}
        value={reportTypeFilter}
        onChange={(v) => {
          setReportTypeFilter(v);
          setPage(1);
        }}
        searchable
        searchPlaceholder="Search types…"
      />
      <FilterDropdown
        label="Period"
        options={PERIOD_FILTER_OPTIONS}
        value={periodFilter}
        onChange={(v) => {
          setPeriodFilter(v);
          setPage(1);
        }}
      />
      <FilterDropdown
        label="Location"
        options={locationFilterOptions}
        value={locationFilter}
        onChange={(v) => {
          setLocationFilter(v);
          setPage(1);
        }}
      />
      <button
        type="button"
        onClick={() => setGenerateOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
      >
        <FileText size={14} />
        Generate Report
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={18} />}
          label="Generated Reports"
          value={reports.length}
          borderColor="border-t-4 border-t-primary"
          bgColor="bg-blue-50 dark:bg-blue-950/40"
          textColor="text-primary"
        />
        <StatCard
          icon={<Boxes size={18} />}
          label="Black Stock On Hand"
          value={totalStockOnHand}
          borderColor="border-t-4 border-t-pink-500"
          bgColor="bg-pink-50 dark:bg-pink-950/40"
          textColor="text-pink-600 dark:text-pink-400"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Total Black Sales"
          value={totalBlackSales}
          borderColor="border-t-4 border-t-emerald-500"
          bgColor="bg-emerald-50 dark:bg-emerald-950/40"
          textColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<Coins size={18} />}
          label="Pure Black Markup"
          value={totalBlackMarkup}
          borderColor="border-t-4 border-t-amber-500"
          bgColor="bg-amber-50 dark:bg-amber-950/40"
          textColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Main Table */}
      <div className="min-h-0 flex-1">
        <DataTable
          title="Black Stock Reports"
          description="Generated reports for off-the-books stock, black sales, markup margins, and facilitator commissions"
          columns={columns}
          rows={paginatedReports}
          total={filteredReports.length}
          page={page}
          loading={stockLoading || ledgerLoading}
          error={null}
          onPageChange={setPage}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          searchPlaceholder="Search black reports…"
          toolbar={toolbar}
          onRefetch={() => {}}
          isAdmin
          onView={(row) => setSelectedReport(row)}
          extraRowActions={extraRowActions}
          onDelete={(row) => setDeleteTarget(row)}
        />
      </div>

      {/* Generate Report Modal */}
      <GenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleGenerate}
      />

      {/* Report Details & Print Modal */}
      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Generated Report"
        description={`Are you sure you want to delete "${deleteTarget?.reportName}"? This will remove it from your report history.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
