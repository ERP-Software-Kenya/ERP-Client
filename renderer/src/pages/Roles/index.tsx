import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Roles, useListRoles } from '../../api';
import { loadErrorMessage } from '../../lib/api-error';
import { ROLE_NAMES, type Role } from '../../types';

const ROLE_BADGE: Record<string, string> = {
  super_admin:    'bg-red-500/10 text-red-500',
  org_admin:      'bg-purple-500/10 text-purple-500',
  branch_manager: 'bg-amber-500/10 text-amber-500',
  driver:         'bg-orange-500/10 text-orange-500',
  packer:         'bg-teal-500/10 text-teal-600',
};

interface FormState {
  name: string;
}

const EMPTY: FormState = { name: ROLE_NAMES[0] };

export default function RolesPage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(1);

  const { data: roles = [], isLoading, error, refetch } = useListRoles();
  const createMutation = Roles.useCreate();

  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    createMutation.mutate(
      { name: form.name } as Partial<Role>,
      {
        onSuccess: () => {
          void refetch();
          closeDrawer();
          setForm(EMPTY);
        },
      },
    );
  };

  const rows = roles.map((r) => ({ ...r, id: r.id }));

  return (
    <div className="space-y-4">
      <DataTable<Role & { id: string }>
        title="Roles"
        description="System roles assigned to users within your organisation."
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (r) => (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[r.name ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                <ShieldCheck size={11} />
                {r.name ? r.name.replace(/_/g, ' ') : '—'}
              </span>
            ),
          },
          {
            key: 'id',
            label: 'ID',
            render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id}</span>,
          },
        ]}
        rows={rows}
        total={rows.length}
        page={page}
        loading={isLoading}
        error={error ? loadErrorMessage(error, 'roles') : null}
        onPageChange={setPage}
        hideSearch
        onRefetch={() => void refetch()}
        onAdd={() => setDrawerOpen(true)}
        addLabel="New Role"
        footerNote="Roles are fixed system values."
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Role"
        footer={
          <>
            <Button type="submit" form="role-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Select value={form.name} onValueChange={(v) => setForm({ name: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_NAMES.map((n) => (
                  <SelectItem key={n} value={n} className="capitalize">{n.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
