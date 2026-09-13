import { FormDrawer } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import type { Branch, Location } from '../../types';

function StoreSvg() {
  return (
    <svg width="60" height="60" fill="none" viewBox="0 0 64 64" style={{ opacity: 0.55 }}>
      <rect x="8" y="26" width="48" height="30" rx="2" fill="#6366f1" fillOpacity=".28" />
      <rect x="14" y="32" width="10" height="14" rx="1" fill="#a5b4fc" fillOpacity=".5" />
      <rect x="27" y="32" width="10" height="14" rx="1" fill="#a5b4fc" fillOpacity=".5" />
      <rect x="40" y="32" width="10" height="8" rx="1" fill="#a5b4fc" fillOpacity=".5" />
      <polygon points="4,26 32,8 60,26" fill="#818cf8" fillOpacity=".28" />
      <rect x="4" y="24" width="56" height="3" rx="1.5" fill="#6366f1" fillOpacity=".45" />
      <rect x="20" y="42" width="24" height="14" rx="1" fill="#6366f1" fillOpacity=".22" />
    </svg>
  );
}

function WarehouseSvg() {
  return (
    <svg width="60" height="60" fill="none" viewBox="0 0 64 64" style={{ opacity: 0.55 }}>
      <polygon points="4,28 32,10 60,28 60,56 4,56" fill="#92400e" fillOpacity=".22" />
      <polygon points="4,28 32,10 60,28" fill="#b45309" fillOpacity=".28" />
      <rect x="4" y="28" width="56" height="28" fill="#78350f" fillOpacity=".14" />
      <rect x="18" y="36" width="14" height="20" rx="1" fill="#fbbf24" fillOpacity=".2" />
      <line x1="18" y1="46" x2="32" y2="46" stroke="#fbbf24" strokeWidth="1" strokeOpacity=".4" />
      <line x1="25" y1="36" x2="25" y2="56" stroke="#fbbf24" strokeWidth="1" strokeOpacity=".4" />
      <rect x="34" y="36" width="8" height="6" rx="1" fill="#fcd34d" fillOpacity=".28" />
      <rect x="44" y="36" width="8" height="6" rx="1" fill="#fcd34d" fillOpacity=".28" />
    </svg>
  );
}

function LocationCard({ loc }: { loc: Location }) {
  const isStore = loc.type === 'store';
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900 hover:border-zinc-700 transition-colors cursor-default">
      <div
        className={`h-[88px] flex items-center justify-center relative overflow-hidden ${
          isStore
            ? 'bg-gradient-to-br from-indigo-950 via-indigo-900/40 to-indigo-950'
            : 'bg-gradient-to-br from-amber-950 via-amber-900/30 to-amber-950'
        }`}
      >
        {isStore ? <StoreSvg /> : <WarehouseSvg />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold text-zinc-100 truncate mb-1.5">{loc.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {loc.city || loc.state || '—'}
          </span>
          {loc.isActive === false ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
              Inactive
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/60">
              Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ stroke, label, count }: { stroke: string; label: string; count: number }) {
  const isStore = label === 'Stores';
  return (
    <div className="flex items-center gap-2 mb-3">
      {isStore ? (
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2.2}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ) : (
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2.2}>
          <path d="M1 22V9l11-7 11 7v13" />
          <rect x="7" y="14" width="4" height="8" rx=".5" />
          <rect x="13" y="14" width="4" height="8" rx=".5" />
          <path d="M1 9h22" />
        </svg>
      )}
      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{count}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

interface Props {
  branch: Branch | null;
  locations: Location[];
  onClose: () => void;
  onEdit: (branch: Branch) => void;
  onInactive: (branch: Branch) => void;
}

export function BranchViewDrawer({ branch, locations, onClose, onEdit, onInactive }: Props) {
  const branchLocations = branch
    ? locations.filter((l) => (branch.locationIds ?? []).includes(l.id))
    : [];
  const stores = branchLocations.filter((l) => l.type === 'store');
  const warehouses = branchLocations.filter((l) => l.type === 'warehouse');

  return (
    <FormDrawer
      open={branch != null}
      onClose={onClose}
      title={branch?.name ?? ''}
      footer={
        branch ? (
          <>
            <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(branch); }}>
              Edit Branch
            </Button>
            {branch.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/25 hover:border-destructive/50"
                onClick={() => { onClose(); onInactive(branch); }}
              >
                Mark Inactive
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {branch && (
        <div className="space-y-5">
          {/* Status + code */}
          <div className="flex items-center gap-2">
            {branch.isActive === false ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                Inactive
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            )}
            {branch.code && (
              <span className="font-mono text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/40">
                {branch.code}
              </span>
            )}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 border border-zinc-800 rounded-lg overflow-hidden">
            {[
              { value: stores.length, label: 'Stores' },
              { value: warehouses.length, label: 'Warehouses' },
              { value: branchLocations.length, label: 'Total' },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col items-center py-3 bg-zinc-950 ${i < 2 ? 'border-r border-zinc-800' : ''}`}
              >
                <span className="text-xl font-bold text-zinc-100">{s.value}</span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mt-0.5">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 border border-zinc-800 rounded-lg overflow-hidden">
            {[
              { label: 'Code', value: branch.code || '—', mono: true },
              { label: 'City', value: branch.city || '—', mono: false },
              { label: 'Phone', value: branch.phone || '—', mono: false },
              { label: 'Address', value: branch.address || '—', mono: false },
            ].map((field, i) => (
              <div
                key={field.label}
                className={[
                  'px-3.5 py-2.5 bg-zinc-900/60',
                  i < 2 ? 'border-b border-zinc-800' : '',
                  i % 2 === 0 ? 'border-r border-zinc-800' : '',
                ].join(' ')}
              >
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">
                  {field.label}
                </p>
                <p className={`text-[13px] text-zinc-300 ${field.mono ? 'font-mono text-indigo-400' : ''}`}>
                  {field.value}
                </p>
              </div>
            ))}
          </div>

          {/* Stores */}
          <div>
            <SectionHeader stroke="#a5b4fc" label="Stores" count={stores.length} />
            {stores.length === 0 ? (
              <p className="text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-lg py-5 text-center">
                No stores assigned
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {stores.map((loc) => <LocationCard key={loc.id} loc={loc} />)}
              </div>
            )}
          </div>

          {/* Warehouses */}
          <div>
            <SectionHeader stroke="#fcd34d" label="Warehouses" count={warehouses.length} />
            {warehouses.length === 0 ? (
              <p className="text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-lg py-5 text-center">
                No warehouses assigned
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {warehouses.map((loc) => <LocationCard key={loc.id} loc={loc} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
