import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { StockTransfers as StockTransfersApi, Stores as StoresApi, Organizations as OrganizationsApi } from '../api';
import type { StockTransfer } from '../types';

// Status has no real backend enum — StockTransferEntity.status is a plain
// varchar defaulting to 'PENDING', not the Draft/In-Transit/Received the spec
// assumed. Sending one of these is a product choice, not a confirmed contract —
// see docs/core-apis-fixes.md #3.
const STATUS_OPTIONS = ['Draft', 'In-Transit', 'Received'];

interface FormState {
  organization_id: string;
  from_store_id: string;
  to_store_id: string;
  status: string;
}

const EMPTY_FORM: FormState = { organization_id: '', from_store_id: '', to_store_id: '', status: STATUS_OPTIONS[0] };

export default function StockTransfers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<StockTransfer | null>(null);

  // Wired up and ready, but the submit button below stays disabled: live-tested
  // 2026-07-26 and POST /stock-transfers 500s ("Internal server error") against
  // the deployed backend despite looking clean from source — see
  // docs/core-apis-fixes.md #3. Remove the `disabled` prop once that's fixed.
  const createMutation = useMutation({
    mutationFn: (body: Partial<StockTransfer>) => StockTransfersApi.create(body),
    onSuccess: (created) => {
      toast.success(`Stock transfer ${created.transferNumber} created`);
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create stock transfer'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      organizationId: form.organization_id || undefined,
      fromStoreId: form.from_store_id || undefined,
      toStoreId: form.to_store_id || undefined,
      status: form.status,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Transfers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Move stock between stores. No line-item support yet — a transfer today is a
            header/status record only (see docs/superpowers/specs/2026-07-23-erp-implementation-04-inventory-transactions.md).
            No list endpoint exists, so there's no directory here — only the most recently created transfer is shown below.
            <span className="text-amber-500 font-medium"> Currently blocked</span> — creating a
            transfer fails on the backend (core-apis 500, see docs/core-apis-fixes.md #3). This form
            is ready to use once that's fixed.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Stock Transfer</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created transfer</div>
          <div>Transfer #: {lastCreated.transferNumber}</div>
          <div>Status: {lastCreated.status}</div>
          <div>From store: {lastCreated.fromStoreId}</div>
          <div>To store: {lastCreated.toStoreId}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request.
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <ResourceSelect
                queryKey="organizations"
                fetchList={() => OrganizationsApi.list()}
                getLabel={(o) => o.name}
                value={form.organization_id}
                onValueChange={(v) => setForm({ ...form, organization_id: v })}
                placeholder="Select organization…"
              />
            </div>
            <div className="space-y-2">
              <Label>From store</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.from_store_id}
                onValueChange={(v) => setForm({ ...form, from_store_id: v })}
                placeholder="Select source store…"
              />
            </div>
            <div className="space-y-2">
              <Label>To store</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.to_store_id}
                onValueChange={(v) => setForm({ ...form, to_store_id: v })}
                placeholder="Select destination store…"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled>
                Create (blocked — see notice above)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
