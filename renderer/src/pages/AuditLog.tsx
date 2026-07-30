import { useMemo, useState } from 'react';

interface DemoLogEntry {
  id: number;
  timestamp: string;
  user: string;
  module: string;
  action: string;
  record: string;
}

// Demo data — the Activity Logs list endpoint doesn't exist yet (deferred Task 1).
// Replace with a real react-query call against GET /api/v1/activity-logs once that lands;
// do not treat these rows as real audit history.
const DEMO_LOGS: DemoLogEntry[] = [
  { id: 1, timestamp: '28 Jul 2026, 09:45', user: 'Admin User', module: 'Purchase', action: 'Create', record: 'PO-2026-0042' },
  { id: 2, timestamp: '28 Jul 2026, 09:15', user: 'John Kamau', module: 'Inventory', action: 'Edit', record: 'ADJ-2026-0006' },
  { id: 3, timestamp: '27 Jul 2026, 16:30', user: 'Admin User', module: 'Approvals', action: 'Approve', record: 'PO-2026-0040' },
  { id: 4, timestamp: '27 Jul 2026, 15:22', user: 'Mary Wanjiku', module: 'Sales', action: 'Create', record: 'SO-2026-0088' },
  { id: 5, timestamp: '27 Jul 2026, 14:10', user: 'Peter Otieno', module: 'Purchase', action: 'Create', record: 'PO-2026-0041' },
  { id: 6, timestamp: '26 Jul 2026, 16:55', user: 'Admin User', module: 'Approvals', action: 'Reject', record: 'PO-2026-0039' },
  { id: 7, timestamp: '25 Jul 2026, 13:20', user: 'Peter Otieno', module: 'Purchase', action: 'Create', record: 'GRN-2026-0028' },
];

const ACTION_COLORS: Record<string, string> = {
  Create: 'bg-green-500/10 text-green-600',
  Edit: 'bg-blue-500/10 text-blue-600',
  Approve: 'bg-green-500/10 text-green-600',
  Reject: 'bg-red-500/10 text-red-600',
};

export default function AuditLog() {
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');

  const modules = useMemo(() => Array.from(new Set(DEMO_LOGS.map((l) => l.module))), []);
  const actions = useMemo(() => Array.from(new Set(DEMO_LOGS.map((l) => l.action))), []);
  const rows = DEMO_LOGS.filter((l) => (!module || l.module === module) && (!action || l.action === action));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete history of activity log entries — who changed what, when.</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
          Demo data — pending Activity Logs list endpoint
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={module} onChange={(e) => setModule(e.target.value)} className="text-sm px-3 py-2 border border-border rounded-lg bg-card">
          <option value="">All Modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="text-sm px-3 py-2 border border-border rounded-lg bg-card">
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {['Timestamp', 'User', 'Module', 'Action', 'Record'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No records match these filters</td></tr>
            )}
            {rows.map((log) => (
              <tr key={log.id} className="hover:bg-muted/50">
                <td className="px-4 py-2">{log.timestamp}</td>
                <td className="px-4 py-2">{log.user}</td>
                <td className="px-4 py-2">{log.module}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-blue-600">{log.record}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
