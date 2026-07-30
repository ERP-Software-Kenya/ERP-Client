import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { OrgAddresses as OrgAddressesApi, Organizations as OrganizationsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { OrgAddress } from '../types';

interface FormState {
  organizationId: string;
  type: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isPrimary: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  type: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  isPrimary: 'false',
};

export default function OrgAddresses() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<OrgAddress | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<OrgAddress | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    OrgAddressesApi,
    'org-addresses',
    'Address',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: OrgAddress) => {
    setEditing(row);
    setForm({
      organizationId: row.organizationId ?? '',
      type: row.type ?? '',
      line1: row.line1 ?? '',
      line2: row.line2 ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      country: row.country ?? '',
      postalCode: row.postalCode ?? '',
      isPrimary: row.isPrimary ? 'true' : 'false',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<OrgAddress> = {
      organizationId: form.organizationId,
      type: form.type || undefined,
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      state: form.state || undefined,
      country: form.country,
      postalCode: form.postalCode,
      isPrimary: form.isPrimary === 'true',
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const columns: Column<OrgAddress>[] = [
    { key: 'line1', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'type', label: 'Type' },
    {
      key: 'isPrimary',
      label: 'Primary',
      render: (row) => (row.isPrimary ? 'Yes' : 'No'),
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Organization Addresses"
        description="Manage addresses linked to organizations."
        queryKey="org-addresses"
        columns={columns}
        fetchData={(params) => OrgAddressesApi.search(params)}
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
            <Button type="submit" form="org-address-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="org-address-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organization" required>
            <ResourceSelect
              queryKey="organizations"
              fetchList={() => OrganizationsApi.list()}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Type">
            <Input
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="e.g. billing, shipping"
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
          <Field label="Primary Address">
            <Select value={form.isPrimary} onValueChange={(v) => setForm({ ...form, isPrimary: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
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
