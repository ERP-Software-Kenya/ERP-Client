import { useRecentIds } from '../lib/recentIds';
import { Button } from './ui/button';

export interface RecentIdPickerProps {
  namespace: string;
  value: string;
  onSelect: (id: string, label?: string) => void;
  emptyHint: string;
}

export function RecentIdPicker({ namespace, value, onSelect, emptyHint }: RecentIdPickerProps) {
  const { entries } = useRecentIds(namespace);
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyHint}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entries.slice(0, 12).map((e) => (
        <Button
          key={e.id}
          type="button"
          size="sm"
          variant={value === e.id ? 'default' : 'outline'}
          onClick={() => onSelect(e.id, e.label)}
        >
          {e.label?.trim() || e.id.slice(0, 8)}
        </Button>
      ))}
    </div>
  );
}
