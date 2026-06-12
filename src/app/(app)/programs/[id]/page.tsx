import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getExercises, getProgram } from '@/lib/queries';
import ProgramBuilder from '@/components/ProgramBuilder';

export default async function EditProgramPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const program = getProgram(id, user.id);
  if (!program) notFound();
  const catalog = getExercises(user.id);
  return <ProgramBuilder catalog={catalog} initial={program} />;
}
