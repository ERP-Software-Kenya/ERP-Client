import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { UserRoles } from '../api';
import type { UserRole } from '../types';

interface FormState {
  userId: string;
  roleId: string;
}

const EMPTY_FORM: FormState = { userId: '', roleId: '' };

export default function UserRolesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<UserRole | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = UserRoles.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = UserRoles.useGet(activeId);

  const loadLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a user-role assignment UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        userId: form.userId || undefined,
        roleId: form.roleId || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          closeDrawer();
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get-by-id only — no list/search directory. Neither Users nor Roles has a list
            endpoint, so both IDs below must be pasted in directly (e.g. from a &quot;last created&quot;
            panel on those pages).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Assignment</Button>
      </div>

      <FormSection title="Look up assignment">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="User-role assignment UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadLookup}>
            Load
          </Button>
        </div>
        {activeId && (
          <div className="mt-3 text-sm">
            {lookupLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : lookupError || !lookedUp ? (
              <p className="text-destructive">Assignment not found.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div>ID: {lookedUp.id}</div>
                <div>User ID: {lookedUp.userId ?? '—'}</div>
                <div>Role ID: {lookedUp.roleId ?? '—'}</div>
              </div>
            )}
          </div>
        )}
      </FormSection>

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
