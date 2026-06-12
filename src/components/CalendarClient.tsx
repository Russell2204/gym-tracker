'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleWorkoutAction } from '@/lib/actions';
import { CalendarWorkout, todayLocalISO } from '@/lib/types';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function CalendarClient({
  workouts,
  programs
}: {
  workouts: CalendarWorkout[];
  programs: Array<{ id: number; name: string }>;
}) {
  const router = useRouter();
  const today = todayLocalISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarWorkout[]>();
    for (const w of workouts) {
      const list = map.get(w.date) ?? [];
      list.push(w);
      map.set(w.date, list);
    }
    return map;
  }, [workouts]);

  const monthTitle = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(
    new Date(cursor.y, cursor.m, 1)
  );

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7; // Пн = 0
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, date: `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}` });
    }
    return out;
  }, [cursor]);

  function shiftMonth(dir: -1 | 1) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  async function schedule(programId: number | null) {
    if (!modalDate) return;
    setPending(true);
    const res = await scheduleWorkoutAction({ date: modalDate, programId });
    setPending(false);
    if (res?.error) {
      alert(res.error);
      return;
    }
    setModalDate(null);
    router.refresh();
  }

  function chipClass(status: string) {
    if (status === 'finished') return 'bg-ok/15 text-ok';
    if (status === 'active') return 'bg-acc text-white';
    return 'border border-acc/60 text-acc';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Календарь</h1>
        <div className="flex items-center gap-1">
          <button className="btn-ghost h-9 w-9 !p-0" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
            ‹
          </button>
          <div className="w-36 text-center text-sm font-medium capitalize">{monthTitle}</div>
          <button className="btn-ghost h-9 w-9 !p-0" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
            ›
          </button>
        </div>
      </div>

      <div className="card p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-mut">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`x${i}`} />;
            const list = byDate.get(cell.date) ?? [];
            const isToday = cell.date === today;
            const canSchedule = cell.date >= today;
            return (
              <div
                key={cell.date}
                onClick={() => canSchedule && setModalDate(cell.date)}
                className={
                  'min-h-[72px] rounded-xl border p-1.5 transition-colors ' +
                  (isToday ? 'border-acc/70 bg-acc/5 ' : 'border-line ') +
                  (canSchedule ? 'cursor-pointer hover:border-mut/60' : 'opacity-60')
                }
              >
                <div className={'text-xs font-semibold ' + (isToday ? 'text-acc' : 'text-mut')}>
                  {cell.day}
                </div>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 2).map((w) => (
                    <button
                      key={w.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/workouts/${w.id}`);
                      }}
                      className={
                        'block w-full truncate rounded-md px-1 py-0.5 text-left text-[10px] font-medium leading-tight ' +
                        chipClass(w.status)
                      }
                      title={w.name}
                    >
                      {w.name}
                    </button>
                  ))}
                  {list.length > 2 && <div className="text-[10px] text-mut">+{list.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 px-1 pb-1 text-[11px] text-mut">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-acc/60" /> запланирована
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-acc" /> идёт
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-ok/40" /> завершена
          </span>
        </div>
      </div>

      <p className="text-xs text-mut">
        Нажми на сегодняшний или будущий день, чтобы запланировать тренировку. Нажми на тренировку, чтобы открыть её.
      </p>

      {modalDate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setModalDate(null)}
        >
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">
              Запланировать на{' '}
              {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(
                new Date(modalDate + 'T12:00:00')
              )}
            </h2>
            <div className="mt-4 space-y-2">
              {programs.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-acc disabled:opacity-50"
                  onClick={() => schedule(p.id)}
                  disabled={pending}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-acc">→</span>
                </button>
              ))}
              <button
                className="btn-ghost w-full"
                onClick={() => schedule(null)}
                disabled={pending}
              >
                Пустая тренировка
              </button>
            </div>
            <button className="mt-3 w-full text-center text-sm text-mut hover:text-ink" onClick={() => setModalDate(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
