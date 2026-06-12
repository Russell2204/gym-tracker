import { requireUser } from '@/lib/auth';
import { getExercises } from '@/lib/queries';
import ExercisesClient from '@/components/ExercisesClient';

export default async function ExercisesPage() {
  const user = await requireUser();
  const exercises = getExercises(user.id);
  return <ExercisesClient exercises={exercises} />;
}
