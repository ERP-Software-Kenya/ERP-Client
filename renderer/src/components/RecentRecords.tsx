import { FormSection } from './FormDrawer';
import { SimpleTable, type SimpleColumn } from './SimpleTable';
import { Button } from './ui/button';

export interface RecentRecordsProps<T> {
  title?: string;
  subtitle?: string;
  emptyHint: string;
  rows: T[];
  columns: SimpleColumn<T>[];
  rowKey: (row: T) => string;
  onClear: () => void;
}

export function RecentRecords<T>({
  title = 'Recent',
  subtitle = 'Saved in this browser only.',
  emptyHint,
  rows,
  columns,
  rowKey,
  onClear,
}: RecentRecordsProps<T>) {
  return (
    <FormSection title={title}>
      {subtitle ? <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <>
          <SimpleTable columns={columns} rows={rows} rowKey={rowKey} />
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onClear}>
            Clear recent list
          </Button>
        </>
      )}
    </FormSection>
  );
}
