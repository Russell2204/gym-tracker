import { requireUser } from '@/lib/auth';
import { getExercises } from '@/lib/queries';
import ProgramBuilder from '@/components/ProgramBuilder';

export default async function NewProgramPage() {
  const user = await requireUser();
  const catalog = await getExercises(user.id);
  return <ProgramBuilder catalog={catalog} />;
}
