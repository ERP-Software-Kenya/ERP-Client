import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, Search, Filter, Plus, Gauge, Wrench,
  ChevronRight, Activity, AlertCircle, Pencil, Trash2,
  X, Loader2, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Vehicle } from '../types';

// ── Local mock only — core-apis has no vehicles endpoints. ────────────────────
// Edits stay in memory for this session; nothing is persisted to the server.
export const MOCK_STORE: Vehicle[] = [
  {
    id: 'T-9502',
    registration_number: 'T-9502',
    vin: '1HTKR29AX8JH1032',
    type: 'Semi-Truck',
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2021,
    status: 'In Transit',
    fuel_level: 64,
    tire_psi: 115,
    engine_temp: 192,
    current_speed: 62,
    load_weight: 38.2,
    current_location: 'I-80 West, Cheyenne, WY',
    driver_name: 'Marcus Thorne',
    driver_cdl: 'Class A',
    driver_experience: '12 yrs',
    last_service_date: 'Oct 12, 2023',
  },
  {
    id: 'T-8814',
    registration_number: 'T-8814',
    vin: '3AKJHHDR4JSJE1291',
    type: 'Semi-Truck',
    make: 'Peterbilt',
    model: '579',
    year: 2020,
    status: 'Available',
    fuel_level: 88,
    tire_psi: 112,
    engine_temp: 0,
    current_speed: 0,
    load_weight: 0,
    current_location: 'Depot — Denver, CO',
    driver_name: 'Sandra Reyes',
    driver_cdl: 'Class A',
    driver_experience: '8 yrs',
    last_service_date: 'Nov 02, 2023',
  },
  {
    id: 'V-3301',
    registration_number: 'V-3301',
    vin: '5PVNJ8JT9E4218476',
    type: 'Box Truck',
    make: 'Ford',
    model: 'F-750',
    year: 2022,
    status: 'Maintenance',
    fuel_level: 30,
    tire_psi: 95,
    engine_temp: 0,
    current_speed: 0,
    load_weight: 0,
    current_location: 'Freightliner Service Ctr',
    driver_name: '—',
    last_service_date: 'Nov 18, 2023',
  },
  {
    id: 'T-6655',
    registration_number: 'T-6655',
    vin: '1FUJGLDR4CLBF7019',
    type: 'Semi-Truck',
    make: 'Kenworth',
    model: 'T680',
    year: 2019,
    status: 'In Transit',
    fuel_level: 52,
    tire_psi: 118,
    engine_temp: 195,
    current_speed: 58,
    load_weight: 24.7,
    current_location: 'I-70 East, Kansas City, MO',
    driver_name: 'Tom Briggs',
    driver_cdl: 'Class A',
    driver_experience: '6 yrs',
    last_service_date: 'Sep 30, 2023',
  },
  {
    id: 'V-1190',
    registration_number: 'V-1190',
    vin: '1M1AW09Y69M100723',
    type: 'Flatbed',
    make: 'Mack',
    model: 'Anthem',
    year: 2018,
    status: 'Out of Service',
    fuel_level: 15,
    tire_psi: 88,
    engine_temp: 0,
    current_speed: 0,
    load_weight: 0,
    current_location: 'Internal Fleet Shop',
    driver_name: '—',
    last_service_date: 'Aug 21, 2023',
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface VehicleFormData {
  registration_number: string;
  vin: string;
  type: string;
  make: string;
  model: string;
  year: string;
  status: Vehicle['status'];
  fuel_level: string;
  tire_psi: string;
  current_location: string;
  driver_name: string;
  driver_cdl: string;
  driver_experience: string;
  last_service_date: string;
}

const EMPTY_FORM: VehicleFormData = {
  registration_number: '',
  vin: '',
  type: 'Semi-Truck',
  make: '',
  model: '',
  year: String(new Date().getFullYear()),
  status: 'Available',
  fuel_level: '100',
  tire_psi: '110',
  current_location: '',
  driver_name: '',
  driver_cdl: '',
  driver_experience: '',
  last_service_date: '',
};

const VEHICLE_TYPES = ['Semi-Truck', 'Box Truck', 'Flatbed', 'Tanker', 'Refrigerated', 'Van', 'Pickup', 'Other'];
const STATUSES: Vehicle['status'][] = ['Available', 'In Transit', 'Maintenance', 'Out of Service'];

// ── Sub-components ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'In Transit':     { dot: 'bg-green-500', bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  'Available':      { dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  'Maintenance':    { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  'Out of Service': { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
} as const;

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG['Available'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-bold tracking-wider uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {status}
    </span>
  );
}

