import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Download, Edit2, Thermometer, Gauge, Weight,
  User, MessageSquare, AlertCircle, ArrowLeft,
  Droplets, Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_STORE, VehicleModal } from './VehiclesView';
import type { Vehicle, VehicleMaintenance } from '../types';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_VEHICLES: Record<string, Vehicle & { maintenance: VehicleMaintenance[]; routeLogs: { date: string; route: string; distance: string; duration: string }[]; fuelTx: { date: string; location: string; gallons: number; cost: number }[] }> = {
  'T-9502': {
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
    driver_cdl: 'Class A CDL',
    driver_experience: '12 yrs exp.',
    last_service_date: 'Oct 12, 2023',
    maintenance: [
      { id: 'm1', vehicle_id: 'T-9502', date: 'Oct 12, 2023', service_type: 'Tire Rotation & Brake Check', provider: 'Freightliner Service Ctr', cost: 1240.00, status: 'Completed' },
      { id: 'm2', vehicle_id: 'T-9502', date: 'Sep 04, 2023', service_type: 'Oil Analysis & Filter', provider: 'Mobile Maintenance Inc', cost: 485.50, status: 'Completed' },
      { id: 'm3', vehicle_id: 'T-9502', date: 'Aug 21, 2023', service_type: 'DEF System Calibration', provider: 'Internal Fleet Shop', cost: 0.00, status: 'Completed' },
      { id: 'm4', vehicle_id: 'T-9502', date: 'Dec 10, 2023', service_type: '50,000 mi Full Inspection', provider: 'Freightliner Service Ctr', cost: 3200.00, status: 'Scheduled' },
    ],
    routeLogs: [
      { date: 'Nov 20, 2023', route: 'Denver, CO → Salt Lake City, UT', distance: '525 mi', duration: '8h 15m' },
      { date: 'Nov 18, 2023', route: 'Kansas City, MO → Denver, CO', distance: '610 mi', duration: '9h 40m' },
      { date: 'Nov 15, 2023', route: 'Chicago, IL → Kansas City, MO', distance: '508 mi', duration: '7h 55m' },
    ],
    fuelTx: [
      { date: 'Nov 20, 2023', location: 'Pilot Travel Center — Laramie, WY', gallons: 120, cost: 480.00 },
      { date: 'Nov 17, 2023', location: 'Love\'s Travel Stop — Salina, KS', gallons: 98, cost: 392.00 },
      { date: 'Nov 14, 2023', location: 'TA Travel Center — Gary, IN', gallons: 105, cost: 420.00 },
    ],
  },
  'T-8814': {
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
    driver_cdl: 'Class A CDL',
    driver_experience: '8 yrs exp.',
    last_service_date: 'Nov 02, 2023',
    maintenance: [
      { id: 'm5', vehicle_id: 'T-8814', date: 'Nov 02, 2023', service_type: 'Full Service & Oil Change', provider: 'Peterbilt Dealer', cost: 890.00, status: 'Completed' },
    ],
    routeLogs: [],
    fuelTx: [],
  },
};

