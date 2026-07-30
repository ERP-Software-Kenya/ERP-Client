import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Categories } from '../api';
import type { Category } from '../types';

const NONE_VALUE = '__none__';

function buildIndentedList(categories: Category[], excludeId?: string): { id: string; label: string }[] {
  const byParent = new Map<string | undefined, Category[]>();
  categories.forEach((c) => {
    const key = c.parentId || undefined;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  });

  const result: { id: string; label: string }[] = [];
  function walk(parentId: string | undefined, depth: number) {
    for (const cat of byParent.get(parentId) ?? []) {
      if (cat.id === excludeId) continue;
      result.push({ id: cat.id, label: `${'— '.repeat(depth)}${cat.name}` });
      walk(cat.id, depth + 1);
    }
  }
  walk(undefined, 0);
  return result;
}

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  excludeId?: string;
}

export function CategorySelect({ value, onValueChange, excludeId }: CategorySelectProps) {
  const { data } = Categories.useList();
  const options = buildIndentedList(data ?? [], excludeId);

  return (
    <Select value={value || NONE_VALUE} onValueChange={(v) => onValueChange(v === NONE_VALUE ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder="No parent (top level)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>None (top level)</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