function FuelBar({ level }: { level?: number }) {
  const pct = level ?? 0;
  const colorClass = pct < 25 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground tabular-nums min-w-[30px]">
        {pct}%
      </span>
    </div>
  );
}

// ── Vehicle Form Modal ────────────────────────────────────────────────────────
interface VehicleModalProps {
  vehicle: Vehicle | null;   // null = create mode
  onClose(): void;
  onSaved(v: Vehicle): void;
}

export function VehicleModal({ vehicle, onClose, onSaved }: VehicleModalProps) {
  const isEdit = vehicle !== null;
  const [form, setForm] = useState<VehicleFormData>(() =>
    isEdit
      ? {
          registration_number: vehicle.registration_number,
          vin: vehicle.vin ?? '',
          type: vehicle.type ?? 'Semi-Truck',
          make: vehicle.make ?? '',
          model: vehicle.model ?? '',
          year: String(vehicle.year ?? new Date().getFullYear()),
          status: vehicle.status ?? 'Available',
          fuel_level: String(vehicle.fuel_level ?? 100),
          tire_psi: String(vehicle.tire_psi ?? 110),
          current_location: vehicle.current_location ?? '',
          driver_name: vehicle.driver_name ?? '',
          driver_cdl: vehicle.driver_cdl ?? '',
          driver_experience: vehicle.driver_experience ?? '',
          last_service_date: vehicle.last_service_date ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof VehicleFormData>(k: K, v: VehicleFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    if (!form.registration_number.trim()) { setFormError('Vehicle ID / Registration number is required.'); return; }
    const yr = parseInt(form.year, 10);
    if (isNaN(yr) || yr < 1900 || yr > new Date().getFullYear() + 2) {
      setFormError('Enter a valid year.'); return;
    }

    setSaving(true);
    try {
      // Build Vehicle object
      const payload: Vehicle = {
        id: isEdit ? vehicle.id : form.registration_number.trim().toUpperCase(),
        registration_number: form.registration_number.trim().toUpperCase(),
        vin: form.vin.trim() || undefined,
        type: form.type,
        make: form.make.trim() || undefined,
        model: form.model.trim() || undefined,
        year: yr,
        status: form.status,
        fuel_level: parseFloat(form.fuel_level) || 0,
        tire_psi: parseFloat(form.tire_psi) || 0,
        current_location: form.current_location.trim() || undefined,
        driver_name: form.driver_name.trim() || undefined,
        driver_cdl: form.driver_cdl.trim() || undefined,
        driver_experience: form.driver_experience.trim() || undefined,
        last_service_date: form.last_service_date.trim() || undefined,
      };

      // Update mock store
      if (isEdit) {
        const idx = MOCK_STORE.findIndex((v) => v.id === vehicle.id);
        if (idx >= 0) MOCK_STORE[idx] = payload;
      } else {
        // Check duplicate ID
        if (MOCK_STORE.some((v) => v.id === payload.id)) {
          setFormError(`Vehicle with ID "${payload.id}" already exists.`);
          return;
        }
        MOCK_STORE.push(payload);
      }

      onSaved(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "block text-[0.7rem] font-bold tracking-wider uppercase text-muted-foreground mb-1";
  const fieldClass = "flex flex-col";
  const sectionHeaderClass = "text-[0.7rem] font-bold tracking-widest uppercase text-primary mb-3 mt-6 first:mt-0 flex items-center gap-2";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {isEdit ? `Edit Vehicle — ${vehicle.registration_number}` : 'Add New Vehicle'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Local mock only — not saved to the server.
              {isEdit ? ' Update in-memory demo data.' : ' Add to the in-memory demo list.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error banner */}
        {formError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-500 text-sm mb-6 flex items-center gap-2">
            <AlertCircle size={16} />
            {formError}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* ── Section: Identity ── */}
          <div className={sectionHeaderClass}>
            <Car size={14} /> Vehicle Identity
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div className={fieldClass}>
              <label className={labelClass}>Registration / Fleet ID *</label>
              <input id="vf-reg" className={inputClass} value={form.registration_number}
                onChange={(e) => set('registration_number', e.target.value)}
                placeholder="e.g. T-9502" required autoFocus disabled={isEdit} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>VIN</label>
              <input id="vf-vin" className={`${inputClass} font-mono`} value={form.vin}
                onChange={(e) => set('vin', e.target.value)} placeholder="17-char VIN" maxLength={17} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Vehicle Type</label>
              <select id="vf-type" className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
                {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Year</label>
              <input id="vf-year" className={inputClass} type="number" value={form.year}
                onChange={(e) => set('year', e.target.value)}
                min={1990} max={new Date().getFullYear() + 2} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Make</label>
              <input id="vf-make" className={inputClass} value={form.make}
                onChange={(e) => set('make', e.target.value)} placeholder="e.g. Freightliner" />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Model</label>
              <input id="vf-model" className={inputClass} value={form.model}
                onChange={(e) => set('model', e.target.value)} placeholder="e.g. Cascadia" />
            </div>
          </div>

          {/* ── Section: Status & Telemetry ── */}
          <div className={sectionHeaderClass}>
            <Activity size={14} /> Status & Telemetry
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className={fieldClass}>
              <label className={labelClass}>Status</label>
              <select id="vf-status" className={inputClass} value={form.status}
                onChange={(e) => set('status', e.target.value as Vehicle['status'])}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Fuel Level (%)</label>
              <input id="vf-fuel" className={inputClass} type="number" value={form.fuel_level}
                onChange={(e) => set('fuel_level', e.target.value)} min={0} max={100} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Tire PSI</label>
              <input id="vf-psi" className={inputClass} type="number" value={form.tire_psi}
                onChange={(e) => set('tire_psi', e.target.value)} min={0} max={250} />
            </div>
          </div>

          <div className={`${fieldClass} mb-2`}>
            <label className={labelClass}>Current Location</label>
            <input id="vf-location" className={inputClass} value={form.current_location}
              onChange={(e) => set('current_location', e.target.value)}
              placeholder="e.g. I-80 West, Cheyenne, WY" />
          </div>

          {/* ── Section: Driver ── */}
          <div className={sectionHeaderClass}>
            <Wrench size={14} /> Assigned Driver
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`${fieldClass} md:col-span-3`}>
              <label className={labelClass}>Driver Name</label>
              <input id="vf-driver" className={inputClass} value={form.driver_name}
                onChange={(e) => set('driver_name', e.target.value)} placeholder="Full name" />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>CDL Class</label>
              <input id="vf-cdl" className={inputClass} value={form.driver_cdl}
                onChange={(e) => set('driver_cdl', e.target.value)} placeholder="e.g. Class A" />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Experience</label>
              <input id="vf-exp" className={inputClass} value={form.driver_experience}
                onChange={(e) => set('driver_experience', e.target.value)} placeholder="e.g. 8 yrs" />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Last Service Date</label>
              <input id="vf-service" className={inputClass} type="date" value={form.last_service_date}
                onChange={(e) => set('last_service_date', e.target.value)} />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-5 border-t border-border mt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving…' : isEdit ? 'Save (local mock)' : 'Add (local mock)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main VehiclesView ─────────────────────────────────────────────────────────
export function VehiclesView() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [mockEpoch, setMockEpoch] = useState(0);
  const [modalVehicle, setModalVehicle] = useState<Vehicle | null | 'new'>(undefined as unknown as null);
  const [showModal, setShowModal] = useState(false);

  const loading = false;
  const vehicles = useMemo(() => {
    void mockEpoch;
    return [...MOCK_STORE];
  }, [mockEpoch]);

  const openCreate = () => { setModalVehicle(null); setShowModal(true); };
  const openEdit = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row-click navigation
    setModalVehicle(v);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const handleSaved = (saved: Vehicle) => {
    setShowModal(false);
    setMockEpoch((n) => n + 1);
    toast.success(
      modalVehicle === null
        ? `Vehicle ${saved.registration_number} saved locally (mock — not on server)`
        : `Vehicle ${saved.registration_number} updated locally (mock — not on server)`,
    );
  };

  const handleDelete = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove vehicle ${v.registration_number} from the local mock list?`)) return;
    const idx = MOCK_STORE.findIndex((m) => m.id === v.id);
    if (idx >= 0) MOCK_STORE.splice(idx, 1);
    setMockEpoch((n) => n + 1);
    toast.success(`Vehicle ${v.registration_number} removed from local mock`);
  };

  const statuses = ['All', 'In Transit', 'Available', 'Maintenance', 'Out of Service'];

  const filtered = vehicles.filter((v) => {
    const matchSearch =
      !search ||
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      (v.driver_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.vin ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.current_location ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: vehicles.length,
    inTransit: vehicles.filter((v) => v.status === 'In Transit').length,
    available: vehicles.filter((v) => v.status === 'Available').length,
    maintenance: vehicles.filter((v) => v.status === 'Maintenance').length,
  };

  return (
    <>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Fleet Vehicles
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">
              Demo UI only — core-apis has no vehicles endpoints
            </p>
          </div>
          <button
            id="add-vehicle-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            onClick={openCreate}
          >
            <Plus size={18} /> Add Vehicle (local mock)
          </button>
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          No vehicles API in core-apis. The list and create/edit/delete below use an in-memory{' '}
          <code className="text-xs">MOCK_STORE</code> only — changes are not saved to the server.
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Vehicles', value: loading ? '…' : counts.total,      icon: <Car size={20} className="text-blue-500" />,     bg: 'bg-blue-500/10' },
            { label: 'In Transit',     value: loading ? '…' : counts.inTransit,  icon: <Gauge size={20} className="text-green-500" />,    bg: 'bg-green-500/10' },
            { label: 'Available',      value: loading ? '…' : counts.available,   icon: <Activity size={20} className="text-blue-400" />, bg: 'bg-blue-400/10' },
            { label: 'In Maintenance', value: loading ? '…' : counts.maintenance, icon: <Wrench size={20} className="text-amber-500" />,  bg: 'bg-amber-500/10' },
          ].map((card) => (
            <div key={card.label} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  {card.label}
                </p>
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  {card.icon}
                </div>
              </div>
              <p className="text-3xl font-black mt-4 text-foreground tabular-nums tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="vehicles-search"
              className="w-full bg-background border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Search vehicles, drivers, VIN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-muted-foreground mx-2" />
            {statuses.map((s) => (
              <button
                key={s}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === s 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          {loading ? (
            <div className="p-12 flex items-center justify-center gap-3 text-muted-foreground animate-pulse">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-medium">Loading vehicles…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                <AlertCircle size={32} className="text-muted-foreground/50" />
              </div>
              <p className="font-medium">No vehicles match your filters.</p>
              <button 
                onClick={() => { setSearch(''); setStatusFilter('All'); }}
                className="text-primary text-sm hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {['Vehicle ID', 'Type / Make', 'VIN', 'Status', 'Fuel', 'Driver', 'Location', 'Last Service', ''].map((h) => (
                      <th key={h} className="px-5 py-3 text-[0.7rem] font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-primary">
                        {v.registration_number}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{v.type}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{v.make} {v.model} {v.year}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {v.vin ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-5 py-4">
                        <FuelBar level={v.fuel_level} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{v.driver_name ?? '—'}</div>
                        {v.driver_cdl && (
                          <div className="text-xs text-muted-foreground mt-0.5">{v.driver_cdl} &bull; {v.driver_experience}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground max-w-[180px] truncate" title={v.current_location}>
                        {v.current_location ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {v.last_service_date ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`edit-vehicle-${v.id}`}
                            title="Edit vehicle"
                            onClick={(e) => openEdit(v, e)}
                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            id={`delete-vehicle-${v.id}`}
                            title="Remove vehicle"
                            onClick={(e) => handleDelete(v, e)}
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-muted-foreground ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <VehicleModal
          vehicle={modalVehicle as Vehicle | null}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
