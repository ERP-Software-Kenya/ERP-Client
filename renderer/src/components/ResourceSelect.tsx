import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const NONE_VALUE = '__none__';

interface ListResource<T> {
  useList(enabled?: boolean): { data?: T[] };
}

interface ResourceSelectProps<T extends { id: string }> {
  resource: ListResource<T>;
  getLabel: (item: T) => string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
}

export function ResourceSelect<T extends { id: string }>({
  resource,
  getLabel,
  value,
  onValueChange,
  placeholder,
  allowNone,
}: ResourceSelectProps<T>) {
  const { data } = resource.useList();
  const items = data ?? [];

  return (
    <Select value={value || NONE_VALUE} onValueChange={(v) => onValueChange(v === NONE_VALUE ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE_VALUE}>None</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {getLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
