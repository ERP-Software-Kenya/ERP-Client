import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ResourceSelect } from '../components/ResourceSelect';
import { ActivityLogs as ActivityLogsApi, Organizations as OrganizationsApi } from '../api';
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

export default function ActivityLogs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<ActivityLog | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<ActivityLog>) => ActivityLogsApi.create(body),
    onSuccess: (created) => {
      toast.success('Activity log created');
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create activity log'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      organizationId: form.organizationId || undefined,
      userId: form.userId || undefined,
      action: form.action,
      entityName: form.entityName || undefined,
      entityId: form.entityId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for activity logs — there's no directory here, only a create form.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Activity Log</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created activity log</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Activity Log</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <ResourceSelect
                queryKey="organizations"
                fetchList={() => OrganizationsApi.list()}
                getLabel={(org) => org.name}
                value={form.organizationId}
                onValueChange={(v) => setForm({ ...form, organizationId: v })}
                placeholder="Select organization…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-user">User ID (optional)</Label>
              <Input
                id="log-user"
                placeholder="UUID — no user directory exists to pick from"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-entity-name">Entity Name</Label>
              <Input
                id="log-entity-name"
                placeholder="e.g. Product, PurchaseOrder"
                value={form.entityName}
                onChange={(e) => setForm({ ...form, entityName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-entity-id">Entity ID</Label>
              <Input
                id="log-entity-id"
                placeholder="UUID of the affected record"
                value={form.entityId}
                onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
