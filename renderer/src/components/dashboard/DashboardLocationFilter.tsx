import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface LocationOption {
  id: string;
  name: string;
}

interface DashboardLocationFilterProps {
  canPickLocation: boolean;
  selectedLocationId: string | 'all';
  onChange: (value: string | 'all') => void;
  locations: LocationOption[];
  assignedLocationId?: string;
}

export default function DashboardLocationFilter({
  canPickLocation,
  selectedLocationId,
  onChange,
  locations,
  assignedLocationId,
}: DashboardLocationFilterProps) {
  if (!canPickLocation && assignedLocationId) {
    const name = locations.find((l) => l.id === assignedLocationId)?.name ?? 'Your branch';
    return (
      <p className="text-xs text-muted-foreground">
        Branch: <span className="font-medium text-foreground">{name}</span>
      </p>
    );
  }

  if (!canPickLocation) return null;

  const selectedLabel =
    selectedLocationId === 'all'
      ? 'All branches'
      : locations.find((l) => l.id === selectedLocationId)?.name;

  return (
    <Select
      value={selectedLocationId}
      onValueChange={(v) => onChange(v as string | 'all')}
    >
      <SelectTrigger className="h-8 w-[180px] text-xs" title={selectedLabel}>
        <SelectValue placeholder="All branches" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All branches</SelectItem>
        {locations.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
