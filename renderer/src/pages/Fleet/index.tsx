import { Car, Users, Route, Wrench, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FleetVehicles, FleetDrivers, FleetTrips } from '../../api';
import type { FleetVehicle, FleetDriver, FleetTrip } from '../../types';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <div className="p-5 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  available:     '#22c55e',
  in_transit:    '#3b82f6',
  maintenance:   '#f59e0b',
  idle:          '#8b5cf6',
  out_of_service:'#ef4444',
};

const DRIVER_STATUS_COLORS: Record<string, string> = {
  active:    '#22c55e',
  on_trip:   '#3b82f6',
  inactive:  '#6b7280',
  suspended: '#ef4444',
};

function buildStatusCounts<T extends { status?: string }>(items: T[]): Array<{ name: string; value: number; color: string }> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = item.status ?? 'unknown';
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
    color: STATUS_COLORS[name] ?? '#6b7280',
  }));
}

function buildTripPriorityData(trips: FleetTrip[]): Array<{ name: string; value: number }> {
  const map: Record<string, number> = {};
  for (const trip of trips) {
    const key = trip.priority ?? 'medium';
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function FleetDashboard() {
  const { data: vehicles = [], isLoading: loadingVehicles } = FleetVehicles.useList();
  const { data: drivers = [], isLoading: loadingDrivers } = FleetDrivers.useList();
  const { data: tripsResult, isLoading: loadingTrips } = FleetTrips.useSearch({ limit: 100 });
  const trips: FleetTrip[] = tripsResult?.items ?? [];

  const loading = loadingVehicles || loadingDrivers || loadingTrips;

  const vehicleStatusData = buildStatusCounts<FleetVehicle>(vehicles);
  const driverStatusData  = buildStatusCounts<FleetDriver>(drivers).map((d) => ({
    ...d,
    color: DRIVER_STATUS_COLORS[d.name.replace(/ /g, '_')] ?? '#6b7280',
  }));
  const tripPriorityData  = buildTripPriorityData(trips);

  const activeTrips      = trips.filter((t) => t.tripStatus === 'in_transit').length;
  const completedTrips   = trips.filter((t) => t.tripStatus === 'completed').length;
  const scheduledTrips   = trips.filter((t) => t.tripStatus === 'scheduled').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Fleet Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time overview of your fleet operations</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Vehicles"   value={loading ? '…' : vehicles.length} icon={Car}       color="bg-blue-500" />
        <StatCard label="Total Drivers"    value={loading ? '…' : drivers.length}  icon={Users}     color="bg-purple-500" />
        <StatCard label="Active Trips"     value={loading ? '…' : activeTrips}      icon={Route}     color="bg-green-500" />
        <StatCard label="Scheduled"        value={loading ? '…' : scheduledTrips}   icon={Activity}  color="bg-amber-500" />
        <StatCard label="Completed Trips"  value={loading ? '…' : completedTrips}   icon={TrendingUp} color="bg-teal-500" />
        <StatCard label="In Maintenance"   value={loading ? '…' : vehicles.filter((v) => v.status === 'maintenance').length} icon={Wrench} color="bg-red-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vehicle Status Pie */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 text-foreground">Vehicle Status</h3>
          {loading || vehicleStatusData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Loading…' : 'No vehicles yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {vehicleStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Driver Status Pie */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 text-foreground">Driver Status</h3>
          {loading || driverStatusData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Loading…' : 'No drivers yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={driverStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                  {driverStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trip Priority Bar */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 text-foreground">Trips by Priority</h3>
          {loading || tripPriorityData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Loading…' : 'No trips yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tripPriorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent trips table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Recent Trips</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : trips.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No trips found. Create your first trip in Fleet → Trips.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left">Trip #</th>
                  <th className="px-4 py-2 text-left">Pickup</th>
                  <th className="px-4 py-2 text-left">Drop</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trips.slice(0, 8).map((trip) => (
                  <tr key={trip.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 font-mono font-bold text-primary">{trip.tripNumber}</td>
                    <td className="px-4 py-2 text-foreground max-w-[140px] truncate">{trip.pickupLocation}</td>
                    <td className="px-4 py-2 text-foreground max-w-[140px] truncate">{trip.dropLocation}</td>
                    <td className="px-4 py-2">
                      <TripStatusBadge status={trip.tripStatus} />
                    </td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{trip.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function TripStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    scheduled:  { bg: 'bg-blue-500/10',   text: 'text-blue-500' },
    in_transit: { bg: 'bg-green-500/10',  text: 'text-green-500' },
    completed:  { bg: 'bg-teal-500/10',   text: 'text-teal-500' },
    cancelled:  { bg: 'bg-red-500/10',    text: 'text-red-500' },
    delayed:    { bg: 'bg-amber-500/10',  text: 'text-amber-500' },
  };
  const c = cfg[status] ?? cfg.scheduled;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function VehicleStatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    available:      { bg: 'bg-green-500/10',  text: 'text-green-500' },
    in_transit:     { bg: 'bg-blue-500/10',   text: 'text-blue-500' },
    maintenance:    { bg: 'bg-amber-500/10',  text: 'text-amber-500' },
    idle:           { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    out_of_service: { bg: 'bg-red-500/10',    text: 'text-red-500' },
  };
  const key = status ?? 'available';
  const c = cfg[key] ?? cfg.available;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {key.replace(/_/g, ' ')}
    </span>
  );
}

export function DriverStatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'bg-green-500/10',  text: 'text-green-500' },
    on_trip:   { bg: 'bg-blue-500/10',   text: 'text-blue-500' },
    inactive:  { bg: 'bg-gray-500/10',   text: 'text-gray-400' },
    suspended: { bg: 'bg-red-500/10',    text: 'text-red-500' },
  };
  const key = status ?? 'active';
  const c = cfg[key] ?? cfg.active;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {key.replace(/_/g, ' ')}
    </span>
  );
}
