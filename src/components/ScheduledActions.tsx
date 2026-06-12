'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelScheduledAction, startWorkoutAction } from '@/lib/actions';

export default function ScheduledActions({ workoutId }: { workoutId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    await startWorkoutAction(workoutId);
    router.refresh();
  }

  async function cancel() {
    if (!confirm('Отменить запланированную тренировку?')) return;
    setPending(true);
    await cancelScheduledAction(workoutId);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button className="btn-primary flex-1" onClick={start} disabled={pending}>
        Начать тренировку
      </button>
      <button className="btn-danger-ghost" onClick={cancel} disabled={pending}>
        Отменить
      </button>
    </div>
  );
}
