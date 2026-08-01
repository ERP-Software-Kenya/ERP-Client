import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { RecentRecords } from '../components/RecentRecords';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PlatformConfigurations, get } from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { PlatformConfiguration } from '../types';

interface FormState {
  configKey: string;
  configValue: string;
  description: string;
}

const EMPTY_FORM: FormState = { configKey: '', configValue: '{}', description: '' };

function configLabel(config: Pick<PlatformConfiguration, 'id' | 'configKey'>) {
  const key = config.configKey?.trim();
  if (key) return key;
  return formatEntityLabel({ id: config.id });
}

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function PlatformConfigurationsPage() {
  const recent = useRecentIds(RECENT_NS.platformConfigurations);
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

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['platform-configurations', e.id] as const,
      queryFn: () => get<PlatformConfiguration>(`/api/v1/platform-configurations/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(
    () =>
      recent.entries.map((e, i) => {
        const q = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
        const data = q?.data;
        return {
          id: e.id,
          label: e.label,
          savedAt: e.savedAt,
          configKey: data?.configKey,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(loaded.id, configLabel(loaded));
  }, [activeId, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter a configuration ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadLookup = () => loadById(lookupId);

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
          recent.push(created.id, configLabel(created));
          setDrawerOpen(false);
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Configurations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create configurations and reopen recent ones saved in this browser.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Configuration</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        API gap: no list/search directory — use Recent, create, or Advanced load by ID.
      </p>

      <RecentRecords
        title="Recent configurations"
        emptyHint="No recent configurations yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'key',
            header: 'Key',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || 'unavailable';
              return r.configKey || r.label || '—';
            },
          },
          {
            key: 'saved',
            header: 'Saved',
            render: (r) => new Date(r.savedAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => loadById(r.id)}>
                  Open
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        onClear={recent.clear}
      />

      <AdvancedIdLookup
        entityLabel="configuration"
        value={lookupId}
        onChange={setLookupId}
        onLoad={loadLookup}
      />

      {activeId && (
        <FormSection title="Configuration">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">Configuration not found.</p>
          ) : (
            <div className="grid gap-2 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Key:</span> {lookedUp.configKey ?? '—'}
              </p>
              {lookedUp.description ? (
                <p>
                  <span className="text-muted-foreground">Description:</span> {lookedUp.description}
                </p>
              ) : null}
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created configuration</div>
          <div>{configLabel(lastCreated)}</div>
          <div className="flex flex-wrap items-center gap-2">
            ID: {lastCreated.id}
            <Button type="button" variant="outline" size="sm" onClick={() => copyId(lastCreated.id)}>
              Copy
            </Button>
          </div>
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
