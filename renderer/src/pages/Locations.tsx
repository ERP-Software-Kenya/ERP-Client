import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Locations, Organizations, useUploadLocationImage, useRemoveLocationImage } from '../api';
import { usePagination } from '../hooks/usePagination';
import { formatEntityLabel } from '../lib/entityLabel';
import type { Location, LocationType } from '../types';

const TYPE_OPTIONS: LocationType[] = ['store', 'warehouse'];

interface FormState {
  name: string;
  type: LocationType | '';
  address: string;
  city: string;
  country: string;
  phone: string;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

const EMPTY_FORM: FormState = { name: '', type: '', address: '', city: '', country: '', phone: '' };

export default function LocationsPage() {
  const { pathname } = useLocation();
  const warehouseOnly = pathname.startsWith('/warehouse');
  const emptyForm: FormState = warehouseOnly ? { ...EMPTY_FORM, type: 'warehouse' } : EMPTY_FORM;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [viewRow, setViewRow] = useState<Location | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [hasServerImage, setHasServerImage] = useState(false);

  const createMutation = Locations.useCreate();
  const updateMutation = Locations.useUpdate();
  const removeMutation = Locations.useDelete();
  const uploadImageMutation = useUploadLocationImage();
  const removeImageMutation = useRemoveLocationImage();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, error, refetch } = Locations.useSearch({
    page,
    search: debouncedSearch,
    filters: warehouseOnly ? { type: 'warehouse' } : undefined,
  });

  const pendingRef = useRef<PendingImage | null>(null);
  pendingRef.current = pendingImage;

  useEffect(() => {
    return () => {
      if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.previewUrl);
    };
  }, []);

  const clearPending = () => {
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setHasServerImage(false);
    clearPending();
    setDrawerOpen(true);
  };

  const openEdit = (row: Location) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      type: row.type ?? '',
      address: row.address ?? '',
      city: row.city ?? '',
      country: row.country ?? '',
      phone: row.phone ?? '',
    });
    setHasServerImage(!!row.imageKey);
    clearPending();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    clearPending();
    setDrawerOpen(false);
  };

  const uploadFor = async (locationId: string, file: File) => {
    setUploading(true);
    try {
      const updated = await uploadImageMutation.mutateAsync({ locationId, file });
      toast.success('Location image uploaded');
      setHasServerImage(!!updated.imageKey);
      setEditing((prev) => (prev && prev.id === locationId ? { ...prev, ...updated } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!editing) return;
    setUploading(true);
    try {
      await removeImageMutation.mutateAsync(editing.id);
      toast.success('Location image removed');
      setHasServerImage(false);
      setEditing((prev) => (prev ? { ...prev, imageKey: undefined } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (editing) {
      try {
        await uploadFor(editing.id, file);
      } catch {
        // toasted
      }
      return;
    }

    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Location> = {
      name: form.name,
      type: form.type || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      phone: form.phone || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      const queued = pendingImage?.file;
      createMutation.mutate(body, {
        onSuccess: async (created) => {
          try {
            if (queued) await uploadFor(created.id, queued);
          } catch {
            // location created; image failure already toasted
          }
          clearPending();
          setDrawerOpen(false);
        },
      });
    }
  };

  const columns: Column<Location>[] = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    {
      key: 'imageKey',
      label: 'Image',
      render: (row) => (row.imageKey ? 'Set' : '—'),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (row.isActive === false ? 'Inactive' : 'Active'),
    },
  ];

  const { data: orgs } = Organizations.useList();
  const orgName = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs ?? []) m.set(o.id, formatEntityLabel({ name: o.name, id: o.id }));
    return m;
  }, [orgs]);

  const isSaving =
    createMutation.isPending || updateMutation.isPending || uploading || uploadImageMutation.isPending || removeImageMutation.isPending;

  const viewData = viewRow
    ? ({
        ...viewRow,
        organizationId: viewRow.organizationId ? (orgName.get(viewRow.organizationId) ?? viewRow.organizationId) : undefined,
      } as Record<string, unknown>)
    : null;

  const pageTitle = warehouseOnly ? 'Warehouses' : 'Locations';
  const pageDescription = warehouseOnly
    ? 'Manage warehouse places used by inventory and stock.'
    : 'Manage store and warehouse locations.';
  const entityLabel = warehouseOnly ? 'Warehouse' : 'Location';

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title={pageTitle}
        description={pageDescription}
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder={warehouseOnly ? 'Search warehouses…' : 'Search locations…'}
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title={`View ${entityLabel}`}
        data={viewData}
        onClose={() => setViewRow(null)}
      >
        <FormSection title="Image">
          {viewRow?.imageKey ? (
            <div className="space-y-1 text-sm">
              <span className="inline-block rounded-md border border-border px-2 py-1 text-xs">Image set</span>
              <p className="text-xs text-muted-foreground break-all">
                Key: <span className="font-mono">{viewRow.imageKey}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Remote preview is unavailable — the API returns an object key only.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No image</p>
          )}
        </FormSection>
      </ViewDrawer>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
        footer={
          <>
            <Button type="submit" form="location-form" disabled={isSaving}>
              {uploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={uploading}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="location-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="Type" required>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LocationType })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
          </div>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>

          <FormSection title="Image">
            <p className="text-xs text-muted-foreground mb-2">
              One image per location (upload replaces). Existing images return only an object key from
              the API, so we show status instead of a remote preview.
            </p>
            {pendingImage && (
              <div className="mb-3 relative inline-block">
                <img
                  src={pendingImage.previewUrl}
                  alt="Pending location"
                  className="h-24 w-24 object-cover rounded-md border border-border"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1"
                  onClick={clearPending}
                  aria-label="Remove pending image"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
            {!pendingImage && hasServerImage && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="rounded-md border border-border px-2 py-1 text-xs">Image set</span>
                {editing && (
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={handleRemoveImage}>
                    Remove
                  </Button>
                )}
              </div>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => handleFilePick(e.target.files)}
            />
          </FormSection>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${entityLabel}`}
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
