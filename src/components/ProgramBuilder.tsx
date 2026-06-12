'use client';

import { useState } from 'react';
import { saveProgramAction } from '@/lib/actions';
import { Exercise, Program } from '@/lib/types';

type Row = {
  key: number;
  exercise_id: number;
  name: string;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  superset_group: number | null;
};

const GROUP_LABELS: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C' };

let keySeq = 1;

export default function ProgramBuilder({
  catalog,
  initial
}: {
  catalog: Exercise[];
  initial?: Program;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rows, setRows] = useState<Row[]>(
    () =>
      initial?.items.map((it) => ({
        key: keySeq++,
        exercise_id: it.exercise_id,
        name: it.exercise_name,
        target_sets: it.target_sets,
        target_reps: it.target_reps,
        rest_seconds: it.rest_seconds,
        superset_group: it.superset_group
      })) ?? []
  );
  const [pickerValue, setPickerValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addExercise(id: number) {
    const ex = catalog.find((e) => e.id === id);
    if (!ex) return;
    setRows((r) => [
      ...r,
      {
        key: keySeq++,
        exercise_id: ex.id,
        name: ex.name,
        target_sets: 3,
        target_reps: '8',
        rest_seconds: 180,
        superset_group: null
      }
    ]);
    setPickerValue('');
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function move(index: number, dir: -1 | 1) {
    setRows((r) => {
      const next = [...r];
      const j = index + dir;
      if (j < 0 || j >= next.length) return r;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function remove(key: number) {
    setRows((r) => r.filter((row) => row.key !== key));
  }

  async function save() {
    setError(null);
    setPending(true);
    const res = await saveProgramAction({
      id: initial?.id,
      name,
      description,
      items: rows.map((r) => ({
        exercise_id: r.exercise_id,
        target_sets: r.target_sets,
        target_reps: r.target_reps,
        rest_seconds: r.rest_seconds,
        superset_group: r.superset_group
      }))
    });
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{initial ? 'Изменить программу' : 'Новая программа'}</h1>

      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="pname">Название</label>
          <input
            id="pname"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Фуллбади · воскресенье"
          />
        </div>
        <div>
          <label className="label" htmlFor="pdesc">Описание</label>
          <textarea
            id="pdesc"
            className="input min-h-[64px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Заметки по программе (необязательно)"
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.key} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">
                <span className="mr-2 text-mut">{i + 1}.</span>
                {row.name}
                {row.superset_group != null && (
                  <span className="ml-2 rounded-md bg-warn/15 px-1.5 py-0.5 text-xs font-semibold text-warn">
                    суперсет {GROUP_LABELS[row.superset_group]}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button className="btn-ghost h-9 w-9 !p-0" onClick={() => move(i, -1)} aria-label="Выше">↑</button>
                <button className="btn-ghost h-9 w-9 !p-0" onClick={() => move(i, 1)} aria-label="Ниже">↓</button>
                <button className="btn-ghost h-9 w-9 !p-0 text-hot" onClick={() => remove(row.key)} aria-label="Убрать">✕</button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="label">Подходы</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={row.target_sets}
                  onChange={(e) => update(row.key, { target_sets: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Повторы</label>
                <input
                  className="input"
                  value={row.target_reps}
                  onChange={(e) => update(row.key, { target_reps: e.target.value })}
                  placeholder="8 / 6-8 / макс"
                />
              </div>
              <div>
                <label className="label">Отдых, сек</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={15}
                  value={row.rest_seconds}
                  onChange={(e) => update(row.key, { rest_seconds: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Суперсет</label>
                <select
                  className="input"
                  value={row.superset_group ?? ''}
                  onChange={(e) =>
                    update(row.key, { superset_group: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">—</option>
                  <option value="1">A</option>
                  <option value="2">B</option>
                  <option value="3">C</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <label className="label" htmlFor="picker">Добавить упражнение</label>
        <select
          id="picker"
          className="input"
          value={pickerValue}
          onChange={(e) => {
            setPickerValue(e.target.value);
            if (e.target.value) addExercise(Number(e.target.value));
          }}
        >
          <option value="">Выбрать из списка…</option>
          {catalog.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.muscle_group} — {ex.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-mut">
          Чтобы объединить упражнения в суперсет, поставь им одну букву (A, B или C) и держи их рядом по порядку.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-hot/40 bg-hot/10 px-3 py-2 text-sm text-hot">{error}</p>
      )}

      <button className="btn-primary w-full" onClick={save} disabled={pending}>
        {pending ? 'Сохраняю…' : 'Сохранить программу'}
      </button>
    </div>
  );
}
