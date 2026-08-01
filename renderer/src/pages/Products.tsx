import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { ImageLightbox } from '../components/ImageLightbox';
import { ProductImageUploader, type PendingImage } from '../components/ProductImageUploader';
import { ProductSupplierLinksPanel } from '../components/ProductSupplierLinksPanel';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Categories, Products, Suppliers, useCategoryParents, useUploadProductImage, useProductImagePresignedUpload, useProductImages, useProductSuppliers } from '../api';
import { usePagination } from '../hooks/usePagination';
import { formatEntityLabel } from '../lib/entityLabel';
import type { Product, ProductUnit } from '../types';


const UNIT_OPTIONS: ProductUnit[] = ['piece', 'kg', 'gram', 'litre', 'ml', 'box', 'pack', 'dozen'];

// Every field here matches core-apis' CreateProductRequest/UpdateProductRequest
// exactly (verified 2026-07-26 against products.controller.ts + the request
// DTOs) — no snake_case, no invented `code`/`status`/single `unit_price` fields.
interface FormState {
  name: string;
  categoryId: string;
  sku: string;
  barcode: string;
  description: string;
  unit: ProductUnit | '';
  costPrice: string;
  retailPrice: string;
  loyaltyPrice: string;
  wholesalePrice: string;
  transferPrice: string;
  reorderPoint: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  categoryId: '',
  sku: '',
  barcode: '',
  description: '',
  unit: '',
  costPrice: '',
  retailPrice: '',
  loyaltyPrice: '',
  wholesalePrice: '',
  transferPrice: '',
  reorderPoint: '',
};

function revokePending(files: PendingImage[]) {
  for (const item of files) URL.revokeObjectURL(item.previewUrl);
}

