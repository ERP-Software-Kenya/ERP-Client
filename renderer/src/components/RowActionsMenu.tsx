import { MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export interface RowActionsMenuProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RowActionsMenu({ onView, onEdit, onDelete }: RowActionsMenuProps) {
  if (!onView && !onEdit && !onDelete) return null;

  const showDeleteSep = Boolean(onDelete && (onView || onEdit));

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
