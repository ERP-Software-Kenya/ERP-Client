import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { UserAddresses as UserAddressesApi, Users as UsersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { UserAddress } from '../types';

interface FormState {
  userId: string;
  type: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

const EMPTY_FORM: FormState = {
  userId: '',
  type: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
};

export default function UserAddresses() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<UserAddress | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    UserAddressesApi,
    'user-addresses',
    'Address',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: UserAddress) => {
    setEditing(row);
    setForm({
      userId: row.userId ?? '',
      type: row.type ?? '',
      line1: row.line1 ?? '',
      line2: row.line2 ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      country: row.country ?? '',
      postalCode: row.postalCode ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<UserAddress> = {
      userId: form.userId,
      type: form.type || undefined,
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      state: form.state || undefined,
      country: form.country,
      postalCode: form.postalCode,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const columns: Column<UserAddress>[] = [
    { key: 'line1', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'type', label: 'Type' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="User Addresses"
        description="Manage addresses linked to users."
        queryKey="user-addresses"
        columns={columns}
        fetchData={(params) => UserAddressesApi.search(params)}
        searchPlaceholder="Search addresses…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Address' : 'Add Address'}
        footer={
          <>
            <Button type="submit" form="user-address-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="user-address-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="User" required>
            <ResourceSelect
              queryKey="users"
              fetchList={() => UsersApi.list()}
              getLabel={(u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id}
              value={form.userId}
              onValueChange={(v) => setForm({ ...form, userId: v })}
              placeholder="Select user…"
            />
          </Field>
          <Field label="Type">
            <Input
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="e.g. home, work"
            />
          </Field>
          <Field label="Address Line 1" required>
            <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required autoFocus />
          </Field>
          <Field label="Address Line 2">
            <Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country" required>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
            </Field>
            <Field label="Postal Code" required>
              <Input
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                required
              />
            </Field>
          </div>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Address"
        description={`Delete "${deleteTarget?.line1}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
