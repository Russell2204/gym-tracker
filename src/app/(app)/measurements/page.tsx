import { requireUser } from '@/lib/auth';
import { getMeasurements } from '@/lib/queries';
import MeasurementsClient from '@/components/MeasurementsClient';

export default async function MeasurementsPage() {
  const user = await requireUser();
  const measurements = await getMeasurements(user.id);
  return <MeasurementsClient measurements={measurements} />;
}
