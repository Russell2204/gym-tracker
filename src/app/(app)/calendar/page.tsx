import { requireUser } from '@/lib/auth';
import { getCalendarWorkouts, getPrograms } from '@/lib/queries';
import CalendarClient from '@/components/CalendarClient';

export default async function CalendarPage() {
  const user = await requireUser();
  const [workouts, programsFull] = await Promise.all([getCalendarWorkouts(user.id), getPrograms(user.id)]);
  const programs = programsFull.map((p) => ({ id: p.id, name: p.name }));
  return <CalendarClient workouts={workouts} programs={programs} />;
}
