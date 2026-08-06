import { useState } from 'react';
import { Mail, Link, Plus, X } from 'lucide-react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ClerkUsers } from '../../../api';
import { PRESET_ROLES } from './UpdateRolesDrawer';
import type { InviteUserPayload } from '../../../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY: InviteUserPayload = { email: '', roles: [], redirectUrl: '' };

export function InviteUserDrawer({ open, onClose }: Props) {
  const [form, setForm] = useState<InviteUserPayload>(EMPTY);
  const [roles, setRoles] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const inviteMutation = ClerkUsers.useInvite();

  const close = () => {
    setForm(EMPTY);
    setRoles([]);
    setCustom('');
    onClose();
  };

  const toggleRole = (role: string) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const addCustomRole = () => {
    const r = custom.trim().toLowerCase();
    if (!r || roles.includes(r)) { setCustom(''); return; }
    setRoles((prev) => [...prev, r]);
    setCustom('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(
      {
        email:       form.email.trim(),
        roles:       roles.length ? roles : undefined,
        redirectUrl: form.redirectUrl?.trim() || undefined,
      },
      { onSuccess: close },
    );
  };

  return (
    <FormDrawer
      open={open}
      onClose={close}
      title="Invite User"
      subtitle="Send a Clerk email invitation. The user will be prompted to sign up."
      footer={
        <>
          <Button
            type="submit"
            form="invite-user-form"
            disabled={inviteMutation.isPending || !form.email.trim()}
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="invite-user-form" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email address" required>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="user@company.com"
              className="pl-8"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>
        </Field>

        <Field label="Roles (optional)" hint="Stored in Clerk publicMetadata.">
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_ROLES.map((r) => {
              const active = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors capitalize ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Add custom role"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustomRole}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </Field>

        <Field
          label="Redirect URL (optional)"
          hint="Where to send the user after they accept the invitation."
        >
          <div className="relative">
            <Link size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://app.example.com/welcome"
              className="pl-8"
              value={form.redirectUrl ?? ''}
              onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
            />
          </div>
        </Field>

        {roles.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Selected roles</p>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => setRoles((prev) => prev.filter((x) => x !== r))}
                    className="ml-0.5 rounded-full hover:bg-primary/20"
                    aria-label={`Remove ${r}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </form>
    </FormDrawer>
  );
}
