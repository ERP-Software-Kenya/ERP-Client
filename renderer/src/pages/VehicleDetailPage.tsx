import { useParams } from 'react-router-dom';
import { VehicleDetailView } from '../components/VehicleDetailView';

export default function VehicleDetailPage() {
  const { id } = useParams();
  return <VehicleDetailView vehicleId={id ?? ''} />;
}
