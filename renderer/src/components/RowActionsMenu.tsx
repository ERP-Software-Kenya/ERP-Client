import { MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export interface ExtraAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

export interface RowActionsMenuProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  extraActions?: ExtraAction[];
}

export function RowActionsMenu({ onView, onEdit, onDelete, extraActions }: RowActionsMenuProps) {
  const hasExtra = extraActions && extraActions.length > 0;
  if (!onView && !onEdit && !onDelete && !hasExtra) return null;

  const hasStandard = Boolean(onView || onEdit);
  const showDeleteSep = Boolean(onDelete && (hasStandard || hasExtra));
  const showExtraSep = Boolean(hasExtra && hasStandard);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Actions" aria-label="Actions">
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onSelect={onView}>
            <Eye size={14} />
            View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil size={14} />
            Edit
          </DropdownMenuItem>
        )}
        {showExtraSep && <DropdownMenuSeparator />}
        {hasExtra && extraActions!.map((action, i) => (
          <DropdownMenuItem
            key={i}
            onSelect={action.onSelect}
            destructive={action.destructive}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
        {showDeleteSep && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 size={14} />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
