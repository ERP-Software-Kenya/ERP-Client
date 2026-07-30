import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PlatformConfigurations as PlatformConfigurationsApi } from '../api';
import type { PlatformConfiguration } from '../types';

interface FormState {
  configKey: string;
  configValue: string;
  description: string;
}

const EMPTY_FORM: FormState = { configKey: '', configValue: '{}', description: '' };

export default function PlatformConfigurations() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<PlatformConfiguration | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<PlatformConfiguration>) => PlatformConfigurationsApi.create(body),
    onSuccess: (created) => {
      toast.success('Platform configuration created');
      setLastCreated(created);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create platform configuration'),
  });

  const closeDrawer = () => setDrawerOpen(false);

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
        <Button onClick={() => setDrawerOpen(true)}>New Configuration</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created configuration</div>
          <div>ID: {lastCreated.id}</div>
          <div>Key: {lastCreated.configKey}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Platform Configuration"
        footer={
          <>
            <Button type="submit" form="platform-config-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="platform-config-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Config Key" required>
            <Input
              value={form.configKey}
              onChange={(e) => setForm({ ...form, configKey: e.target.value })}
              required
            />
          </Field>
          <Field label="Config Value (JSON)">
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              value={form.configValue}
              onChange={(e) => setForm({ ...form, configValue: e.target.value })}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </Field>
          <Field label="Description (optional)">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
