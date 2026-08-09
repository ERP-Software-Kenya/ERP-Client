export interface Vehicle {
  id: string;
  registration_number: string;
  vin?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  status?: 'In Transit' | 'Available' | 'Maintenance' | 'Out of Service';
  fuel_level?: number;
  tire_psi?: number;
  engine_temp?: number;
  current_speed?: number;
  load_weight?: number;
  current_location?: string;
  driver_name?: string;
  driver_cdl?: string;
  driver_experience?: string;
  last_service_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  date: string;
  service_type: string;
  provider: string;
  cost: number;
  status: 'Completed' | 'Scheduled' | 'In Progress';
}

// ── Fleet Reference Data ──────────────────────────────────────────────────────

export interface VehicleTypeRef {
  id: string;
  name: string;
  description?: string;
}

export interface VehicleBrandRef {
  id: string;
  brandName: string;
}

export interface FuelTypeRef {
  id: string;
  name: string;
}

export interface MaintenanceTypeRef {
  id: string;
  name: string;
}

// ── Fleet Management — real API shapes (core-apis feat/vehicle-and-transportation-management) ──

export type FleetVehicleStatus = 'available' | 'in_transit' | 'maintenance' | 'idle' | 'out_of_service';

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  vinNumber?: string;
  registrationNumber?: string;
  companyId: string;
  vehicleTypeId: string;
  brandId: string;
  model?: string;
  color?: string;
  fuelTypeId: string;
  status?: FleetVehicleStatus;
  imageUrl?: string;
}

export type FleetDriverStatus = 'active' | 'inactive' | 'on_trip' | 'suspended';

export interface FleetDriver {
  id: string;
  organizationId: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseType?: string;
  address?: string;
  emergencyContact?: string;
  status?: FleetDriverStatus;
}

export type FleetTripStatus = 'scheduled' | 'in_transit' | 'completed' | 'cancelled' | 'delayed';

export interface FleetTrip {
  id: string;
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  customerId: string;
  pickupLocation: string;
  dropLocation: string;
  startDatetime: string;
  endDatetime?: string;
  estimatedDistance?: number;
  actualDistance?: number;
  tripStatus: FleetTripStatus;
  priority: string;
}

export interface FleetMaintenance {
  id: string;
  vehicleId: string;
  serviceCenter: string;
}
