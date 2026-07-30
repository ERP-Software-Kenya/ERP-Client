import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ResourceSelect } from '../components/ResourceSelect';
import { ActivityLogs, Organizations } from '../api';
import { ACTIVITY_LOG_ACTIONS, type ActivityLog } from '../types';

interface FormState {
  organizationId: string;
  userId: string;
  action: string;
  entityName: string;
  entityId: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  userId: '',
  action: ACTIVITY_LOG_ACTIONS[0],
  entityName: '',
  entityId: '',
};

export default function ActivityLogsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<ActivityLog | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = ActivityLogs.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = ActivityLogs.useGet(activeId);

  const closeDrawer = () => setDrawerOpen(false);

  const loadLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter an activity log UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        userId: form.userId || undefined,
        action: form.action,
        entityName: form.entityName || undefined,
        entityId: form.entityId || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          setDrawerOpen(false);
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get-by-id only — no list/search directory.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Activity Log</Button>
      </div>

      <FormSection title="Look up activity log">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Activity log UUID"
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
              <p className="text-destructive">Activity log not found.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div>ID: {lookedUp.id}</div>
                <div>Action: {lookedUp.action ?? '—'}</div>
                <div>Entity: {lookedUp.entityName ?? '—'} / {lookedUp.entityId ?? '—'}</div>
              </div>
            )}
          </div>
        )}
      </FormSection>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created activity log</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Activity Log"
        footer={
          <>
            <Button type="submit" form="activity-log-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="activity-log-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Organization">
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="User ID (optional)">
            <Input
              placeholder="UUID — no user directory exists to pick from"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
            />
          </Field>
          <Field label="Action">
            <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LOG_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Entity Name" required>
            <Input
              placeholder="e.g. Product, PurchaseOrder"
              value={form.entityName}
              onChange={(e) => setForm({ ...form, entityName: e.target.value })}
              required
            />
          </Field>
          <Field label="Entity ID" required>
            <Input
              placeholder="UUID of the affected record"
              value={form.entityId}
              onChange={(e) => setForm({ ...form, entityId: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
