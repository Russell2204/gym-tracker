import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listFinishedWorkouts } from '@/lib/queries';
import { fmtDate, fmtDuration, fmtKg, plural } from '@/lib/types';

export default async function WorkoutsPage() {
  const user = await requireUser();
  const workouts = listFinishedWorkouts(user.id);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">История тренировок</h1>

      {workouts.length === 0 && (
        <div className="card p-6 text-center text-sm text-mut">
          Завершённых тренировок пока нет. Первая запись появится здесь сразу после кнопки «Завершить тренировку».
        </div>
      )}

      <div className="space-y-3">
        {workouts.map((w) => (
          <Link key={w.id} href={`/workouts/${w.id}`} className="card block p-4 transition-colors hover:border-mut/60">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{w.name}</div>
                <div className="mt-1 text-sm text-mut">
                  {fmtDate(w.finished_at, true)}
                  {w.started_at &&
                    ` · ${fmtDuration((new Date(w.finished_at).getTime() - new Date(w.started_at).getTime()) / 1000)}`}
                  {' · '}
                  {w.exercises_count} {plural(w.exercises_count, 'упражнение', 'упражнения', 'упражнений')}
                  {' · '}
                  {w.sets_count} {plural(w.sets_count, 'подход', 'подхода', 'подходов')}
                </div>
              </div>
              <div className="num shrink-0 text-right text-xl font-bold">
                {fmtKg(w.volume)}
                <div className="text-xs font-medium text-mut">кг</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
