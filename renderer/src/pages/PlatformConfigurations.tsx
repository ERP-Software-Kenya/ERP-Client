import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PlatformConfigurations as PlatformConfigurationsApi } from '../api';
import type { PlatformConfiguration } from '../types';

interface FormState {
  configKey: string;
  configValue: string;
  description: string;
}

const EMPTY_FORM: FormState = { configKey: '', configValue: '{}', description: '' };

export default function PlatformConfigurations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<PlatformConfiguration | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<PlatformConfiguration>) => PlatformConfigurationsApi.create(body),
    onSuccess: (created) => {
      toast.success('Platform configuration created');
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create platform configuration'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let configValue: Record<string, unknown>;
    try {
      configValue = JSON.parse(form.configValue || '{}');
    } catch {
      setJsonError('Config value must be valid JSON');
      return;
    }
    setJsonError(null);
    createMutation.mutate({
      configKey: form.configKey || undefined,
      configValue,
      description: form.description || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Configurations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for platform configurations — there's no directory here, only a create form.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Configuration</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created configuration</div>
          <div>ID: {lastCreated.id}</div>
          <div>Key: {lastCreated.configKey}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Platform Configuration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-key">Config Key</Label>
              <Input
                id="cfg-key"
                value={form.configKey}
                onChange={(e) => setForm({ ...form, configKey: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-value">Config Value (JSON)</Label>
              <textarea
                id="cfg-value"
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                value={form.configValue}
                onChange={(e) => setForm({ ...form, configValue: e.target.value })}
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-description">Description (optional)</Label>
              <Input
                id="cfg-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
