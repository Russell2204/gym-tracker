'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Zap, ChevronRight } from 'lucide-react';
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
    <div className="card bg-card-sheen p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-mut">Начать тренировку</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary flex-1" onClick={() => setOpen((v) => !v)} disabled={pending}>
          <Play size={16} />
          По программе
        </button>
        <button className="btn-ghost flex-1" onClick={startEmpty} disabled={pending}>
          <Zap size={16} />
          Пустая тренировка
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {programs.length === 0 && (
                <p className="text-sm text-mut">Программ пока нет — создай первую на вкладке «Программы».</p>
              )}
              {programs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => startProgram(p.id)}
                  disabled={pending}
                  className="group flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-acc disabled:opacity-50"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="flex items-center gap-1 text-sm text-mut">
                    {p.count} упр.
                    <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
