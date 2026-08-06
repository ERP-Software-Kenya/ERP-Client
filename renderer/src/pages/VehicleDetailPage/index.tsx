import { useParams } from 'react-router-dom';
import { VehicleDetailView } from '../VehiclesPage/components/VehicleDetailView';

export default function VehicleDetailPage() {
  const { id } = useParams();
  return <VehicleDetailView vehicleId={id ?? ''} />;
}
