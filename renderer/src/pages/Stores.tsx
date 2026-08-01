import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { FilterDropdown } from '../components/FilterDropdown';
import { SingleImageUploader } from '../components/SingleImageUploader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Stores,
  useUploadStoreImage,
  useRemoveStoreImage,
  useListCountries,
  useListStates,
  useListCities,
} from '../api';
import { usePagination } from '../hooks/usePagination';
import type { Store } from '../types';

interface FormState {
  name: string;
  code: string;
  address: string;
  countryName: string;
  countryId: number | null;
  stateName: string;
  stateId: number | null;
  cityName: string;
  phone: string;
  email: string;
}

interface PendingImage { file: File; previewUrl: string }

const EMPTY_FORM: FormState = {
  name: '', code: '', address: '',
  countryName: '', countryId: null,
  stateName: '', stateId: null,
  cityName: '',
  phone: '', email: '',
};

export default function StoresPage() {
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editing, setEditing]             = useState<Store | null>(null);
  const [form, setForm]                   = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget]   = useState<Store | null>(null);
  const [viewRow, setViewRow]             = useState<Store | null>(null);
  const [pendingImage, setPendingImage]   = useState<PendingImage | null>(null);
  const [serverImage, setServerImage]     = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [statusFilter, setStatusFilter]   = useState<string | null>(null);
  const pendingRef = useRef<PendingImage | null>(null);
  pendingRef.current = pendingImage;

  const createMutation      = Stores.useCreate();
  const updateMutation      = Stores.useUpdate();
  const removeMutation      = Stores.useDelete();
  const uploadImageMutation = useUploadStoreImage();
  const removeImageMutation = useRemoveStoreImage();

  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (statusFilter) next.isActive = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [statusFilter]);

  const { data, isLoading, error, refetch } = Stores.useSearch({ page, search: debouncedSearch, filters });

  const { data: countries = [] }               = useListCountries();
  const { data: states = [] }                  = useListStates(form.countryId);
  const { data: cities = [] }                  = useListCities(form.stateId);

  const clearPending = () => {
    setPendingImage((prev) => { if (prev) URL.revokeObjectURL(prev.previewUrl); return null; });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setServerImage(false);
    clearPending();
    setDrawerOpen(true);
  };

  const openEdit = (row: Store) => {
    setEditing(row);
    const country = countries.find((c) => c.name === row.country) ?? null;
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      address: row.address ?? '',
      countryName: row.country ?? '',
      countryId: country?.id ?? null,
      stateName: row.state ?? '',
      stateId: null,
      cityName: row.city ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
    });
    setServerImage(!!row.imageKey);
    clearPending();
    setDrawerOpen(true);
  };

  const closeDrawer = () => { clearPending(); setDrawerOpen(false); };

  const uploadFor = async (storeId: string, file: File) => {
    setUploading(true);
    try {
      await uploadImageMutation.mutateAsync({ storeId, file });
      toast.success('Image uploaded');
      setServerImage(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveServer = async () => {
    if (!editing) return;
    setUploading(true);
    try {
      await removeImageMutation.mutateAsync(editing.id);
      toast.success('Image removed');
      setServerImage(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Store> = {
      name:    form.name,
      code:    form.code    || undefined,
      address: form.address || undefined,
      city:    form.cityName  || undefined,
      state:   form.stateName || undefined,
      country: form.countryName || undefined,
      phone:   form.phone   || undefined,
      email:   form.email   || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      const queued = pendingImage?.file;
      createMutation.mutate(body, {
        onSuccess: async (created) => {
          try { if (queued) await uploadFor(created.id, queued); } catch { /* toasted */ }
          clearPending();
          setDrawerOpen(false);
        },
      });
    }
  };

  const columns: Column<Store>[] = [
    { key: 'name',    label: 'Name' },
    { key: 'code',    label: 'Code',    render: (r) => r.code    || '—' },
    { key: 'city',    label: 'City',    render: (r) => r.city    || '—' },
    { key: 'state',   label: 'State',   render: (r) => r.state   || '—' },
    { key: 'country', label: 'Country', render: (r) => r.country || '—' },
    { key: 'phone',   label: 'Phone',   render: (r) => r.phone   || '—' },
    {
      key: 'isActive',
      label: 'Status',
      render: (r) => (
        <span className={`inline-flex items-center gap-1.5`}>
          <span className={`h-2 w-2 rounded-full ${r.isActive === false ? 'bg-red-500' : 'bg-green-500'}`} />
          {r.isActive === false ? 'Inactive' : 'Active'}
        </span>
      ),
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending || uploading;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Stores"
        description="Manage sales stores for your organization."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        toolbar={
          <FilterDropdown
            label="Status"
            options={[
              { value: 'true',  label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
        }
        searchPlaceholder="Search stores…"
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Store"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Store' : 'Add Store'}
        footer={
          <>
            <Button type="submit" form="store-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={uploading}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="store-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Code">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>

          <Field label="Country">
            <Select
              value={form.countryId?.toString() ?? ''}
              onValueChange={(v) => {
                const country = countries.find((c) => c.id === Number(v));
                setForm({ ...form, countryId: Number(v), countryName: country?.name ?? '', stateId: null, stateName: '', cityName: '' });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select country…" /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="State">
            <Select
              value={form.stateId?.toString() ?? ''}
              onValueChange={(v) => {
                const state = states.find((s) => s.id === Number(v));
                setForm({ ...form, stateId: Number(v), stateName: state?.name ?? '', cityName: '' });
              }}
              disabled={!form.countryId}
            >
              <SelectTrigger><SelectValue placeholder={form.countryId ? 'Select state…' : 'Select country first'} /></SelectTrigger>
              <SelectContent>
                {states.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="City">
            <Select
              value={form.cityName}
              onValueChange={(v) => setForm({ ...form, cityName: v })}
              disabled={!form.stateId}
            >
              <SelectTrigger><SelectValue placeholder={form.stateId ? 'Select city…' : 'Select state first'} /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>

          {editing && (
            <Field label="Status">
              <Select
                value={editing.isActive === false ? 'false' : 'true'}
                onValueChange={(v) => setEditing({ ...editing, isActive: v === 'true' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Image">
            <SingleImageUploader
              serverImageKey={serverImage ? (editing?.imageKey ?? 'set') : undefined}
              pendingPreviewUrl={pendingImage?.previewUrl}
              pendingFile={pendingImage?.file}
              uploading={uploading}
              editing={!!editing}
              onFilePick={(file) => {
                if (editing) {
                  void uploadFor(editing.id, file);
                } else {
                  clearPending();
                  const previewUrl = URL.createObjectURL(file);
                  setPendingImage({ file, previewUrl });
                }
              }}
              onClearPending={clearPending}
              onRemoveServer={handleRemoveServer}
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Store"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
