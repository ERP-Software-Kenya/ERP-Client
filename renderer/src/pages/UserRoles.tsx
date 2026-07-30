import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { UserRoles as UserRolesApi } from '../api';
import type { UserRole } from '../types';

interface FormState {
  userId: string;
  roleId: string;
}

const EMPTY_FORM: FormState = { userId: '', roleId: '' };

export default function UserRoles() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<UserRole | null>(null);

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = useMutation({
    mutationFn: (body: Partial<UserRole>) => UserRolesApi.create(body),
    onSuccess: (created) => {
      toast.success('User role assignment created');
      setLastCreated(created);
      closeDrawer();
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create user role assignment'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      userId: form.userId || undefined,
      roleId: form.roleId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for user role assignments — there's no directory here, only a create
            form. Neither Users nor Roles has a list endpoint, so both IDs below must be pasted in
            directly (e.g. from a "last created" panel on those pages).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Assignment</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created assignment</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New User Role Assignment"
        footer={
          <>
            <Button type="submit" form="user-role-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="user-role-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="User ID" required>
            <Input
              placeholder="UUID"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              required
            />
          </Field>
          <Field label="Role ID" required>
            <Input
              placeholder="UUID"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
