# User Management — Frontend Implementation Guide

> **Scope:** Full Clerk-backed user management for the current organisation.  
> Covers: types → API hooks → `UsersPage` redesign → `UserDetailPage` → routing/sidebar wiring.  
> All code follows the existing patterns: `DataTable`, `FilterDropdown`, `ConfirmDialog`, `FormDrawer`, `ViewDrawer`, `extraRowActions`, `usePagination`, `react-query`, `sonner` toasts.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [New TypeScript Types](#2-new-typescript-types)
3. [API Hooks — `api.ts` additions](#3-api-hooks--apits-additions)
4. [Reusable Sub-components](#4-reusable-sub-components)
   - 4a. `UserStatusBadge`
   - 4b. `UserRolePills`
   - 4c. `InviteUserDrawer`
   - 4d. `UpdateRolesDrawer`
   - 4e. `AssignOrgDrawer`
5. [UsersPage — Full Rewrite](#5-userspage--full-rewrite)
6. [UserDetailPage — View Page](#6-userdetailpage--view-page)
7. [Router & Sidebar Wiring](#7-router--sidebar-wiring)
8. [API Endpoint Reference](#8-api-endpoint-reference)
9. [UX Decisions & Edge Cases](#9-ux-decisions--edge-cases)

---

## 1. Architecture Overview

```
UsersPage  (/users)
│
├── DataTable
│   ├── toolbar: FilterDropdown (Status: All / Active / Inactive)
│   │            + "Invite User" Button
│   ├── columns: Avatar · Name · Username(email) · Email · Status · Roles · Actions
│   └── extraRowActions per row:
│       ├── View → navigate /users/clerk/:clerkUserId
│       ├── Edit Roles → UpdateRolesDrawer
│       ├── Ban / Unban → ConfirmDialog
│       ├── Assign to Org → AssignOrgDrawer
│       └── Delete → ConfirmDialog (destructive)
│
├── InviteUserDrawer   (FormDrawer)
├── UpdateRolesDrawer  (FormDrawer)
├── AssignOrgDrawer    (FormDrawer)
├── ConfirmDialog × 3  (ban / unban / delete)
│
UserDetailPage  (/users/clerk/:clerkUserId)
└── Read-only rich card: avatar, name, email, status, roles, org memberships, timestamps
```

All mutations invalidate `['clerk-users']` so the table auto-refreshes.

---

## 2. New TypeScript Types

Add to `renderer/src/types.ts`:

```ts
// ── Clerk User Management ─────────────────────────────────────────────────────

export interface ClerkUser {
  /** Clerk's own user ID, e.g. "user_xxx" */
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  banned: boolean;
  /** Stored in Clerk publicMetadata.roles */
  roles: string[];
  /** Unix ms timestamp */
  createdAt: number;
  lastSignInAt: number | null;
}

export interface ClerkUserListResponse {
  data: ClerkUser[];
  totalCount: number;
}

export interface ClerkUserRolesResponse {
  clerkUserId: string;
  roles: string[];
}

// ── Invite / mutation payloads ────────────────────────────────────────────────

export interface InviteUserPayload {
  email: string;
  roles?: string[];
  redirectUrl?: string;
}

export interface UpdateRolesPayload {
  roles: string[];
}

export interface AssignOrgPayload {
  organizationId: string;
  /** Clerk role slug: "org:admin" | "org:member" */
  role: string;
}
```

---

## 3. API Hooks — `api.ts` additions

Add the following block **after** the existing `Users` export in `renderer/src/api.ts`:

```ts
import type {
  ClerkUser,
  ClerkUserListResponse,
  ClerkUserRolesResponse,
  InviteUserPayload,
  UpdateRolesPayload,
  AssignOrgPayload,
} from './types';

// ── Clerk User Management ─────────────────────────────────────────────────────

const CLERK_USERS_KEY = 'clerk-users';

export const ClerkUsers = {
  /**
   * List all users in Clerk, scoped to an organisation when organizationId is provided.
   * Maps to GET /api/v1/users?limit=&offset=&organizationId=
   */
  useList(params: {
    page: number;
    limit?: number;
    organizationId?: string;
    enabled?: boolean;
  }) {
    const limit = params.limit ?? 15;
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'list', params.page, limit, params.organizationId],
      queryFn: () =>
        get<ClerkUserListResponse>('/api/v1/users', {
          limit,
          offset: (params.page - 1) * limit,
          ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        }),
      enabled: params.enabled !== false,
      staleTime: 30_000,
    });
  },

  /**
   * Search users by name / email.
   * Maps to GET /api/v1/users/search?query=&limit=&offset=
   */
  useSearch(params: {
    query: string;
    page: number;
    limit?: number;
    enabled?: boolean;
  }) {
    const limit = params.limit ?? 15;
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'search', params.query, params.page, limit],
      queryFn: () =>
        get<ClerkUserListResponse>('/api/v1/users/search', {
          query: params.query,
          limit,
          offset: (params.page - 1) * limit,
        }),
      enabled: params.enabled !== false && params.query.trim().length > 0,
      staleTime: 15_000,
    });
  },

  /**
   * Get roles for a single Clerk user.
   * Maps to GET /api/v1/users/clerk/:clerkUserId/roles
   */
  useGetRoles(clerkUserId: string | undefined) {
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'roles', clerkUserId],
      queryFn: () =>
        get<ClerkUserRolesResponse>(`/api/v1/users/clerk/${clerkUserId as string}/roles`),
      enabled: !!clerkUserId,
      staleTime: 30_000,
    });
  },

  /** POST /api/v1/users/clerk/invite */
  useInvite() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: InviteUserPayload) =>
        post<void>('/api/v1/users/clerk/invite', body),
      onSuccess: () => {
        toast.success('Invitation sent');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/roles */
  useUpdateRoles() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, body }: { clerkUserId: string; body: UpdateRolesPayload }) =>
        put<void>(`/api/v1/users/clerk/${clerkUserId}/roles`, body),
      onSuccess: () => {
        toast.success('Roles updated');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to update roles'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/ban */
  useBan() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) =>
        put<void>(`/api/v1/users/clerk/${clerkUserId}/ban`, {}),
      onSuccess: () => {
        toast.success('User banned');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to ban user'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/unban */
  useUnban() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) =>
        put<void>(`/api/v1/users/clerk/${clerkUserId}/unban`, {}),
      onSuccess: () => {
        toast.success('User unbanned');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to unban user'),
    });
  },

  /** DELETE /api/v1/users/clerk/:clerkUserId */
  useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) =>
        del<void>(`/api/v1/users/clerk/${clerkUserId}`),
      onSuccess: () => {
        toast.success('User deleted');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to delete user'),
    });
  },

  /** POST /api/v1/users/clerk/:clerkUserId/organizations */
  useAssignOrg() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        clerkUserId,
        body,
      }: {
        clerkUserId: string;
        body: AssignOrgPayload;
      }) =>
        post<void>(`/api/v1/users/clerk/${clerkUserId}/organizations`, body),
      onSuccess: () => {
        toast.success('User assigned to organisation');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to assign to organisation'),
    });
  },

  /** DELETE /api/v1/users/clerk/:clerkUserId/organizations/:organizationId */
  useRemoveFromOrg() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        clerkUserId,
        organizationId,
      }: {
        clerkUserId: string;
        organizationId: string;
      }) =>
        del<void>(`/api/v1/users/clerk/${clerkUserId}/organizations/${organizationId}`),
      onSuccess: () => {
        toast.success('User removed from organisation');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) =>
        toast.error(err.message || 'Failed to remove from organisation'),
    });
  },
};
```

> **Note:** `put` is already exported from `./lib/http`. If it isn't, add:  
> `export const put = <T>(path: string, body: unknown, params?: QueryParams) => ...` following the same pattern as `post`.

---

## 4. Reusable Sub-components

Create each as its own file under `renderer/src/components/`.

### 4a. `UserStatusBadge.tsx`

```tsx
// renderer/src/components/UserStatusBadge.tsx
import { cn } from '../lib/utils';

interface Props {
  active: boolean;
  banned?: boolean;
}

export function UserStatusBadge({ active, banned }: Props) {
  if (banned) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
        Banned
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        active
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
```

### 4b. `UserRolePills.tsx`

```tsx
// renderer/src/components/UserRolePills.tsx
import { cn } from '../lib/utils';

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  manager: 'bg-blue-500/10   text-blue-600   dark:text-blue-400',
  viewer:  'bg-sky-500/10    text-sky-600    dark:text-sky-400',
};

function roleColor(role: string) {
  return ROLE_COLORS[role.toLowerCase()] ?? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';
}

interface Props {
  roles: string[];
  max?: number;
}

export function UserRolePills({ roles, max = 3 }: Props) {
  if (!roles.length) {
    return <span className="text-xs text-muted-foreground">No roles</span>;
  }
  const visible  = roles.slice(0, max);
  const overflow = roles.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((r) => (
        <span
          key={r}
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            roleColor(r),
          )}
        >
          {r}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}
```

### 4c. `InviteUserDrawer.tsx`

```tsx
// renderer/src/components/InviteUserDrawer.tsx
import { useState } from 'react';
import { Mail, Tags, Link } from 'lucide-react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ClerkUsers } from '../api';
import type { InviteUserPayload } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY: InviteUserPayload = { email: '', roles: [], redirectUrl: '' };

export function InviteUserDrawer({ open, onClose }: Props) {
  const [form, setForm] = useState<InviteUserPayload>(EMPTY);
  const [rolesInput, setRolesInput] = useState('');
  const inviteMutation = ClerkUsers.useInvite();

  const close = () => {
    setForm(EMPTY);
    setRolesInput('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roles = rolesInput
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);

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
        {/* Email */}
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

        {/* Roles */}
        <Field
          label="Roles (optional)"
          hint="Comma-separated. e.g. admin, manager, viewer — stored in Clerk publicMetadata."
        >
          <div className="relative">
            <Tags size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="admin, manager"
              className="pl-8"
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
            />
          </div>
        </Field>

        {/* Redirect URL */}
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

        {/* Preview pill */}
        {rolesInput.trim() && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Role preview</p>
            <div className="flex flex-wrap gap-1.5">
              {rolesInput
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean)
                .map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {r}
                  </span>
                ))}
            </div>
          </div>
        )}
      </form>
    </FormDrawer>
  );
}
```

### 4d. `UpdateRolesDrawer.tsx`

```tsx
// renderer/src/components/UpdateRolesDrawer.tsx
import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ClerkUsers } from '../api';
import type { ClerkUser } from '../types';

interface Props {
  user: ClerkUser | null;
  onClose: () => void;
}

const PRESET_ROLES = ['admin', 'manager', 'viewer', 'accountant', 'warehouse'];

export function UpdateRolesDrawer({ user, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom]     = useState('');
  const updateMutation = ClerkUsers.useUpdateRoles();

  useEffect(() => {
    setSelected(user?.roles ?? []);
    setCustom('');
  }, [user]);

  const toggle = (role: string) =>
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  const addCustom = () => {
    const r = custom.trim().toLowerCase();
    if (!r || selected.includes(r)) { setCustom(''); return; }
    setSelected((prev) => [...prev, r]);
    setCustom('');
  };

  const handleSave = () => {
    if (!user) return;
    updateMutation.mutate(
      { clerkUserId: user.clerkUserId, body: { roles: selected } },
      { onSuccess: onClose },
    );
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  return (
    <FormDrawer
      open={!!user}
      onClose={onClose}
      title="Edit Roles"
      subtitle={displayName}
      footer={
        <>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save Roles'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Preset toggle chips */}
        <Field label="Preset roles">
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_ROLES.map((r) => {
              const active = selected.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
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
        </Field>

        {/* Custom role input */}
        <Field label="Add custom role">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. auditor"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustom}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </Field>

        {/* Currently selected */}
        <Field label="Current selection">
          {selected.length === 0 ? (
            <p className="text-xs text-muted-foreground">No roles assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selected.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => setSelected((p) => p.filter((x) => x !== r))}
                    className="ml-0.5 rounded-full hover:bg-primary/20"
                    aria-label={`Remove ${r}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>
    </FormDrawer>
  );
}
```

### 4e. `AssignOrgDrawer.tsx`

```tsx
// renderer/src/components/AssignOrgDrawer.tsx
import { useState } from 'react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ClerkUsers } from '../api';
import type { ClerkUser } from '../types';

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
        <Field label="Organisation ID" required hint="Clerk org ID — starts with org_">
          <Input
            placeholder="org_xxxxxxxxxxxx"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
            autoFocus
          />
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
```

---

## 5. UsersPage — Full Rewrite

Replace `renderer/src/pages/Users.tsx` entirely:

```tsx
// renderer/src/pages/Users.tsx
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldBan, ShieldCheck, ShieldOff, UserX, UserPlus, Tags,
  Building2, LogOut,
} from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { FilterDropdown } from '../components/FilterDropdown';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { UserRolePills } from '../components/UserRolePills';
import { InviteUserDrawer } from '../components/InviteUserDrawer';
import { UpdateRolesDrawer } from '../components/UpdateRolesDrawer';
import { AssignOrgDrawer } from '../components/AssignOrgDrawer';
import { Button } from '../components/ui/button';
import { ClerkUsers } from '../api';
import { useAuth } from '../context/AuthContext';
import { usePagination } from '../hooks/usePagination';
import type { ClerkUser } from '../types';
import type { ExtraAction } from '../components/RowActionsMenu';

// ── Status filter options ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active'   },
  { value: 'inactive', label: 'Inactive' },
  { value: 'banned',   label: 'Banned'   },
];

// ── Column definitions ────────────────────────────────────────────────────────

function buildColumns(): Column<ClerkUser>[] {
  return [
    {
      key: 'avatar',
      label: '',
      width: '44px',
      render: (row) => (
        <img
          src={row.imageUrl}
          alt={row.firstName ?? row.email}
          className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                [row.firstName, row.lastName].filter(Boolean).join('+') || row.email,
              )}&background=random&size=64`;
          }}
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => {
        const name = [row.firstName, row.lastName].filter(Boolean).join(' ');
        return name ? (
          <span className="font-medium">{name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-muted-foreground">{row.email || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <UserStatusBadge active={!row.banned} banned={row.banned} />
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (row) => <UserRolePills roles={row.roles} />,
    },
    {
      key: 'lastSignInAt',
      label: 'Last Sign In',
      render: (row) =>
        row.lastSignInAt
          ? new Date(row.lastSignInAt).toLocaleDateString()
          : <span className="text-muted-foreground">Never</span>,
    },
  ];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const orgId      = user?.organization?.id;

  // ── Pagination & search ──
  const { page, setPage, debouncedSearch, setSearch } = usePagination();

  // ── Local UI state ───────
  const [statusFilter,  setStatusFilter]  = useState<string | null>(null);
  const [inviteOpen,    setInviteOpen]    = useState(false);
  const [rolesTarget,   setRolesTarget]   = useState<ClerkUser | null>(null);
  const [assignTarget,  setAssignTarget]  = useState<ClerkUser | null>(null);
  const [banTarget,     setBanTarget]     = useState<ClerkUser | null>(null);
  const [unbanTarget,   setUnbanTarget]   = useState<ClerkUser | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<ClerkUser | null>(null);

  // ── Data fetching ────────
  const isSearching = debouncedSearch.trim().length > 0;

  const listQuery = ClerkUsers.useList({
    page,
    organizationId: orgId,
    enabled: !isSearching,
  });

  const searchQuery = ClerkUsers.useSearch({
    query: debouncedSearch,
    page,
    enabled: isSearching,
  });

  const activeQuery  = isSearching ? searchQuery : listQuery;
  const rawRows      = activeQuery.data?.data ?? [];
  const rawTotal     = activeQuery.data?.totalCount ?? 0;

  // ── Client-side status filter (Clerk list API doesn't support banned filter) ──
  const filteredRows = useMemo(() => {
    if (!statusFilter) return rawRows;
    if (statusFilter === 'banned')   return rawRows.filter((r) => r.banned);
    if (statusFilter === 'active')   return rawRows.filter((r) => !r.banned);
    if (statusFilter === 'inactive') return rawRows.filter((r) => !r.banned); // extend if isActive field available
    return rawRows;
  }, [rawRows, statusFilter]);

  // ── Mutations ────────────
  const banMutation    = ClerkUsers.useBan();
  const unbanMutation  = ClerkUsers.useUnban();
  const deleteMutation = ClerkUsers.useDelete();

  // ── Row action builder ───
  const extraRowActions = useCallback(
    (row: ClerkUser): ExtraAction[] => [
      {
        label:    'Edit Roles',
        icon:     <Tags size={14} />,
        onSelect: () => setRolesTarget(row),
      },
      {
        label:    'Assign to Org',
        icon:     <Building2 size={14} />,
        onSelect: () => setAssignTarget(row),
      },
      row.banned
        ? {
            label:    'Unban User',
            icon:     <ShieldCheck size={14} />,
            onSelect: () => setUnbanTarget(row),
          }
        : {
            label:     'Ban User',
            icon:      <ShieldBan size={14} />,
            onSelect:  () => setBanTarget(row),
            destructive: true,
          },
    ],
    [],
  );

  // ── Toolbar ──────────────
  const toolbar = (
    <>
      <FilterDropdown
        label="Status"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={setStatusFilter}
        align="start"
      />
      <Button size="sm" onClick={() => setInviteOpen(true)}>
        <UserPlus size={14} /> Invite User
      </Button>
    </>
  );

  const columns = useMemo(() => buildColumns(), []);

  return (
    <div className="flex h-full flex-col gap-0">
      <DataTable<ClerkUser>
        title="Users"
        description={
          orgId
            ? `Clerk users in your organisation — ${rawTotal} total`
            : 'All Clerk users'
        }
        columns={columns}
        rows={filteredRows}
        total={statusFilter ? filteredRows.length : rawTotal}
        page={page}
        loading={activeQuery.isLoading}
        error={activeQuery.error ? String(activeQuery.error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void activeQuery.refetch()}
        searchPlaceholder="Search by name or email…"
        toolbar={toolbar}
        isAdmin={true}
        onView={(row) => navigate(`/users/clerk/${row.clerkUserId}`)}
        onDelete={(row) => setDeleteTarget(row)}
        extraRowActions={extraRowActions}
        footerNote={
          statusFilter
            ? `Showing filtered results — clear the Status filter to see all ${rawTotal} users`
            : undefined
        }
      />

      {/* ── Drawers ─────────────────────────────────────────────────────────── */}
      <InviteUserDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <UpdateRolesDrawer
        user={rolesTarget}
        onClose={() => setRolesTarget(null)}
      />

      <AssignOrgDrawer
        user={assignTarget}
        onClose={() => setAssignTarget(null)}
      />

      {/* ── Confirm: Ban ────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!banTarget}
        onOpenChange={(open) => !open && setBanTarget(null)}
        title="Ban User"
        description={`Ban "${banTarget ? ([banTarget.firstName, banTarget.lastName].filter(Boolean).join(' ') || banTarget.email) : ''}"? They will immediately lose access to all sessions.`}
        confirmLabel="Ban User"
        pendingLabel="Banning…"
        confirmVariant="destructive"
        isPending={banMutation.isPending}
        onConfirm={() =>
          banTarget &&
          banMutation.mutate(banTarget.clerkUserId, {
            onSuccess: () => setBanTarget(null),
          })
        }
      />

      {/* ── Confirm: Unban ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!unbanTarget}
        onOpenChange={(open) => !open && setUnbanTarget(null)}
        title="Unban User"
        description={`Restore access for "${unbanTarget ? ([unbanTarget.firstName, unbanTarget.lastName].filter(Boolean).join(' ') || unbanTarget.email) : ''}"?`}
        confirmLabel="Unban User"
        pendingLabel="Unbanning…"
        confirmVariant="default"
        isPending={unbanMutation.isPending}
        onConfirm={() =>
          unbanTarget &&
          unbanMutation.mutate(unbanTarget.clerkUserId, {
            onSuccess: () => setUnbanTarget(null),
          })
        }
      />

      {/* ── Confirm: Delete ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete User"
        description={`Permanently delete "${deleteTarget ? ([deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ') || deleteTarget.email) : ''}" from Clerk? This cannot be undone and removes all their sessions, data, and org memberships.`}
        confirmLabel="Delete Forever"
        pendingLabel="Deleting…"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate(deleteTarget.clerkUserId, {
            onSuccess: () => setDeleteTarget(null),
          })
        }
      />
    </div>
  );
}
```

---

## 6. UserDetailPage — View Page

Create `renderer/src/pages/UserDetail.tsx`:

```tsx
// renderer/src/pages/UserDetail.tsx
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Shield, ShieldOff, ShieldCheck, ShieldBan,
  Clock, Calendar, Building2, Tags, Trash2, UserX,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UpdateRolesDrawer } from '../components/UpdateRolesDrawer';
import { AssignOrgDrawer } from '../components/AssignOrgDrawer';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { UserRolePills } from '../components/UserRolePills';
import { ClerkUsers } from '../api';

// ── Detail field layout ───────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b border-border py-3 last:border-0">
      <dt className="text-sm font-medium text-muted-foreground flex items-center">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="px-5">
        <dl>{children}</dl>
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-32 rounded-xl bg-muted" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { clerkUserId } = useParams<{ clerkUserId: string }>();
  const navigate        = useNavigate();

  const [rolesOpen,    setRolesOpen]    = useState(false);
  const [assignOpen,   setAssignOpen]   = useState(false);
  const [banOpen,      setBanOpen]      = useState(false);
  const [unbanOpen,    setUnbanOpen]    = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);

  // Fetch a single user by listing with a placeholder search (no get-by-clerk-id endpoint)
  // We re-use useList and find from cache, or we can use the roles endpoint as a probe.
  // Best approach: search by email OR use the roles endpoint for existence check, then
  // rely on cached list data. For simplicity, we fetch the roles (always available)
  // and cross-reference with the list cache.
  const rolesQuery = ClerkUsers.useGetRoles(clerkUserId);

  // Fetch the full list from cache to hydrate the user card.
  // If the user navigated directly, prefetch with useList.
  const listQuery  = ClerkUsers.useList({ page: 1, enabled: true });
  const user = listQuery.data?.data.find((u) => u.clerkUserId === clerkUserId) ?? null;

  const banMutation    = ClerkUsers.useBan();
  const unbanMutation  = ClerkUsers.useUnban();
  const deleteMutation = ClerkUsers.useDelete();

  const loading = listQuery.isLoading && !user;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : clerkUserId ?? 'User';

  const formatDate = (ts: number | null | undefined) =>
    ts ? new Date(ts).toLocaleString() : '—';

  if (loading) return (
    <div className="p-6 max-w-3xl mx-auto">
      <DetailSkeleton />
    </div>
  );

  if (!loading && !user) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <UserX size={40} className="text-muted-foreground" />
      <p className="text-lg font-semibold">User not found</p>
      <p className="text-sm text-muted-foreground">
        This Clerk user ID does not match any user in the current page.
      </p>
      <Button variant="outline" onClick={() => navigate('/users')}>
        <ArrowLeft size={15} /> Back to Users
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/users')}
            className="-ml-1"
          >
            <ArrowLeft size={16} /> Users
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{displayName}</span>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setRolesOpen(true)}>
            <Tags size={14} /> Edit Roles
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            <Building2 size={14} /> Assign Org
          </Button>
          {user?.banned ? (
            <Button size="sm" variant="outline" onClick={() => setUnbanOpen(true)}>
              <ShieldCheck size={14} /> Unban
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setBanOpen(true)}>
              <ShieldBan size={14} /> Ban
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      {/* ── Avatar + Name hero ─────────────────────────────────────────────── */}
      {user && (
        <div className="flex items-center gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
          <img
            src={user.imageUrl}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-border shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  [user.firstName, user.lastName].filter(Boolean).join('+') || user.email,
                )}&background=random&size=128`;
            }}
          />
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail size={13} /> {user.email}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <UserStatusBadge active={!user.banned} banned={user.banned} />
              {user.roles.length > 0 && <UserRolePills roles={user.roles} max={5} />}
            </div>
          </div>
        </div>
      )}

      {/* ── Account info ──────────────────────────────────────────────────── */}
      {user && (
        <SectionCard title="Account Information" icon={<Shield size={15} />}>
          <DetailRow label="Clerk User ID">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {user.clerkUserId}
            </code>
          </DetailRow>
          <DetailRow label="Email">{user.email || '—'}</DetailRow>
          <DetailRow label="First Name">{user.firstName || '—'}</DetailRow>
          <DetailRow label="Last Name">{user.lastName || '—'}</DetailRow>
          <DetailRow label="Status">
            <UserStatusBadge active={!user.banned} banned={user.banned} />
          </DetailRow>
          <DetailRow label="Roles">
            {rolesQuery.isLoading ? (
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <UserRolePills roles={rolesQuery.data?.roles ?? user.roles} max={10} />
            )}
          </DetailRow>
        </SectionCard>
      )}

      {/* ── Activity ──────────────────────────────────────────────────────── */}
      {user && (
        <SectionCard title="Activity" icon={<Clock size={15} />}>
          <DetailRow label="Account Created">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-muted-foreground" />
              {formatDate(user.createdAt)}
            </span>
          </DetailRow>
          <DetailRow label="Last Sign In">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-muted-foreground" />
              {formatDate(user.lastSignInAt)}
            </span>
          </DetailRow>
        </SectionCard>
      )}

      {/* ── Drawers & Dialogs ─────────────────────────────────────────────── */}
      <UpdateRolesDrawer
        user={rolesOpen ? user : null}
        onClose={() => setRolesOpen(false)}
      />

      <AssignOrgDrawer
        user={assignOpen ? user : null}
        onClose={() => setAssignOpen(false)}
      />

      <ConfirmDialog
        open={banOpen}
        onOpenChange={(open) => !open && setBanOpen(false)}
        title="Ban User"
        description={`Ban "${displayName}"? They will immediately lose access to all sessions.`}
        confirmLabel="Ban User"
        pendingLabel="Banning…"
        confirmVariant="destructive"
        isPending={banMutation.isPending}
        onConfirm={() =>
          user &&
          banMutation.mutate(user.clerkUserId, {
            onSuccess: () => { setBanOpen(false); navigate('/users'); },
          })
        }
      />

      <ConfirmDialog
        open={unbanOpen}
        onOpenChange={(open) => !open && setUnbanOpen(false)}
        title="Unban User"
        description={`Restore access for "${displayName}"?`}
        confirmLabel="Unban User"
        pendingLabel="Unbanning…"
        confirmVariant="default"
        isPending={unbanMutation.isPending}
        onConfirm={() =>
          user &&
          unbanMutation.mutate(user.clerkUserId, { onSuccess: () => setUnbanOpen(false) })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => !open && setDeleteOpen(false)}
        title="Delete User"
        description={`Permanently delete "${displayName}"? This removes them from Clerk, all their sessions, org memberships, and cannot be undone.`}
        confirmLabel="Delete Forever"
        pendingLabel="Deleting…"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          user &&
          deleteMutation.mutate(user.clerkUserId, {
            onSuccess: () => { setDeleteOpen(false); navigate('/users'); },
          })
        }
      />
    </div>
  );
}
```

---

## 7. Router & Sidebar Wiring

### `App.tsx` — add the detail route

```tsx
// In the lazy imports block:
const UserDetail = lazy(() => import('./pages/UserDetail'));

