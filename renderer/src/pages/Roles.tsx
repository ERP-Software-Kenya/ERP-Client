import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ResourceSelect } from '../components/ResourceSelect';
import { Input } from '../components/ui/input';
import { Roles, Organizations } from '../api';
import { ROLE_NAMES, type Role } from '../types';

interface FormState {
  organizationId: string;
  name: string;
  permissions: string;
}

const EMPTY_FORM: FormState = { organizationId: '', name: ROLE_NAMES[0], permissions: '{}' };

export default function RolesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<Role | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = Roles.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = Roles.useGet(activeId);

  const loadLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a role UUID');
      return;
    }
    setActiveId(trimmed);
  };

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
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        name: form.name,
        permissions,
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
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get-by-id only — no list/search directory. Name is one of 4 fixed values (unique
            per role) — the backend rejects anything else. Organization and Permissions are required
            by validation but the role entity currently has no matching columns, so the backend
            accepts and silently discards them.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Role</Button>
      </div>

      <FormSection title="Look up role">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Role UUID"
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
              <p className="text-destructive">Role not found.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div>ID: {lookedUp.id}</div>
                <div>Name: {lookedUp.name}</div>
              </div>
            )}
          </div>
        )}
      </FormSection>

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
              resource={Organizations}
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
