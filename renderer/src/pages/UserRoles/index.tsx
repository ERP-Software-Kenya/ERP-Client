import { useState, useMemo } from 'react';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { UserRoles, useListUserRoles, useListRoles, useListUserDirectory } from '../../api';
import { loadErrorMessage } from '../../lib/api-error';
import type { UserRole } from '../../types';

interface FormState {
  userId: string;
  roleId: string;
}

const EMPTY: FormState = { userId: '', roleId: '' };

export default function UserRolesPage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(1);

  const { data: assignments = [], isLoading, error, refetch } = useListUserRoles();
  const { data: roles = [] } = useListRoles();
  const { data: users = [] } = useListUserDirectory();
  const createMutation = UserRoles.useCreate();

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r.name ?? r.id])), [roles]);
  const userById = useMemo(
    () => new Map(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id])),
    [users],
  );

  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.userId || !form.roleId) return;
    createMutation.mutate(
      { userId: form.userId, roleId: form.roleId } as Partial<UserRole>,
      {
        onSuccess: () => {
          void refetch();
          closeDrawer();
          setForm(EMPTY);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <DataTable<UserRole>
        title="User Role Assignments"
        description="Manage which roles are assigned to each user in your organisation."
        columns={[
          {
            key: 'userId',
            label: 'User',
            render: (r) => <span className="font-medium">{r.userId ? (userById.get(r.userId) ?? r.userId) : '—'}</span>,
          },
          {
            key: 'roleId',
            label: 'Role',
            render: (r) => {
              const name = r.roleId ? (roleById.get(r.roleId) ?? r.roleId) : '—';
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {name}
                </span>
              );
            },
          },
          {
            key: 'id',
            label: 'ID',
            render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id}</span>,
          },
          {
            key: 'createdAt',
            label: 'Assigned',
            render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'),
          },
        ]}
        rows={assignments}
        total={assignments.length}
        page={page}
        loading={isLoading}
        error={error ? loadErrorMessage(error, 'assignments') : null}
        onPageChange={setPage}
        hideSearch
        onRefetch={() => void refetch()}
        onAdd={() => setDrawerOpen(true)}
        addLabel="New Assignment"
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New User Role Assignment"
        footer={
          <>
            <Button
              type="submit"
              form="user-role-form"
              disabled={createMutation.isPending || !form.userId || !form.roleId}
            >
              {createMutation.isPending ? 'Creating…' : 'Assign'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="user-role-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="User" required>
            <Select value={form.userId || undefined} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select user…" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role" required>
            <Select value={form.roleId || undefined} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role…" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
