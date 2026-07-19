import { ERPDataTable } from './ERPDataTable';
import { Categories } from '../api';
import type { Category } from '../types';

const COLUMNS = [
  { key: 'id',          label: 'ID',          width: '220px' },
  { key: 'name',        label: 'Name' },
  { key: 'code',        label: 'Code',        width: '120px' },
  { key: 'description', label: 'Description' },
];

export function CategoriesView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Category>
      title="Categories"
      description="Product categories and classification"
      columns={COLUMNS}
      fetchData={(params) => Categories.search(params as Record<string, string>)}
      isAdmin={isAdmin}
      searchPlaceholder="Search categories…"
    />
  );
}
