import { useMemo, useState } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FilterDropdown } from '../../components/FilterDropdown';
import { ImageLightbox } from '../../components/ImageLightbox';
import { ProductDetailView } from './components/ProductDetailView';
import { ProductOnboardingWizard } from './components/ProductOnboardingWizard';
import { Categories, Products, Suppliers } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { Product } from '../../types';


export default function ProductsPage() {
  const [wizard, setWizard]     = useState<{ open: boolean; editing?: Product }>({ open: false });
  const [deleteTarget, setDeleteTarget]           = useState<Product | null>(null);
  const [toggleActiveTarget, setToggleActiveTarget] = useState<Product | null>(null);
  const [viewRow, setViewRow]   = useState<Product | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState<string | null>(null);

  const updateMutation = Products.useUpdate();
  const removeMutation = Products.useDelete();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (categoryFilter) next.categoryId = categoryFilter;
    if (statusFilter) next.isActive = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [categoryFilter, statusFilter]);

  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } =
    Products.useSearch({ page, search: debouncedSearch, filters });

  const { data: allSuppliers } = Suppliers.useList();
  const { data: categories }   = Categories.useList();
  const categoryName = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of categories ?? []) {
      m.set(cat.id, formatEntityLabel({ name: cat.name, id: cat.id }));
    }
    return m;
  }, [categories]);

  const columns: Column<Product>[] = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    {
      key: 'categoryId',
      label: 'Category',
      render: (row) =>
        row.categoryId
          ? formatEntityLabel({ name: categoryName.get(row.categoryId), id: row.categoryId })
          : '—',
    },
    {
      key: 'retailPrice',
      label: 'Retail Price',
      render: (row) => `$${Number(row.retailPrice || 0).toFixed(2)}`,
    },
    { key: 'unit', label: 'Unit' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (row.isActive === false ? 'Inactive' : 'Active'),
    },
  ];

  // Wizard takes over the full content area
  if (wizard.open) {
    return (
      <ProductOnboardingWizard
        editingProduct={wizard.editing}
        onClose={() => setWizard({ open: false })}
        onSuccess={() => { setWizard({ open: false }); void refetchProducts(); }}
      />
    );
  }

  if (viewRow) {
    return (
      <>
        <ProductDetailView
          productId={viewRow.id}
          categoryName={categoryName}
          allSuppliers={allSuppliers ?? []}
          onClose={() => setViewRow(null)}
          onEdit={(product) => { setViewRow(null); setWizard({ open: true, editing: product }); }}
        />
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Product"
          description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
          isPending={removeMutation.isPending}
          onConfirm={() =>
            deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Products"
        description="Manage your product catalog."
        columns={columns}
        rows={productsData?.items ?? []}
        total={productsData?.total ?? 0}
        page={page}
        loading={productsLoading}
        error={productsError ? String(productsError) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        toolbar={
          <>
            <FilterDropdown
              label="Category"
              options={(categories ?? []).map((c) => ({
                value: c.id,
                label: c.name || c.id,
              }))}
              value={categoryFilter || null}
              onChange={(v) => { setCategoryFilter(v ?? ''); setPage(1); }}
              searchable={(categories ?? []).length > 6}
              searchPlaceholder="Search categories…"
            />
            <FilterDropdown
              label="Status"
              options={[
                { value: 'true',  label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
            />
          </>
        }
        onRefetch={() => void refetchProducts()}
        searchPlaceholder="Search products…"
        isAdmin={true}
        onAdd={() => setWizard({ open: true })}
        addLabel="Onboard Product"
        onView={(row) => setViewRow(row)}
        onEdit={(row) => setWizard({ open: true, editing: row })}
        onDelete={(row) => setDeleteTarget(row)}
        extraRowActions={(row) => [
          {
            label: row.isActive === false ? 'Set Active' : 'Set Inactive',
            icon: row.isActive === false
              ? <Eye size={14} />
              : <EyeOff size={14} />,
            onSelect: () => setToggleActiveTarget(row),
          },
        ]}
      />

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />

      <ConfirmDialog
        open={!!toggleActiveTarget}
        onOpenChange={(open) => !open && setToggleActiveTarget(null)}
        title={toggleActiveTarget?.isActive === false ? 'Set Product Active' : 'Set Product Inactive'}
        description={
          toggleActiveTarget?.isActive === false
            ? `"${toggleActiveTarget?.name}" will be marked active and visible again.`
            : `"${toggleActiveTarget?.name}" will be marked inactive and hidden from active listings.`
        }
        confirmLabel={toggleActiveTarget?.isActive === false ? 'Set Active' : 'Set Inactive'}
        pendingLabel="Updating…"
        confirmVariant={toggleActiveTarget?.isActive === false ? 'default' : 'destructive'}
        isPending={updateMutation.isPending}
        onConfirm={() => {
          if (!toggleActiveTarget) return;
          updateMutation.mutate(
            { id: toggleActiveTarget.id, body: { isActive: toggleActiveTarget.isActive === false ? true : false } },
            { onSuccess: () => setToggleActiveTarget(null) },
          );
        }}
      />
    </div>
  );
}
