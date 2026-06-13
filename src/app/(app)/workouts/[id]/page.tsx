import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getWorkoutDetail, getExercises } from '@/lib/queries';
import { fmtDate } from '@/lib/types';
import WorkoutSession from '@/components/WorkoutSession';
import WorkoutSummary from '@/components/WorkoutSummary';
import ScheduledActions from '@/components/ScheduledActions';

export default async function WorkoutPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const workout = await getWorkoutDetail(id, user.id);
  if (!workout) notFound();

  if (workout.status === 'active') {
    const catalog = (await getExercises(user.id)).map((e) => ({
      id: e.id,
      name: e.name,
      muscle_group: e.muscle_group
    }));
    return <WorkoutSession workout={workout} catalog={catalog} />;
  }

  if (workout.status === 'finished') {
    return <WorkoutSummary workout={workout} />;
  }

  // Запланированная тренировка — превью.
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-warn">Запланирована</div>
        <h1 className="mt-1 text-xl font-semibold">{workout.name}</h1>
        {workout.scheduled_for && (
          <p className="mt-1 text-sm text-mut">на {fmtDate(workout.scheduled_for, true)}</p>
        )}
      </div>

      {workout.exercises.length > 0 ? (
        <div className="card divide-y divide-line">
          {workout.exercises.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span>{e.name}</span>
                {e.superset_group != null && (
                  <span className="ml-2 rounded-md bg-warn/15 px-1.5 py-0.5 text-xs font-semibold text-warn">
                    суперсет
                  </span>
                )}
              </div>
              <span className="num text-sm text-mut">
                {e.target_sets ?? '—'}×{e.target_reps ?? '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-5 text-sm text-mut">
          Пустая тренировка — упражнения добавишь по ходу дела.
        </div>
      )}

      <ScheduledActions workoutId={workout.id} />
    </div>
  );
}
