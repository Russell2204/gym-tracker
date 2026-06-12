'use client';

import { useState } from 'react';
import { startProgramNowAction, startEmptyWorkoutAction } from '@/lib/actions';

type Item = { id: number; name: string; count: number };

export default function StartButtons({ programs }: { programs: Item[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function startProgram(id: number) {
    setPending(true);
    await startProgramNowAction(id);
  }

  async function startEmpty() {
    setPending(true);
    await startEmptyWorkoutAction();
  }

  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-mut">Начать тренировку</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary flex-1" onClick={() => setOpen((v) => !v)} disabled={pending}>
          По программе
        </button>
        <button className="btn-ghost flex-1" onClick={startEmpty} disabled={pending}>
          Пустая тренировка
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {programs.length === 0 && (
            <p className="text-sm text-mut">Программ пока нет — создай первую на вкладке «Программы».</p>
          )}
          {programs.map((p) => (
            <button
              key={p.id}
              onClick={() => startProgram(p.id)}
              disabled={pending}
              className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-acc disabled:opacity-50"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-mut">{p.count} упр.</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
