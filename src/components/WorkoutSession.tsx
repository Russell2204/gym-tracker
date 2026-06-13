'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, CheckCheck, Timer, SkipForward, Search, Undo2 } from 'lucide-react';
import {
  addSetAction,
  deleteSetAction,
  setExerciseFinishedAction,
  removeWorkoutExerciseAction,
  addExerciseToWorkoutAction,
  finishWorkoutAction
} from '@/lib/actions';
import { WorkoutDetail, WorkoutExerciseEntry, fmtDate, fmtDuration, fmtKg } from '@/lib/types';

type CatalogItem = { id: number; name: string; muscle_group: string };
type Group = { group: number | null; items: WorkoutExerciseEntry[] };

const GROUP_LABELS: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C' };

function groupExercises(list: WorkoutExerciseEntry[]): Group[] {
  const out: Group[] = [];
  for (const e of list) {
    const last = out[out.length - 1];
    if (e.superset_group != null && last && last.group === e.superset_group) {
      last.items.push(e);
    } else {
      out.push({ group: e.superset_group, items: [e] });
    }
  }
  return out;
}

function numStr(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export default function WorkoutSession({
  workout,
  catalog
}: {
  workout: WorkoutDetail;
  catalog: CatalogItem[];
}) {
  const router = useRouter();
  const groups = useMemo(() => groupExercises(workout.exercises), [workout.exercises]);

  /* ------------------------- elapsed time ------------------------- */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsedSec = workout.started_at ? (now - new Date(workout.started_at).getTime()) / 1000 : 0;

  /* -------------------------- rest timer -------------------------- */
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const beepedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  function ensureAudio() {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    }
    audioRef.current?.resume().catch(() => {});
  }

  function beep() {
    const ctx = audioRef.current;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [0, 0.35, 0.7].forEach((dt, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = i === 2 ? 1318 : 880;
      const t = t0 + dt;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  const restLeft = rest ? Math.ceil((rest.endsAt - now) / 1000) : null;

  useEffect(() => {
    if (rest == null || restLeft == null) return;
    if (restLeft <= 0 && !beepedRef.current) {
      beepedRef.current = true;
      beep();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([200, 120, 200, 120, 400]);
      }
    }
    if (restLeft <= -4) {
      setRest(null);
      beepedRef.current = false;
    }
    // тикаем чаще, пока идёт отсчёт
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, [rest, restLeft]);

  function startRest(seconds: number) {
    beepedRef.current = false;
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
  }

  /* ----------------------- set input state ------------------------ */
  function prefillFor(e: WorkoutExerciseEntry): { reps: string; weight: string } {
    const last = e.sets[e.sets.length - 1];
    if (last) return { reps: String(last.reps), weight: numStr(last.weight) };
    const prev = e.prev?.sets[0];
    if (prev) return { reps: String(prev.reps), weight: numStr(prev.weight) };
    return { reps: '', weight: '' };
  }

  const [inputs, setInputs] = useState<Record<number, { reps: string; weight: string }>>(() => {
    const init: Record<number, { reps: string; weight: string }> = {};
    for (const e of workout.exercises) init[e.id] = prefillFor(e);
    return init;
  });
  const setLensRef = useRef<Record<number, number>>({});

  useEffect(() => {
    setInputs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const e of workout.exercises) {
        const len = e.sets.length;
        if (setLensRef.current[e.id] !== len) {
          setLensRef.current[e.id] = len;
          next[e.id] = prefillFor(e);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.exercises]);

  const [pendingId, setPendingId] = useState<number | null>(null);
  const [invalid, setInvalid] = useState<Record<number, boolean>>({});

  function isLastInGroup(e: WorkoutExerciseEntry): boolean {
    if (e.superset_group == null) return true;
    const g = groups.find((gr) => gr.group === e.superset_group && gr.items.some((i) => i.id === e.id));
    if (!g) return true;
    return g.items[g.items.length - 1].id === e.id;
  }

  async function addSet(e: WorkoutExerciseEntry) {
    ensureAudio();
    const val = inputs[e.id] ?? { reps: '', weight: '' };
    const reps = parseInt(val.reps, 10);
    const weight = parseFloat((val.weight || '0').replace(',', '.'));
    if (!Number.isFinite(reps) || reps <= 0) {
      setInvalid((m) => ({ ...m, [e.id]: true }));
      return;
    }
    setInvalid((m) => ({ ...m, [e.id]: false }));
    setPendingId(e.id);
    const res = await addSetAction({ weId: e.id, reps, weight: Number.isFinite(weight) ? weight : 0 });
    setPendingId(null);
    if (res?.error) {
      alert(res.error);
      return;
    }
    router.refresh();
    if (isLastInGroup(e)) startRest(e.rest_seconds || 180);
  }

  async function removeSet(setId: number) {
    await deleteSetAction(setId);
    router.refresh();
  }

  async function toggleFinished(e: WorkoutExerciseEntry, finished: boolean) {
    await setExerciseFinishedAction(e.id, finished);
    router.refresh();
  }

  async function removeExercise(e: WorkoutExerciseEntry) {
    if (!confirm(`Убрать «${e.name}» из тренировки?`)) return;
    await removeWorkoutExerciseAction(e.id);
    router.refresh();
  }

  /* ----------------------- add exercise modal --------------------- */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [supersetWithPrev, setSupersetWithPrev] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) => c.name.toLowerCase().includes(q));
  }, [catalog, search]);

  async function pickExercise(exerciseId: number) {
    const res = await addExerciseToWorkoutAction({
      workoutId: workout.id,
      exerciseId,
      supersetWithPrev: supersetWithPrev && workout.exercises.length > 0
    });
    if (res?.error) alert(res.error);
    setPickerOpen(false);
    setSearch('');
    setSupersetWithPrev(false);
    router.refresh();
  }

  /* -------------------------- finish all -------------------------- */
  const [finishing, setFinishing] = useState(false);

  async function finishWorkout() {
    const loggedSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
    const msg =
      loggedSets === 0
        ? 'Подходов не записано. Всё равно завершить тренировку?'
        : 'Завершить тренировку?';
    if (!confirm(msg)) return;
    setFinishing(true);
    await finishWorkoutAction(workout.id);
    router.refresh();
  }

  const totalVolume = workout.exercises.reduce(
    (s, e) => s + e.sets.reduce((x, set) => x + set.reps * set.weight, 0),
    0
  );

  /* ----------------------------- render --------------------------- */
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-acc">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
          </span>
          Тренировка идёт
        </div>
        <h1 className="mt-1 text-xl font-semibold">{workout.name}</h1>
        <p className="mt-1 text-sm text-mut">
          Тоннаж: <span className="num font-semibold text-ink">{fmtKg(totalVolume)} кг</span>
        </p>
      </div>

      {groups.map((g, gi) => (
        <div
          key={gi}
          className={g.group != null ? 'card border-warn/40 p-2' : ''}
        >
          {g.group != null && (
            <div className="px-2 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-warn">
              Суперсет {GROUP_LABELS[g.group] ?? g.group} — без отдыха между движениями
            </div>
          )}
          <div className={g.group != null ? 'space-y-2' : ''}>
            {g.items.map((e) => (
              <ExerciseCard
                key={e.id}
                entry={e}
                inSuperset={g.group != null}
                input={inputs[e.id] ?? { reps: '', weight: '' }}
                invalid={!!invalid[e.id]}
                pending={pendingId === e.id}
                onInput={(patch) =>
                  setInputs((m) => ({ ...m, [e.id]: { ...(m[e.id] ?? { reps: '', weight: '' }), ...patch } }))
                }
                onAddSet={() => addSet(e)}
                onRemoveSet={removeSet}
                onToggleFinished={(f) => toggleFinished(e, f)}
                onRemove={() => removeExercise(e)}
              />
            ))}
          </div>
        </div>
      ))}

      <button className="btn-ghost w-full" onClick={() => setPickerOpen(true)}>
        <Plus size={16} />
        Упражнение
      </button>

      <button className="btn-ok w-full" onClick={finishWorkout} disabled={finishing}>
        <CheckCheck size={17} />
        {finishing ? 'Завершаю…' : 'Завершить тренировку'}
      </button>

      {/* нижняя панель: таймер отдыха или общее время */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {rest && restLeft != null ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={'text-[11px] font-semibold uppercase tracking-wide ' + (restLeft <= 0 ? 'text-ok' : restLeft <= 10 ? 'text-warn' : 'text-acc')}>
                    {restLeft <= 0 ? 'Пора! Следующий подход' : 'Отдых'}
                  </div>
                  <div className={'num text-3xl font-bold leading-tight ' + (restLeft <= 0 ? 'text-ok' : restLeft <= 10 ? 'text-warn' : '')}>
                    {fmtDuration(Math.max(0, restLeft))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost !px-3"
                    onClick={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt + 30_000, total: r.total + 30 } : r))}
                  >
                    <Timer size={15} />
                    +30 c
                  </button>
                  <button
                    className="btn-ghost !px-3"
                    onClick={() => {
                      setRest(null);
                      beepedRef.current = false;
                    }}
                  >
                    <SkipForward size={15} />
                    Пропустить
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={'h-full transition-[width] duration-300 ' + (restLeft <= 0 ? 'bg-ok' : restLeft <= 10 ? 'bg-warn' : 'bg-acc')}
                  style={{ width: `${Math.max(0, Math.min(100, ((restLeft ?? 0) / (rest.total || 1)) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-mut">Время тренировки</div>
                <div className="num text-3xl font-bold leading-tight">{fmtDuration(elapsedSec)}</div>
              </div>
              <button className="btn-ok" onClick={finishWorkout} disabled={finishing}>
                Завершить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* модалка выбора упражнения */}
      <AnimatePresence>
      {pickerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setPickerOpen(false)}
        >
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.21, 0.65, 0.36, 1] }}
            className="card flex max-h-[80dvh] w-full max-w-sm flex-col p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">Добавить упражнение</h2>
            <div className="relative mt-3">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
              <input
                className="input !pl-9"
                placeholder="Поиск…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {workout.exercises.length > 0 && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={supersetWithPrev}
                  onChange={(e) => setSupersetWithPrev(e.target.checked)}
                  className="h-4 w-4 accent-[#f2c84b]"
                />
                Суперсет с предыдущим упражнением
              </label>
            )}
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-acc"
                  onClick={() => pickExercise(c.id)}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-mut">{c.muscle_group}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-1 py-3 text-sm text-mut">Ничего не нашлось — добавь своё на вкладке «Упражнения».</p>
              )}
            </div>
            <button className="mt-3 text-center text-sm text-mut hover:text-ink" onClick={() => setPickerOpen(false)}>
              Закрыть
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------- exercise card -------------------------- */

function ExerciseCard({
  entry,
  inSuperset,
  input,
  invalid,
  pending,
  onInput,
  onAddSet,
  onRemoveSet,
  onToggleFinished,
  onRemove
}: {
  entry: WorkoutExerciseEntry;
  inSuperset: boolean;
  input: { reps: string; weight: string };
  invalid: boolean;
  pending: boolean;
  onInput: (patch: Partial<{ reps: string; weight: string }>) => void;
  onAddSet: () => void;
  onRemoveSet: (id: number) => void;
  onToggleFinished: (finished: boolean) => void;
  onRemove: () => void;
}) {
  const done = entry.finished_at != null;
  const doneSets = entry.sets.length;

  if (done) {
    return (
      <div className={'card p-4 opacity-70 ' + (inSuperset ? '!border-line/60' : '')}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium">
              <Check size={16} className="shrink-0 text-ok" />
              <span className="truncate">{entry.name}</span>
            </div>
            <div className="mt-1 text-sm text-mut">
              {entry.sets.length > 0
                ? entry.sets.map((s) => `${numStr(s.weight)}×${s.reps}`).join(' · ')
                : 'Без подходов'}
            </div>
          </div>
          <button className="flex shrink-0 items-center gap-1 text-sm text-mut hover:text-ink" onClick={() => onToggleFinished(false)}>
            <Undo2 size={14} />
            Вернуть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={'card p-4 ' + (inSuperset ? '!border-line/60' : '')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{entry.name}</div>
          <div className="mt-0.5 text-xs text-mut">
            {entry.target_sets != null && entry.target_reps && (
              <>Цель: {entry.target_sets}×{entry.target_reps} · </>
            )}
            отдых {fmtDuration(entry.rest_seconds || 180)}
          </div>
        </div>
        <button
          className="shrink-0 text-mut transition-colors hover:text-hot"
          onClick={onRemove}
          aria-label={`Убрать ${entry.name}`}
        >
          <X size={17} />
        </button>
      </div>

      {entry.prev && (
        <div className="mt-2 rounded-lg bg-bg px-2.5 py-1.5 text-xs text-mut">
          Прошлый раз ({fmtDate(entry.prev.workout_date)}):{' '}
          <span className="num">
            {entry.prev.sets.map((s) => `${numStr(s.weight)}×${s.reps}`).join(' · ')}
          </span>
        </div>
      )}

      {entry.sets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <AnimatePresence initial={false}>
          {entry.sets.map((s) => (
            <motion.span
              key={s.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              className="num inline-flex items-center gap-1.5 rounded-lg border border-acc/30 bg-acc/5 px-2 py-1 text-sm"
            >
              <span className="text-mut">{s.set_number}.</span> {numStr(s.weight)}×{s.reps}
              <button
                className="text-mut transition-colors hover:text-hot"
                onClick={() => onRemoveSet(s.id)}
                aria-label="Удалить подход"
              >
                <X size={13} />
              </button>
            </motion.span>
          ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="label">Вес, кг</label>
          <input
            className="input num"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={input.weight}
            onChange={(e) => onInput({ weight: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className="label">Повторы</label>
          <input
            className={'input num ' + (invalid ? '!border-hot' : '')}
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            value={input.reps}
            onChange={(e) => onInput({ reps: e.target.value })}
          />
        </div>
        <button className="btn-primary shrink-0" onClick={onAddSet} disabled={pending}>
          <Plus size={15} />
          {pending ? '…' : `Подход${doneSets > 0 ? ' ' + (doneSets + 1) : ''}`}
        </button>
      </div>

      <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-ok/40 py-2 text-sm font-medium text-ok transition-colors hover:bg-ok/10" onClick={() => onToggleFinished(true)}>
        <Check size={15} />
        Завершить упражнение
      </button>
    </div>
  );
}
