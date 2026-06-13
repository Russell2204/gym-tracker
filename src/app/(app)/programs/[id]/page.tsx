import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getExercises, getProgram } from '@/lib/queries';
import ProgramBuilder from '@/components/ProgramBuilder';

export default async function EditProgramPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [program, catalog] = await Promise.all([getProgram(id, user.id), getExercises(user.id)]);
  if (!program) notFound();
  return <ProgramBuilder catalog={catalog} initial={program} />;
}
