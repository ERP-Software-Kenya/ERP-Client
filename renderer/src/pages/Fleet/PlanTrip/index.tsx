import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { FormSelect } from '../../../components/FormSelect';
import { FleetDrivers, FleetVehicles } from '../../../api';
import { post } from '../../../lib/http';
import type { PackedOrder, TripStop, CreateTripPayload } from '../../../types';

export default function PlanTrip(): React.JSX.Element {
  const { state } = useLocation();
  const navigate = useNavigate();
  const selectedOrders: PackedOrder[] = (state as { orders: PackedOrder[] } | null)?.orders ?? [];

  const [stops, setStops] = useState<TripStop[]>(
    selectedOrders.map((order, idx) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      sequence: idx + 1,
    })),
  );
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: driversData, isLoading: driversLoading } = FleetDrivers.useSearch({ page: 1, search: '' });
  const { data: vehiclesData, isLoading: vehiclesLoading } = FleetVehicles.useSearch({ page: 1, search: '' });

  const drivers = (driversData?.items ?? []).filter(
    (dr) => (dr.status as string) === 'active',
  );
  const vehicles = (vehiclesData?.items ?? []).filter(
    (vh) => (vh.status as string) === 'available',
  );

  const moveStop = (fromIdx: number, toIdx: number): void => {
    const next = [...stops];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setStops(next.map((stop, idx) => ({ ...stop, sequence: idx + 1 })));
  };

  const handleConfirm = async (): Promise<void> => {
    if (!driverId || !vehicleId) {
      toast.error('Please assign both a driver and a vehicle');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateTripPayload = {
        driverId,
        vehicleId,
        stops: stops.map((stop) => ({ orderId: stop.orderId, sequence: stop.sequence })),
      };
      await post('/api/v1/field-ops/trips', payload);
      toast.success('Trip created and sent to driver app');
      navigate('/fleet/dispatch');
    } catch {
      toast.error('Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Plan Trip</h2>
          <p className="text-muted-foreground text-sm">{stops.length} stops selected</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Stop Sequence
        </h3>
        {stops.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No orders selected. Go back to Dispatch Center to select orders.
          </p>
        )}
        {stops.map((stop, idx) => (
          <div
            key={stop.orderId}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {stop.sequence}
            </span>
            <div className="flex-1">
              <div className="font-medium text-sm">{stop.orderNumber}</div>
              <div className="text-xs text-muted-foreground">
                {stop.customerName} — {stop.deliveryAddress}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={idx === 0}
                onClick={() => moveStop(idx, idx - 1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={idx === stops.length - 1}
                onClick={() => moveStop(idx, idx + 1)}
              >
                ↓
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Assign Driver
        </h3>
        <FormSelect
          value={driverId}
          onChange={setDriverId}
          loading={driversLoading}
          options={drivers.map((dr) => ({
            value: dr.id,
            label: `${dr.firstName} ${dr.lastName}`,
          }))}
          placeholder="Select a driver…"
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Assign Vehicle
        </h3>
        <FormSelect
          value={vehicleId}
          onChange={setVehicleId}
          loading={vehiclesLoading}
          options={vehicles.map((vh) => ({
            value: vh.id,
            label: `${vh.vehicleNumber}${vh.model ? ` — ${vh.model}` : ''}`,
          }))}
          placeholder="Select a vehicle…"
        />
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={() => void handleConfirm()}
        disabled={submitting || stops.length === 0}
      >
        {submitting ? 'Creating Trip…' : '✓ Confirm & Send to Driver App'}
      </Button>
    </div>
  );
}
