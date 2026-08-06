import { useState } from 'react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ClerkUsers } from '../../../api';
import type { ClerkUser } from '../../../types';

const ORG_ROLES = [
  { value: 'org:admin',  label: 'Admin'  },
  { value: 'org:member', label: 'Member' },
];

interface Props {
  user: ClerkUser | null;
  onClose: () => void;
}

export function AssignOrgDrawer({ user, onClose }: Props) {
  const [orgId, setOrgId] = useState('');
  const [role, setRole]   = useState('org:member');
  const assignMutation    = ClerkUsers.useAssignOrg();
  const { data: organizations } = ClerkUsers.useListOrganizations();

  const close = () => { setOrgId(''); setRole('org:member'); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgId.trim()) return;
    assignMutation.mutate(
      { clerkUserId: user.clerkUserId, body: { organizationId: orgId.trim(), role } },
      { onSuccess: close },
    );
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  return (
    <FormDrawer
      open={!!user}
      onClose={close}
      title="Assign to Organisation"
      subtitle={displayName}
      footer={
        <>
          <Button
            type="submit"
            form="assign-org-form"
            disabled={assignMutation.isPending || !orgId.trim()}
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="assign-org-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Organisation" required>
          <Select value={orgId || undefined} onValueChange={setOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Select organisation…" />
            </SelectTrigger>
            <SelectContent>
              {(organizations ?? []).map((org) => (
                <SelectItem key={org.organizationId} value={org.organizationId}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Role">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORG_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </form>
    </FormDrawer>
  );
}