// Inside <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
<Route path="users"                      element={<UsersPage />} />
<Route path="users/clerk/:clerkUserId"   element={<UserDetail />} />
```

### `SidebarNav.tsx` — add to nav items

```ts
{ id: 'users', label: 'Users', icon: <Users size={18} />, group: 'System', adminOnly: true },
```

Make sure `Users` is imported from `lucide-react`:

```ts
import { ..., Users } from 'lucide-react';
```

---

## 8. API Endpoint Reference

| Method   | Path                                                         | Hook                        | Description                          |
|----------|--------------------------------------------------------------|-----------------------------|--------------------------------------|
| `GET`    | `/api/v1/users?limit=&offset=&organizationId=`              | `ClerkUsers.useList`        | Paginated user list (org-scoped)     |
| `GET`    | `/api/v1/users/search?query=&limit=&offset=`                | `ClerkUsers.useSearch`      | Full-text name/email search          |
| `GET`    | `/api/v1/users/clerk/:clerkUserId/roles`                    | `ClerkUsers.useGetRoles`    | Read user's `publicMetadata.roles`   |
| `POST`   | `/api/v1/users/clerk/invite`                                | `ClerkUsers.useInvite`      | Email invitation with roles          |
| `PUT`    | `/api/v1/users/clerk/:clerkUserId/roles`                    | `ClerkUsers.useUpdateRoles` | Overwrite roles in publicMetadata    |
| `PUT`    | `/api/v1/users/clerk/:clerkUserId/ban`                      | `ClerkUsers.useBan`         | Ban + set `isActive=false` locally   |
| `PUT`    | `/api/v1/users/clerk/:clerkUserId/unban`                    | `ClerkUsers.useUnban`       | Unban + set `isActive=true` locally  |
| `DELETE` | `/api/v1/users/clerk/:clerkUserId`                          | `ClerkUsers.useDelete`      | Hard delete from Clerk + local DB    |
| `POST`   | `/api/v1/users/clerk/:clerkUserId/organizations`            | `ClerkUsers.useAssignOrg`   | Add user to Clerk org as role        |
| `DELETE` | `/api/v1/users/clerk/:clerkUserId/organizations/:orgId`     | `ClerkUsers.useRemoveFromOrg` | Remove from org membership         |

**Request shapes:**

```ts
// POST /invite
{ email: string; roles?: string[]; redirectUrl?: string }

