import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { UserRoles as UserRolesApi } from '../api';
import type { UserRole } from '../types';

interface FormState {
  userId: string;
  roleId: string;
}

const EMPTY_FORM: FormState = { userId: '', roleId: '' };

export default function UserRoles() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<UserRole | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<UserRole>) => UserRolesApi.create(body),
    onSuccess: (created) => {
      toast.success('User role assignment created');
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create user role assignment'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      userId: form.userId || undefined,
      roleId: form.roleId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for user role assignments — there's no directory here, only a create
            form. Neither Users nor Roles has a list endpoint, so both IDs below must be pasted in
            directly (e.g. from a "last created" panel on those pages).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Assignment</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created assignment</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New User Role Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ur-user">User ID</Label>
              <Input
                id="ur-user"
                placeholder="UUID"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ur-role">Role ID</Label>
              <Input
                id="ur-role"
                placeholder="UUID"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
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