const STATUS_CONFIG = {
  'In Transit':     { dot: '#4ade80', bg: 'rgba(74,222,128,0.15)', text: '#4ade80', border: 'rgba(74,222,128,0.35)' },
  'Available':      { dot: '#60a5fa', bg: 'rgba(96,165,250,0.15)', text: '#60a5fa', border: 'rgba(96,165,250,0.35)' },
  'Maintenance':    { dot: '#fbbf24', bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  'Out of Service': { dot: '#f87171', bg: 'rgba(248,113,113,0.15)', text: '#f87171', border: 'rgba(248,113,113,0.35)' },
} as const;

const MAINTENANCE_STATUS_COLORS = {
  'Completed':   { bg: 'rgba(74,222,128,0.12)', text: '#4ade80' },
  'Scheduled':   { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' },
  'In Progress': { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
} as const;

interface Props {
  vehicleId: string;
}

type ActiveTab = 'maintenance' | 'routes' | 'fuel';

export function VehicleDetailView({ vehicleId }: Props) {
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<typeof MOCK_VEHICLES[string] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('maintenance');
  const [showEditModal, setShowEditModal] = useState(false);

  const loadVehicle = () => {
    setLoading(true);
    setTimeout(() => {
      // Merge MOCK_VEHICLES detail data with any edits from MOCK_STORE
      const stored = MOCK_STORE.find((v) => v.id === vehicleId);
      const detail = MOCK_VEHICLES[vehicleId] ?? null;
      if (detail && stored) {
        // Overlay scalar fields from MOCK_STORE (updated by edit)
        setVehicle({ ...detail, ...stored, maintenance: detail.maintenance, routeLogs: detail.routeLogs, fuelTx: detail.fuelTx });
      } else {
        setVehicle(detail);
      }
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    loadVehicle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Circle size={16} className="spin" /> Loading vehicle…
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <AlertCircle size={32} style={{ color: '#f87171' }} />
        <p style={{ color: 'var(--color-muted-foreground)' }}>Vehicle <strong>{vehicleId}</strong> not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/vehicles')}>
          <ArrowLeft size={14} /> Back to Fleet
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[vehicle.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG['Available'];
  const fuelColor = (vehicle.fuel_level ?? 0) < 25 ? '#f87171' : (vehicle.fuel_level ?? 0) < 50 ? '#fbbf24' : '#4ade80';

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Breadcrumb + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--color-muted-foreground)', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: '0.85rem' }}
            onClick={() => navigate('/vehicles')}
            className="hover:text-primary"
          >
            Vehicles
          </button>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>{vehicle.registration_number} — {vehicle.make} {vehicle.model}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <Download size={15} /> Export Log
          </button>
          <button
            id="edit-vehicle-detail-btn"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            onClick={() => setShowEditModal(true)}
          >
            <Edit2 size={14} /> Edit Vehicle
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'clamp(260px, 30%, 360px) 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Identity Card */}
          <div className="glass-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: '9999px',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                background: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}`,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusCfg.dot, animation: 'pulse 2s infinite' }} />
                {vehicle.status}
              </span>
            </div>

            {/* Vehicle ID & VIN */}
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-400)', margin: 0, letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
                {vehicle.registration_number}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-foreground)', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                VIN: {vehicle.vin}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)', marginTop: '0.1rem' }}>
                {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.type}
              </p>
            </div>

            {/* Vehicle Photo */}
            <div className="w-full h-40 rounded-xl bg-muted border border-border mb-4 overflow-hidden relative group">
              <img 
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80" 
                alt={`${vehicle.make} ${vehicle.model}`} 
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none flex flex-col justify-end p-4">
                <span className="text-xs text-white/90 tracking-widest uppercase font-bold drop-shadow-md">
                  {vehicle.make} {vehicle.model}
                </span>
              </div>
            </div>

            {/* Fuel & Tire PSI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div style={{ background: 'var(--color-muted)', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Droplets size={13} style={{ color: 'var(--color-muted-foreground)' }} />
                  <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
                    Fuel Level
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: fuelColor, fontFamily: 'monospace' }}>
                    {vehicle.fuel_level}%
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-foreground)' }}>
                    ~{Math.round((vehicle.fuel_level ?? 0) * 5)} Gal
                  </span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'var(--color-border)', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ width: `${vehicle.fuel_level}%`, height: '100%', background: fuelColor, borderRadius: 2, transition: 'width 0.4s' }} />
                </div>
              </div>
              <div style={{ background: 'var(--color-muted)', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Gauge size={13} style={{ color: 'var(--color-muted-foreground)' }} />
                  <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
                    Tire PSI
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-foreground)', fontFamily: 'monospace' }}>
                    {vehicle.tire_psi ?? '—'}
                  </span>
                  {(vehicle.tire_psi ?? 0) >= 105 && (
                    <span style={{ fontSize: '0.65rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 3 }}>
                      ✓ Optimal
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Personnel */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', marginBottom: '0.75rem' }}>
              Assigned Personnel
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--color-muted)', padding: '0.85rem', borderRadius: '0.75rem',
              border: '1px solid var(--color-border)',
            }}>
              {/* Avatar placeholder */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #004ac6, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--brand-400)',
              }}>
                <User size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-foreground)', margin: 0 }}>
                  {vehicle.driver_name}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-foreground)', margin: '2px 0 0' }}>
                  {vehicle.driver_cdl} · {vehicle.driver_experience}
                </p>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-foreground)', padding: 4 }}>
                <MessageSquare size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Telemetry KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              {
                label: 'Engine Temp',
                value: vehicle.engine_temp ? `${vehicle.engine_temp}°F` : '—',
                sub: vehicle.engine_temp ? 'Stable Operating Range' : 'Engine Off',
                icon: <Thermometer size={20} style={{ color: '#4ade80' }} />,
                subColor: '#4ade80',
              },
              {
                label: 'Current Speed',
                value: vehicle.current_speed ? `${vehicle.current_speed}` : '0',
                unit: 'MPH',
                sub: vehicle.current_speed && vehicle.current_speed > 55 ? `+${vehicle.current_speed - 55} over limit (avg)` : 'Within speed limit',
                icon: <Gauge size={20} style={{ color: vehicle.current_speed && vehicle.current_speed > 55 ? '#fbbf24' : '#60a5fa' }} />,
                subColor: vehicle.current_speed && vehicle.current_speed > 55 ? '#fbbf24' : '#4ade80',
              },
              {
                label: 'Load Weight',
                value: vehicle.load_weight ? `${vehicle.load_weight}` : '0',
                unit: 'TONS',
                sub: vehicle.load_weight ? `${Math.round((vehicle.load_weight / 40) * 100)}% Capacity` : 'Unloaded',
                icon: <Weight size={20} style={{ color: '#c4b5fd' }} />,
                subColor: 'var(--color-muted-foreground)',
              },
            ].map((k) => (
              <div key={k.label} className="glass-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', margin: 0 }}>
                    {k.label}
                  </p>
                  {k.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-foreground)', fontFamily: 'monospace', lineHeight: 1 }}>
                    {k.value}
                  </span>
                  {k.unit && <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>{k.unit}</span>}
                </div>
                <p style={{ fontSize: '0.75rem', color: k.subColor, margin: 0 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Live Map Embed */}
          <div className="glass-card h-60 relative overflow-hidden p-0 rounded-2xl border border-border shadow-sm">
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=-105.0%2C41.0%2C-104.6%2C41.3&layer=mapnik&marker=41.14%2C-104.82`}
              style={{ filter: 'grayscale(0.6) contrast(1.1) brightness(0.9) hue-rotate(190deg)' }}
              title="Live GPS Tracking"
            />
            {/* Current position overlay */}
            <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-md border border-border rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0 shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
              <div>
                <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Current Position</p>
                <p className="text-sm font-semibold text-foreground m-0">{vehicle.current_location}</p>
              </div>
            </div>
            {/* Interactive overlay block to prevent iframe hijacking scrolling occasionally */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]" />
          </div>

          {/* History / Logs Tabs */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Tab Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {([
                { key: 'maintenance', label: 'Maintenance History' },
                { key: 'routes',      label: 'Route Logs' },
                { key: 'fuel',        label: 'Fuel Transactions' },
              ] as { key: ActiveTab; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.75rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: activeTab === tab.key ? 700 : 400,
                    color: activeTab === tab.key ? 'var(--brand-400)' : 'var(--color-muted-foreground)',
                    borderBottom: activeTab === tab.key ? '2px solid var(--brand-400)' : '2px solid transparent',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                      {['Date', 'Service Type', 'Provider', 'Cost', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.maintenance.map((row, i) => {
                      const sc = MAINTENANCE_STATUS_COLORS[row.status];
                      return (
                        <tr key={row.id} style={{ borderBottom: i < vehicle.maintenance.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 0.12s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--color-foreground)' }}>{row.service_type}</td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--color-muted-foreground)', fontSize: '0.8rem' }}>{row.provider}</td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: 'var(--color-foreground)' }}>
                            {row.cost === 0 ? '$0.00' : `$${row.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td style={{ padding: '0.8rem 1rem' }}>
                            <span style={{ background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-muted)', display: 'flex', justifyContent: 'center' }}>
                  <button className="btn btn-ghost" style={{ fontSize: '0.8rem', color: 'var(--brand-400)' }}>
                    View All Records ({vehicle.maintenance.length})
                  </button>
                </div>
              </div>
            )}

            {/* Route Logs Tab */}
            {activeTab === 'routes' && (
              <div style={{ overflowX: 'auto' }}>
                {vehicle.routeLogs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: '0.85rem' }}>No route logs available.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                        {['Date', 'Route', 'Distance', 'Duration'].map((h) => (
                          <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.routeLogs.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < vehicle.routeLogs.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--color-foreground)' }}>{row.route}</td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: 'var(--brand-400)' }}>{row.distance}</td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--color-muted-foreground)' }}>{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Fuel Transactions Tab */}
            {activeTab === 'fuel' && (
              <div style={{ overflowX: 'auto' }}>
                {vehicle.fuelTx.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: '0.85rem' }}>No fuel transactions available.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                        {['Date', 'Location', 'Gallons', 'Total Cost'].map((h) => (
                          <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-muted-foreground)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.fuelTx.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < vehicle.fuelTx.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--color-foreground)' }}>{row.location}</td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: 'var(--color-foreground)' }}>{row.gallons} gal</td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: '#4ade80', fontWeight: 600 }}>
                            ${row.cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>

    {/* Edit Vehicle Modal */}
    {showEditModal && vehicle && (
      <VehicleModal
        vehicle={vehicle as Vehicle}
        onClose={() => setShowEditModal(false)}
        onSaved={(saved) => {
          setShowEditModal(false);
          // Refresh local state from mock store
          const stored = MOCK_STORE.find((v) => v.id === saved.id);
          if (stored) {
            setVehicle((prev) => prev ? { ...prev, ...stored } : prev);
          }
          toast.success(`Vehicle ${saved.registration_number} updated`);
        }}
      />
    )}
    </>
  );
}
