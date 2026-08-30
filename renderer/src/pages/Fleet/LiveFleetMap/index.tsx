import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FleetLiveLocations } from '../../../api';
import type { LiveDriverLocation } from '../../../types';

// Fix leaflet default icon broken by webpack/vite asset hashing
type LeafletIconDefaultPrototype = typeof L.Icon.Default.prototype & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as LeafletIconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  in_transit: '#3b74f5',
  delayed: '#f59e0b',
  completed: '#22c55e',
};

interface CentrifugoDetail {
  type?: string;
}

export default function LiveFleetMap(): React.JSX.Element {
  const [selectedDriver, setSelectedDriver] = useState<LiveDriverLocation | null>(null);
  const { data, isLoading, refetch } = FleetLiveLocations.useSearch({ page: 1, search: '' });
  const drivers: LiveDriverLocation[] = data?.items ?? [];

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<CentrifugoDetail>).detail;
      if (detail?.type === 'driver:location') {
        void refetch();
      }
    };
    window.addEventListener('centrifugo:publication', handler);
    return () => window.removeEventListener('centrifugo:publication', handler);
  }, [refetch]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refetch();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading fleet map…</div>
    );
  }

  const center: [number, number] =
    drivers.length > 0
      ? [drivers[0].latitude, drivers[0].longitude]
      : [25.2048, 55.2708];

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Live Fleet Map</h2>
          <p className="text-muted-foreground text-sm">
            {drivers.filter((dr) => dr.status === 'in_transit').length} drivers active
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#3b74f5]" /> In Transit
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> Delayed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" /> Completed
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div className="flex-1 overflow-hidden rounded-lg border">
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {drivers.map((driver) => (
              <Marker
                key={driver.driverId}
                position={[driver.latitude, driver.longitude]}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="background:${STATUS_COLORS[driver.status] ?? '#64748b'};width:32px;height:32px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚚</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
                eventHandlers={{ click: () => setSelectedDriver(driver) }}
              >
                <Popup>
                  <strong>{driver.driverName}</strong>
                  <br />
                  {driver.vehiclePlate} — {driver.stopsRemaining} stops left
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="flex w-72 flex-col gap-2 overflow-y-auto">
          <h3 className="font-semibold text-sm">Driver Status</h3>
          {drivers.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No active drivers</p>
          )}
          {drivers.map((driver) => (
            <button
              key={driver.driverId}
              type="button"
              onClick={() => setSelectedDriver(driver)}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                selectedDriver?.driverId === driver.driverId ? 'border-primary bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{driver.driverName}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: `${STATUS_COLORS[driver.status] ?? '#64748b'}20`,
                    color: STATUS_COLORS[driver.status] ?? '#64748b',
                  }}
                >
                  {driver.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{driver.vehiclePlate}</div>
              <div className="text-xs text-muted-foreground">
                {driver.stopsRemaining} stops remaining
              </div>
              <div className="text-xs text-muted-foreground">
                Last ping: {new Date(driver.lastUpdated).toLocaleTimeString()}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
