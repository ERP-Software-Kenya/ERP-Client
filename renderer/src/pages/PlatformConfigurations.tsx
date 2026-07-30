import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PlatformConfigurations } from '../api';
import type { PlatformConfiguration } from '../types';

interface FormState {
  configKey: string;
  configValue: string;
  description: string;
}

const EMPTY_FORM: FormState = { configKey: '', configValue: '{}', description: '' };

export default function PlatformConfigurationsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<PlatformConfiguration | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = PlatformConfigurations.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } =
    PlatformConfigurations.useGet(activeId);

  const closeDrawer = () => setDrawerOpen(false);

  const loadLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a configuration UUID');
      return;
    }
    setActiveId(trimmed);
  };

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
    createMutation.mutate(
      {
        configKey: form.configKey || undefined,
        configValue,
        description: form.description || undefined,
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
          <h1 className="text-2xl font-semibold">Platform Configurations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get-by-id only — no list/search directory.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Configuration</Button>
      </div>

      <FormSection title="Look up configuration">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Configuration UUID"
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
              <p className="text-destructive">Configuration not found.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div>ID: {lookedUp.id}</div>
                <div>Key: {lookedUp.configKey}</div>
              </div>
            )}
          </div>
        )}
      </FormSection>

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
