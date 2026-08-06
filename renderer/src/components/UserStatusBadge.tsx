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
