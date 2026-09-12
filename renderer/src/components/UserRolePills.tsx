import { cn } from '../lib/utils';

const ROLE_COLORS: Record<string, string> = {
  super_admin:    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  org_admin:      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  branch_manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  driver:         'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  packer:         'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
  picker:         'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
};

function roleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? 'bg-muted text-muted-foreground';
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
          {r.replace(/_/g, ' ')}
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
