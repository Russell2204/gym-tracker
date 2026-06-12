import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getActiveWorkout, getPrograms, getScheduledFor, listFinishedWorkouts, getStats } from '@/lib/queries';
import { fmtDate, fmtDuration, fmtKg, plural, todayLocalISO } from '@/lib/types';
import StartButtons from '@/components/StartButtons';

export default async function DashboardPage() {
  const user = await requireUser();
  const active = getActiveWorkout(user.id);
  const today = todayLocalISO();
  const scheduledToday = getScheduledFor(user.id, today);
  const programs = getPrograms(user.id).map((p) => ({ id: p.id, name: p.name, count: p.items.length }));
  const finished = listFinishedWorkouts(user.id);
  const last = finished[0];
  const prevToLast = finished[1];
  const stats = getStats(user.id);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">
        {greeting}, {user.name}
      </h1>

      {active && (
        <Link href={`/workouts/${active.id}`} className="card block border-acc/50 bg-acc/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-acc">Идёт тренировка</div>
              <div className="mt-1 font-semibold">{active.name}</div>
            </div>
            <span className="btn-primary">Продолжить →</span>
          </div>
        </Link>
      )}

      {!active && scheduledToday.length > 0 && (
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-warn">Запланировано на сегодня</div>
          <div className="mt-2 space-y-2">
            {scheduledToday.map((w) => (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-mut/60"
              >
                <span className="font-medium">{w.name}</span>
                <span className="text-sm text-acc">Открыть →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!active && <StartButtons programs={programs} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-mut">Тренировок в этом месяце</div>
          <div className="num mt-1 text-3xl font-bold">{stats.monthCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-mut">Тоннаж за 7 дней</div>
          <div className="num mt-1 text-3xl font-bold">
            {fmtKg(stats.weekVolume)} <span className="text-base font-medium text-mut">кг</span>
          </div>
        </div>
      </div>

      {last && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-mut">Последняя тренировка</div>
            <Link href={`/workouts/${last.id}`} className="text-sm text-acc hover:underline">
              Детали →
            </Link>
          </div>
          <div className="mt-2 font-semibold">{last.name}</div>
          <div className="mt-1 text-sm text-mut">
            {fmtDate(last.finished_at)} · {last.exercises_count}{' '}
            {plural(last.exercises_count, 'упражнение', 'упражнения', 'упражнений')} · {last.sets_count}{' '}
            {plural(last.sets_count, 'подход', 'подхода', 'подходов')}
            {last.started_at &&
              ` · ${fmtDuration((new Date(last.finished_at).getTime() - new Date(last.started_at).getTime()) / 1000)}`}
          </div>
          <div className="num mt-3 text-2xl font-bold">
            {fmtKg(last.volume)} <span className="text-sm font-medium text-mut">кг тоннаж</span>
            {prevToLast && prevToLast.volume > 0 && (
              <span
                className={
                  'ml-2 text-sm font-semibold ' +
                  (last.volume >= prevToLast.volume ? 'text-ok' : 'text-hot')
                }
              >
                {last.volume >= prevToLast.volume ? '▲' : '▼'}{' '}
                {fmtKg(Math.abs(last.volume - prevToLast.volume))} к прошлой
              </span>
            )}
          </div>
        </div>
      )}

      {!last && !active && (
        <div className="card p-6 text-center text-sm text-mut">
          Здесь появится сводка после первой завершённой тренировки. Начни прямо сейчас или запланируй в календаре.
        </div>
      )}
    </div>
  );
}
