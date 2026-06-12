'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExerciseAction, deleteExerciseAction } from '@/lib/actions';
import { Exercise, MUSCLE_GROUPS } from '@/lib/types';

export default function ExercisesClient({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [group, setGroup] = useState(MUSCLE_GROUPS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const list = map.get(ex.muscle_group) ?? [];
      list.push(ex);
      map.set(ex.muscle_group, list);
    }
    return Array.from(map.entries());
  }, [exercises]);

  async function add() {
    setError(null);
    setPending(true);
    const res = await createExerciseAction({ name, muscle_group: group });
    setPending(false);
    if (res?.error) return setError(res.error);
    setName('');
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm('Удалить упражнение?')) return;
    const res = await deleteExerciseAction(id);
    if (res?.error) alert(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Упражнения</h1>

      <div className="card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-mut">Своё упражнение</div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Например: Тяга верхнего блока"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <select className="input sm:w-40" value={group} onChange={(e) => setGroup(e.target.value)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={add} disabled={pending}>
            Добавить
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-hot">{error}</p>}
      </div>

      {grouped.map(([groupName, list]) => (
        <div key={groupName}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">{groupName}</h2>
          <div className="card divide-y divide-line">
            {list.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>{ex.name}</span>
                  {ex.user_id != null && (
                    <span className="rounded-md bg-acc/15 px-1.5 py-0.5 text-[11px] font-medium text-acc">
                      своё
                    </span>
                  )}
                </div>
                {ex.user_id != null && (
                  <button
                    onClick={() => remove(ex.id)}
                    className="text-sm text-mut transition-colors hover:text-hot"
                    aria-label={`Удалить ${ex.name}`}
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
