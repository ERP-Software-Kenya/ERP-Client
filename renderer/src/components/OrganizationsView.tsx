import { ERPDataTable } from './ERPDataTable';
import { Organizations } from '../api';
import type { Organization } from '../types';

const COLUMNS = [
  { key: 'id',      label: 'ID',      width: '220px' },
  { key: 'name',    label: 'Name' },
  { key: 'code',    label: 'Code',    width: '120px' },
  { key: 'email',   label: 'Email',   width: '200px' },
  { key: 'phone',   label: 'Phone',   width: '140px' },
  { key: 'status',  label: 'Status',  width: '100px',
    render: (row: Organization) => (
      <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
];

export function OrganizationsView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Organization>
      title="Organizations"
      description="Manage your organizations on the Core ERP platform"
      columns={COLUMNS}
      fetchData={(params) => Organizations.search(params as Record<string, string>)}
      queryKey="organizations"
      isAdmin={isAdmin}
      searchPlaceholder="Search organizations…"
    />
  );
}
