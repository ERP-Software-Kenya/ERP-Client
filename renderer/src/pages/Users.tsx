import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ResourceSelect } from '../components/ResourceSelect';
import { Users as UsersApi, Organizations as OrganizationsApi, Stores as StoresApi } from '../api';
import type { PlatformUser } from '../types';

interface FormState {
  organizationId: string;
  storeId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  storeId: '',
  email: '',
  passwordHash: '',
  firstName: '',
  lastName: '',
  phone: '',
  isActive: true,
};

export default function Users() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<PlatformUser | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<PlatformUser>) => UsersApi.create(body),
    onSuccess: (created) => {
      toast.success(`User "${created.email}" created`);
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create user'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      organizationId: form.organizationId || undefined,
      storeId: form.storeId || undefined,
      email: form.email || undefined,
      passwordHash: form.passwordHash || undefined,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      phone: form.phone || undefined,
      isActive: form.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for users — there's no directory here, only a create form. The
            backend expects an already-hashed password, not plaintext.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New User</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created user</div>
          <div>ID: {lastCreated.id}</div>
          <div>Email: {lastCreated.email}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New User</DialogTitle>
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
              <Label>Store (optional)</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.storeId}
                onValueChange={(v) => setForm({ ...form, storeId: v })}
                placeholder="Select store…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password-hash">Password Hash</Label>
              <Input
                id="user-password-hash"
                placeholder="Pre-hashed value — the API stores this as-is"
                value={form.passwordHash}
                onChange={(e) => setForm({ ...form, passwordHash: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-first-name">First Name</Label>
              <Input
                id="user-first-name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-last-name">Last Name</Label>
              <Input
                id="user-last-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-phone">Phone (optional)</Label>
              <Input
                id="user-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="user-active"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <Label htmlFor="user-active">Active</Label>
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
