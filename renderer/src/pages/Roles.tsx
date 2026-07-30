import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ResourceSelect } from '../components/ResourceSelect';
import { Roles as RolesApi, Organizations as OrganizationsApi } from '../api';
import { ROLE_NAMES, type Role } from '../types';

interface FormState {
  organizationId: string;
  name: string;
  permissions: string;
}

const EMPTY_FORM: FormState = { organizationId: '', name: ROLE_NAMES[0], permissions: '{}' };

export default function Roles() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<Role | null>(null);

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = useMutation({
    mutationFn: (body: Partial<Role>) => RolesApi.create(body),
    onSuccess: (created) => {
      toast.success(`Role "${created.name}" created`);
      setLastCreated(created);
      closeDrawer();
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create role'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let permissions: Record<string, unknown>;
    try {
      permissions = JSON.parse(form.permissions || '{}');
    } catch {
      setJsonError('Permissions must be valid JSON');
      return;
    }
    setJsonError(null);
    createMutation.mutate({
      organizationId: form.organizationId || undefined,
      name: form.name,
      permissions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for roles — there's no directory here, only a create form.
            Name is one of 4 fixed values (unique per role) — the backend rejects anything else.
            Organization and Permissions are required by validation but the role entity currently
            has no matching columns, so the backend accepts and silently discards them.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Role</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created role</div>
          <div>ID: {lastCreated.id}</div>
          <div>Name: {lastCreated.name}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Role"
        footer={
          <>
            <Button type="submit" form="role-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organization">
            <ResourceSelect
              queryKey="organizations"
              fetchList={() => OrganizationsApi.list()}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Name">
            <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_NAMES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Permissions (JSON)">
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              value={form.permissions}
              onChange={(e) => setForm({ ...form, permissions: e.target.value })}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
