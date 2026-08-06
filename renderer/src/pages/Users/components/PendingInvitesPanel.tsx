import { useState } from 'react';
import { Settings, X, Mail } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { OrgMembers } from '../../../api';
import type { OrgMemberDetail } from '../../../types';

// NEEDS BACKEND: GET /api/v1/auth/members and DELETE /api/v1/auth/members/:id
// — see docs/superpowers/plans/2026-08-04-backend-requirements.md

export function PendingInvitesTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} title="Pending invites">
        <Settings size={16} />
      </Button>
      {open && <PendingInvitesPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function PendingInvitesPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = OrgMembers.useSearch({ omitPagination: true });
  const pending = (data?.items ?? []).filter((m: OrgMemberDetail) => m.status === 'invited');
  const revokeMutation = OrgMembers.useDelete();

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 border-l border-border bg-card p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pending invites</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-xs text-muted-foreground">No pending invites.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
              <span className="flex items-center gap-1.5 truncate"><Mail size={13} className="shrink-0 text-muted-foreground" />{m.invitedEmail}</span>
              <Button variant="ghost" size="sm" onClick={() => revokeMutation.mutate(m.id)}>Revoke</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
