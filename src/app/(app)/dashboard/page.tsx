import Link from 'next/link';
import { Flame, BarChart3, ArrowRight, Trophy } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getActiveWorkout, getPrograms, getScheduledFor, listFinishedWorkouts, getStats } from '@/lib/queries';
import { fmtDate, fmtDuration, fmtKg, plural, todayLocalISO } from '@/lib/types';
import StartButtons from '@/components/StartButtons';

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayLocalISO();
  const [active, scheduledToday, programsFull, finished, stats] = await Promise.all([
    getActiveWorkout(user.id),
    getScheduledFor(user.id, today),
    getPrograms(user.id),
    listFinishedWorkouts(user.id),
    getStats(user.id)
  ]);
  const programs = programsFull.map((p) => ({ id: p.id, name: p.name, count: p.items.length }));
  const last = finished[0];
  const prevToLast = finished[1];

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="space-y-5">
      <div className="relative -mx-4 -mt-5 overflow-hidden bg-hero-radial px-4 pb-5 pt-6">
        <h1 className="text-2xl font-semibold">
          {greeting}, <span className="text-gradient">{user.name}</span>
        </h1>
        <p className="mt-1 text-sm text-mut">Каждый подход — в зачёт.</p>
      </div>

      {active && (
        <Link href={`/workouts/${active.id}`} className="card block border-acc/50 bg-acc/10 p-4 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-acc">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
                </span>
                Идёт тренировка
              </div>
              <div className="mt-1 font-semibold">{active.name}</div>
            </div>
            <span className="btn-primary">
              Продолжить
              <ArrowRight size={16} />
            </span>
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
                <span className="flex items-center gap-1 text-sm text-acc">
                  Открыть
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!active && <StartButtons programs={programs} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="card-hover p-4">
          <div className="flex items-center gap-1.5 text-xs text-mut">
            <Flame size={13} className="text-warn" />
            Тренировок в этом месяце
          </div>
          <div className="num mt-1 text-3xl font-bold">{stats.monthCount}</div>
        </div>
        <div className="card-hover p-4">
          <div className="flex items-center gap-1.5 text-xs text-mut">
            <BarChart3 size={13} className="text-acc" />
            Тоннаж за 7 дней
          </div>
          <div className="num mt-1 text-3xl font-bold">
            {fmtKg(stats.weekVolume)} <span className="text-base font-medium text-mut">кг</span>
          </div>
        </div>
      </div>

      {last && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-mut">
              <Trophy size={13} className="text-warn" />
              Последняя тренировка
            </div>
            <Link href={`/workouts/${last.id}`} className="flex items-center gap-1 text-sm text-acc hover:underline">
              Детали
              <ArrowRight size={14} />
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
            <span className="text-gradient">{fmtKg(last.volume)}</span>{' '}
            <span className="text-sm font-medium text-mut">кг тоннаж</span>
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
