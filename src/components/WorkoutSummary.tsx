'use client';

import { useState } from 'react';
import { deleteWorkoutAction } from '@/lib/actions';
import { WorkoutDetail, fmtDate, fmtDuration, fmtKg, plural } from '@/lib/types';

function numStr(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export default function WorkoutSummary({ workout }: { workout: WorkoutDetail }) {
  const [pending, setPending] = useState(false);

  const totalVolume = workout.exercises.reduce(
    (s, e) => s + e.sets.reduce((x, set) => x + set.reps * set.weight, 0),
    0
  );
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
  const durationSec =
    workout.started_at && workout.finished_at
      ? (new Date(workout.finished_at).getTime() - new Date(workout.started_at).getTime()) / 1000
      : null;

  const prev = workout.prev_workout;
  const volumeDelta = prev && prev.volume > 0 ? totalVolume - prev.volume : null;

  async function remove() {
    if (!confirm('Удалить тренировку из истории? Это действие нельзя отменить.')) return;
    setPending(true);
    await deleteWorkoutAction(workout.id);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-ok">Завершена</div>
        <h1 className="mt-1 text-xl font-semibold">{workout.name}</h1>
        <p className="mt-1 text-sm text-mut">
          {workout.finished_at && fmtDate(workout.finished_at, true)}
          {durationSec != null && ` · ${fmtDuration(durationSec)}`}
          {' · '}
          {totalSets} {plural(totalSets, 'подход', 'подхода', 'подходов')}
        </p>
      </div>

      <div className="card p-4">
        <div className="text-xs text-mut">Тоннаж за тренировку</div>
        <div className="num mt-1 text-3xl font-bold">
          {fmtKg(totalVolume)} <span className="text-base font-medium text-mut">кг</span>
        </div>
        {volumeDelta != null && (
          <div className={'mt-1 text-sm font-semibold ' + (volumeDelta >= 0 ? 'text-ok' : 'text-hot')}>
            {volumeDelta >= 0 ? '▲' : '▼'} {fmtKg(Math.abs(volumeDelta))} кг к прошлой тренировке (
            {fmtDate(prev!.finished_at)})
          </div>
        )}
      </div>

      <div className="space-y-3">
        {workout.exercises.map((e) => {
          const vol = e.sets.reduce((s, set) => s + set.reps * set.weight, 0);
          const maxNow = e.sets.reduce((m, s) => Math.max(m, s.weight), 0);
          const maxPrev = e.prev ? e.prev.sets.reduce((m, s) => Math.max(m, s.weight), 0) : null;
          const delta = maxPrev != null && maxPrev > 0 ? maxNow - maxPrev : null;

          return (
            <div key={e.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{e.name}</div>
                {e.sets.length > 0 && (
                  <div className="num shrink-0 text-sm text-mut">{fmtKg(vol)} кг</div>
                )}
              </div>

              {e.sets.length > 0 ? (
                <div className="num mt-2 flex flex-wrap gap-1.5 text-sm">
                  {e.sets.map((s) => (
                    <span key={s.id} className="rounded-lg border border-line px-2 py-1">
                      {numStr(s.weight)}×{s.reps}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-mut">Подходы не записаны</p>
              )}

              {e.prev && (
                <div className="mt-2 text-xs text-mut">
                  Прошлый раз ({fmtDate(e.prev.workout_date)}):{' '}
                  <span className="num">
                    {e.prev.sets.map((s) => `${numStr(s.weight)}×${s.reps}`).join(' · ')}
                  </span>
                  {delta != null && delta !== 0 && (
                    <span className={'ml-2 font-semibold ' + (delta > 0 ? 'text-ok' : 'text-hot')}>
                      {delta > 0 ? '▲' : '▼'} {fmtKg(Math.abs(delta))} кг к лучшему весу
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-danger-ghost w-full" onClick={remove} disabled={pending}>
        Удалить тренировку
      </button>
    </div>
  );
}
