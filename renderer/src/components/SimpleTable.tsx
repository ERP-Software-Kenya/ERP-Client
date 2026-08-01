export interface SimpleColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

interface SimpleTableProps<T> {
  columns: SimpleColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}

export function SimpleTable<T>({ columns, rows, rowKey }: SimpleTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {columns.map((col) => (
              <th key={col.key} className="py-2 pr-4 last:pr-0">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border/60">
              {columns.map((col) => (
                <td key={col.key} className="py-2 pr-4 last:pr-0">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
