export type Exercise = {
  id: number;
  user_id: number | null;
  name: string;
  muscle_group: string;
};

export type ProgramItem = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  position: number;
  superset_group: number | null;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
};

export type Program = {
  id: number;
  name: string;
  description: string | null;
  items: ProgramItem[];
};

export type SetRow = { id: number; set_number: number; reps: number; weight: number };

export type PrevExercise = { workout_date: string; sets: Array<{ reps: number; weight: number }> } | null;

export type WorkoutExerciseEntry = {
  id: number;
  exercise_id: number;
  name: string;
  muscle_group: string;
  position: number;
  superset_group: number | null;
  target_sets: number | null;
  target_reps: string | null;
  rest_seconds: number;
  finished_at: string | null;
  sets: SetRow[];
  prev: PrevExercise;
};

export type WorkoutDetail = {
  id: number;
  name: string;
  status: 'scheduled' | 'active' | 'finished';
  scheduled_for: string | null;
  started_at: string | null;
  finished_at: string | null;
  exercises: WorkoutExerciseEntry[];
  prev_workout: { id: number; name: string; finished_at: string; volume: number } | null;
};

export type CalendarWorkout = { id: number; name: string; status: string; date: string };

export type Measurement = {
  id: number;
  date: string;
  weight: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  biceps: number | null;
  forearm: number | null;
  thigh: number | null;
  calf: number | null;
  notes: string | null;
};

export const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Пресс', 'Кардио', 'Другое'];

export function volumeOf(sets: Array<{ reps: number; weight: number }>): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
}

/** Оценка одноповторного максимума по Эпли. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function todayLocalISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fmtDate(isoOrDate: string, withYear = false): string {
  const d = isoOrDate.length === 10 ? new Date(isoOrDate + 'T12:00:00') : new Date(isoOrDate);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {})
  }).format(d);
}

export function fmtClock(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function fmtKg(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