// PUT /roles
{ roles: string[] }

// POST /organizations
{ organizationId: string; role: 'org:admin' | 'org:member' }
```

All write endpoints return **HTTP 204 No Content**.

---

## 9. UX Decisions & Edge Cases

### Status filtering (client-side)

The Clerk list API does not support a `banned` query param. Status filtering is applied client-side after the full page loads. When a filter is active, the `footerNote` in `DataTable` tells the user that results are filtered from the current page, not the full dataset.

To support accurate banned-count filtering at scale, you would need to paginate through all users on the backend — this is an acceptable trade-off for now.

### Avatar fallback

When Clerk's CDN image fails to load (e.g. OAuth account with revoked photo), the `onError` handler swaps in a `ui-avatars.com` generated placeholder using the user's initials. No missing-image broken icons ever appear.

### Delete is hard-delete

`DELETE /clerk/:clerkUserId` removes the user from both Clerk and the local database. The confirm dialog copy makes this clear. After deletion, the page navigates back to `/users` automatically.

### Ban vs Delete

- **Ban** = block access, keep data. Reversible. Use for policy violations.  
- **Delete** = remove permanently from Clerk. Cannot be undone. Only for GDPR erasure / test cleanup.

### "Edit Roles" vs "Update Roles"

The `UpdateRolesDrawer` shows preset role chips (admin, manager, viewer, accountant, warehouse) as toggle buttons, plus a text input for custom roles. This prevents typos and makes bulk assignment fast.

### Organisation assignment

The `AssignOrgDrawer` takes a raw Clerk org ID (`org_xxx`). Future improvement: replace the text input with a `ResourceSelect` over `/api/v1/organizations` once that endpoint returns Clerk org IDs alongside internal IDs.

### Pagination with live mutations

All mutations call `queryClient.invalidateQueries({ queryKey: ['clerk-users'] })`. This causes an immediate refetch on the current page, so ban/unban/delete changes reflect instantly without requiring a manual refresh.

### Routing: `id` vs `clerkUserId`

`UserDetailPage` uses the `clerkUserId` (e.g. `user_xxx`) as the route param, not the internal DB UUID. This is intentional because the new Clerk admin endpoints are all keyed on `clerkUserId`. The internal DB ID is only relevant for the legacy `GET /api/v1/users/:id` endpoint (single user by DB UUID).

### Error handling

- Unknown `clerkUserId` on the detail page shows a "User not found" empty state with a back button, rather than crashing.
- All mutations use `onError` to call `toast.error(...)` via the hook definitions in `api.ts`, so individual pages don't need error handling boilerplate.
- The `DataTable` `error` prop shows an inline retry block if the list fetch fails.
