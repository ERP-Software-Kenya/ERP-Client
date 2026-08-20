import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, ShoppingCart } from "lucide-react";
import { DataTable, Column } from "../../components/DataTable";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PurchaseOrders, Locations, Suppliers } from "../../api";
import { usePagination } from "../../hooks/usePagination";
import { truncateId } from "../../lib/entityLabel";
import { loadErrorMessage } from "../../lib/api-error";
import type { PurchaseOrder, PurchaseOrderStatus } from "../../types";
import type { ExtraAction } from "../../components/RowActionsMenu";

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  draft:             "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300",
  ordered:           "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  partially_received: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  received:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  cancelled:         "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft:             'Draft',
  ordered:           'Ordered',
  partially_received: 'Partially Received',
  received:          'Received',
  cancelled:         'Cancelled',
};

function StatusBadge({ status }: { status: PurchaseOrderStatus | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] ?? "bg-muted text-foreground"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  const removeMutation = PurchaseOrders.useDelete();
  const updateMutation = PurchaseOrders.useUpdate();
  const { page, setPage } = usePagination();
  const { data: locations = [] } = Locations.useList();
  const { data: suppliers = [] } = Suppliers.useList();

  const locationMap = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l.name])),
    [locations],
  );
  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (locationFilter) next.locationId = locationFilter;
    if (supplierFilter) next.supplierId = supplierFilter;
    return Object.keys(next).length ? next : undefined;
  }, [locationFilter, supplierFilter]);

  const { data, isLoading, isError, error, refetch } = PurchaseOrders.useSearch({ page, filters });

  const listError = isError ? loadErrorMessage(error, "purchase orders") : null;

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poNumber",
      label: "PO #",
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          {row.poNumber ?? truncateId(row.id)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "supplierId",
      label: "Supplier",
      render: (row) =>
        row.supplierId
          ? (supplierMap[row.supplierId] ?? truncateId(row.supplierId))
          : "—",
    },
    {
      key: "locationId",
      label: "Location",
      render: (row) =>
        row.locationId ? (locationMap[row.locationId] ?? truncateId(row.locationId)) : "—",
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row) =>
        row.totalAmount != null
          ? `$${Number(row.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—",
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString()
          : "—",
    },
  ];

  return (
    <div className="space-y-4" style={{ height: "100%" }}>
      <DataTable
        title="Purchase Orders"
        description="Manage purchase orders. Click a row to view details or receive stock."
        columns={columns}
        rows={listError ? [] : (data?.items ?? [])}
        total={listError ? 0 : (data?.total ?? 0)}
        page={page}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={setPage}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Location:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type.charAt(0).toUpperCase() + l.type.slice(1)})
                </option>
              ))}
            </select>
            <span className="ml-2 text-xs text-muted-foreground">Supplier:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={supplierFilter}
              onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={() => navigate("/pos/purchase")}
        addLabel="Draft Purchase Order"
        onView={(row) => navigate(`/purchase-orders/${row.id}`)}
        onDelete={(row) => setDeleteTarget(row)}
        extraRowActions={(row) => {
          const actions: ExtraAction[] = [];
          if (row.status === 'draft') {
            actions.push({
              label: 'Mark as Ordered',
              icon: <ShoppingCart size={14} />,
              onSelect: () => updateMutation.mutate({ id: row.id, body: { status: 'ordered' } as Partial<PurchaseOrder> }),
            });
          }
          if (
            row.status === 'draft' ||
            row.status === 'ordered' ||
            row.status === 'partially_received'
          ) {
            actions.push({
              label: 'Verify Receipt',
              icon: <ClipboardCheck size={14} />,
              onSelect: () => navigate(`/purchase-orders/${row.id}/receive`),
            });
          }
          return actions;
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Order"
        description="Delete this purchase order? This cannot be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          removeMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }
      />
    </div>
  );
}