export default function ProductsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [viewRow, setViewRow] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const createMutation = Products.useCreate();
  const updateMutation = Products.useUpdate();
  const removeMutation = Products.useDelete();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (categoryFilter) next.categoryId = categoryFilter;
    return Object.keys(next).length ? next : undefined;
  }, [categoryFilter]);

  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } =
    Products.useSearch({ page, search: debouncedSearch, filters });

  const { data: images } = useProductImages(editing?.id);
  const { data: viewImages, isLoading: viewImagesLoading } = useProductImages(viewRow?.id);
  const { data: viewSuppliers, isLoading: viewSuppliersLoading } = useProductSuppliers(viewRow?.id);
  const { data: allSuppliers } = Suppliers.useList();
  const { data: categories } = Categories.useList();
  const categoryName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories ?? []) {
      m.set(c.id, formatEntityLabel({ name: c.name, id: c.id }));
    }
    return m;
  }, [categories]);

  const uploadProductImageMutation = useUploadProductImage();
  const presignedUploadMutation = useProductImagePresignedUpload();

  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    return () => revokePending(pendingImagesRef.current);
  }, []);

  const clearPending = () => {
    setPendingImages((prev) => {
      revokePending(prev);
      return [];
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearPending();
    setDrawerOpen(true);
  };

  const openEdit = (row: Product) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      categoryId: row.categoryId ?? '',
      sku: row.sku ?? '',
      barcode: row.barcode ?? '',
      description: row.description ?? '',
      unit: row.unit ?? '',
      costPrice: row.costPrice != null ? String(row.costPrice) : '',
      retailPrice: row.retailPrice != null ? String(row.retailPrice) : '',
      loyaltyPrice: row.loyaltyPrice != null ? String(row.loyaltyPrice) : '',
      wholesalePrice: row.wholesalePrice != null ? String(row.wholesalePrice) : '',
      transferPrice: row.transferPrice != null ? String(row.transferPrice) : '',
      reorderPoint: row.reorderPoint != null ? String(row.reorderPoint) : '',
    });
    clearPending();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    clearPending();
    setDrawerOpen(false);
  };

  const uploadFiles = async (productId: string, files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadProductImageMutation.mutateAsync({ productId, file });
      }
      toast.success(files.length === 1 ? 'Image uploaded' : `${files.length} images uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Product> = {
      name: form.name,
      categoryId: form.categoryId || undefined,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      unit: form.unit || undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      retailPrice: form.retailPrice ? Number(form.retailPrice) : undefined,
      loyaltyPrice: form.loyaltyPrice ? Number(form.loyaltyPrice) : undefined,
      wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
      transferPrice: form.transferPrice ? Number(form.transferPrice) : undefined,
      reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      const queued = pendingImages.map((p) => p.file);
      createMutation.mutate(body, {
        onSuccess: async (created) => {
          try {
            if (queued.length) await uploadFiles(created.id, queued);
          } catch {
            // Product was created; image failure already toasted. Still close.
          }
          clearPending();
          setDrawerOpen(false);
        },
      });
    }
  };

  const handleFilePick = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);

    if (editing) {
      try {
        await uploadFiles(editing.id, files);
      } catch {
        // toasted in uploadFiles
      }
      return;
    }

    setPendingImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDirectR2Pick = async (fileList: FileList | null) => {
    if (!fileList?.length || !editing) return;
    const file = fileList[0];
    setUploading(true);
    try {
      const meta = await presignedUploadMutation.mutateAsync({ productId: editing.id, file });
      toast.success(
        meta.publicUrl
          ? `Stored in R2 (not in gallery). ${meta.publicUrl}`
          : `Stored in R2 key ${meta.key} — not linked in product gallery`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Direct R2 upload failed');
    } finally {
      setUploading(false);
      if (directInputRef.current) directInputRef.current.value = '';
    }
  };

  const removePending = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (previewSrc === target.previewUrl) setPreviewSrc(null);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

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

  const isSaving = createMutation.isPending || updateMutation.isPending || uploading;

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
            <span className="text-xs text-muted-foreground">Category:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
          </>
        }
        onRefetch={() => void refetchProducts()}
        searchPlaceholder="Search products…"
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Product"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      >
        <FormSection title="Images" className="space-y-3">
          {viewImagesLoading ? (
            <p className="text-sm text-muted-foreground">Loading images…</p>
          ) : !(viewImages ?? []).length ? (
            <p className="text-sm text-muted-foreground">No images</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(viewImages ?? []).map((img) =>
                img.url ? (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setPreviewSrc(img.url!)}
                    className="group relative h-16 w-16 overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={img.isPrimary ? 'View primary image' : 'View image'}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    {img.isPrimary && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 px-0.5 py-0.5 text-[9px] text-white">
                        Primary
                      </span>
                    )}
                  </button>
                ) : (
                  <div
                    key={img.id}
                    className="flex h-16 w-16 items-center justify-center rounded border border-border bg-muted text-[10px] text-muted-foreground"
                    title={img.storageKey}
                  >
                    No URL
                  </div>
                ),
              )}
            </div>
          )}
        </FormSection>

        <FormSection title="Suppliers" className="space-y-2">
          {viewSuppliersLoading ? (
            <p className="text-sm text-muted-foreground">Loading suppliers…</p>
          ) : !(viewSuppliers ?? []).length ? (
            <p className="text-sm text-muted-foreground">No suppliers linked</p>
          ) : (
            (viewSuppliers ?? []).map((link) => {
              const supplier = allSuppliers?.find((s) => s.id === link.supplierId);
              return (
                <div key={link.id} className="rounded-md border border-border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supplier?.name ?? link.supplierId}</span>
                    {link.isDefault && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Default</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {link.unitCost != null && `Cost $${link.unitCost}`}
                    {link.leadTimeDays != null && ` · Lead ${link.leadTimeDays}d`}
                    {link.minOrderQty != null && ` · MOQ ${link.minOrderQty}`}
                    {link.unitCost == null && link.leadTimeDays == null && link.minOrderQty == null && '—'}
                  </div>
                </div>
              );
            })
          )}
        </FormSection>
      </ViewDrawer>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Product' : 'New Product'}
        width={640}
        footer={
          <>
            <Button type="submit" form="product-form" disabled={isSaving}>
              {uploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Save Product'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={uploading}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
                placeholder="e.g. Cooking Oil 5L"
              />
            </Field>
            <Field label="SKU">
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g. OIL-5L-001"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Barcode">
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </Field>
            <Field label="Unit">
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as ProductUnit })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit…" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Category">
            <ResourceSelect
              resource={{ useList: useCategoryParents }}
              getLabel={(c) => c.name ?? ''}
              value={form.categoryId}
              onValueChange={(v) => setForm({ ...form, categoryId: v })}
              placeholder="No parent (top level)"
              allowNone
              noneLabel="None (top level)"
            />
          </Field>

          <FormSection title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cost Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </Field>
              <Field label="Retail Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.retailPrice}
                  onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                />
              </Field>
              <Field label="Loyalty Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.loyaltyPrice}
                  onChange={(e) => setForm({ ...form, loyaltyPrice: e.target.value })}
                />
              </Field>
              <Field label="Wholesale Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.wholesalePrice}
                  onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                />
              </Field>
              <Field label="Transfer Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.transferPrice}
                  onChange={(e) => setForm({ ...form, transferPrice: e.target.value })}
                />
              </Field>
              <Field label="Min Stock Level" hint="Maps to reorder point">
                <Input
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <FormSection title="Images" className="space-y-3">
            <ProductImageUploader
              editing={!!editing}
              images={images}
              pendingImages={pendingImages}
              uploading={uploading}
              fileInputRef={fileInputRef}
              directInputRef={directInputRef}
              onFilePick={handleFilePick}
              onDirectR2Pick={handleDirectR2Pick}
              onRemovePending={removePending}
              onPreview={setPreviewSrc}
            />
          </FormSection>

          {editing && (
            <FormSection title="Suppliers" className="space-y-3">
              <ProductSupplierLinksPanel productId={editing.id} />
            </FormSection>
          )}
        </form>
      </FormDrawer>

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
    </div>
  );
}
