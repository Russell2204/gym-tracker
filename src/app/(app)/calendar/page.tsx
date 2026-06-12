import { requireUser } from '@/lib/auth';
import { getCalendarWorkouts, getPrograms } from '@/lib/queries';
import CalendarClient from '@/components/CalendarClient';

export default async function CalendarPage() {
  const user = await requireUser();
  const workouts = getCalendarWorkouts(user.id);
  const programs = getPrograms(user.id).map((p) => ({ id: p.id, name: p.name }));
  return <CalendarClient workouts={workouts} programs={programs} />;
}
