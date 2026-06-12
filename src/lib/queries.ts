import { db } from './db';
import {
  Exercise,
  Program,
  ProgramItem,
  WorkoutDetail,
  WorkoutExerciseEntry,
  CalendarWorkout,
  Measurement,
  epley1RM
} from './types';

export function getExercises(userId: number): Exercise[] {
  return db
    .prepare(
      `SELECT id, user_id, name, muscle_group FROM exercises
       WHERE user_id IS NULL OR user_id = ?
       ORDER BY muscle_group, name`
    )
    .all(userId) as Exercise[];
}

export function getPrograms(userId: number): Program[] {
  const programs = db
    .prepare('SELECT id, name, description FROM programs WHERE user_id = ? ORDER BY created_at')
    .all(userId) as Array<{ id: number; name: string; description: string | null }>;

  const itemsStmt = db.prepare(
    `SELECT pe.id, pe.exercise_id, e.name AS exercise_name, pe.position,
            pe.superset_group, pe.target_sets, pe.target_reps, pe.rest_seconds
     FROM program_exercises pe
     JOIN exercises e ON e.id = pe.exercise_id
     WHERE pe.program_id = ?
     ORDER BY pe.position`
  );

  return programs.map((p) => ({ ...p, items: itemsStmt.all(p.id) as ProgramItem[] }));
}

export function getProgram(id: number, userId: number): Program | null {
  const p = db
    .prepare('SELECT id, name, description FROM programs WHERE id = ? AND user_id = ?')
    .get(id, userId) as { id: number; name: string; description: string | null } | undefined;
  if (!p) return null;
  const items = db
    .prepare(
      `SELECT pe.id, pe.exercise_id, e.name AS exercise_name, pe.position,
              pe.superset_group, pe.target_sets, pe.target_reps, pe.rest_seconds
       FROM program_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.program_id = ?
       ORDER BY pe.position`
    )
    .all(id) as ProgramItem[];
  return { ...p, items };
}

function setsOf(workoutExerciseId: number) {
  return db
    .prepare(
      'SELECT id, set_number, reps, weight FROM sets WHERE workout_exercise_id = ? ORDER BY set_number'
    )
    .all(workoutExerciseId) as Array<{ id: number; set_number: number; reps: number; weight: number }>;
}

/** Последняя завершённая тренировка пользователя с этим упражнением — для сравнения «с прошлым разом». */
function previousResult(userId: number, exerciseId: number, excludeWorkoutId: number) {
  const prev = db
    .prepare(
      `SELECT w.id AS workout_id, w.finished_at, we.id AS we_id
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       WHERE w.user_id = ? AND we.exercise_id = ? AND w.status = 'finished' AND w.id != ?
       ORDER BY w.finished_at DESC
       LIMIT 1`
    )
    .get(userId, exerciseId, excludeWorkoutId) as
    | { workout_id: number; finished_at: string; we_id: number }
    | undefined;
  if (!prev) return null;
  const sets = db
    .prepare('SELECT reps, weight FROM sets WHERE workout_exercise_id = ? ORDER BY set_number')
    .all(prev.we_id) as Array<{ reps: number; weight: number }>;
  if (sets.length === 0) return null;
  return { workout_date: prev.finished_at, sets };
}

export function getWorkoutDetail(id: number, userId: number): WorkoutDetail | null {
  const w = db
    .prepare(
      `SELECT id, name, status, scheduled_for, started_at, finished_at
       FROM workouts WHERE id = ? AND user_id = ?`
    )
    .get(id, userId) as
    | {
        id: number;
        name: string;
        status: 'scheduled' | 'active' | 'finished';
        scheduled_for: string | null;
        started_at: string | null;
        finished_at: string | null;
      }
    | undefined;
  if (!w) return null;

  const rows = db
    .prepare(
      `SELECT we.id, we.exercise_id, e.name, e.muscle_group, we.position, we.superset_group,
              we.target_sets, we.target_reps, we.rest_seconds, we.finished_at
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_id = ?
       ORDER BY we.position`
    )
    .all(id) as Array<Omit<WorkoutExerciseEntry, 'sets' | 'prev'>>;

  const exercises: WorkoutExerciseEntry[] = rows.map((r) => ({
    ...r,
    sets: setsOf(r.id),
    prev: previousResult(userId, r.exercise_id, id)
  }));

  // Предыдущая завершённая тренировка целиком — для сравнения общего тоннажа.
  const ref = w.finished_at ?? new Date().toISOString();
  const prevW = db
    .prepare(
      `SELECT w.id, w.name, w.finished_at,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished' AND w.id != ? AND w.finished_at < ?
       GROUP BY w.id
       ORDER BY w.finished_at DESC
       LIMIT 1`
    )
    .get(userId, id, ref) as { id: number; name: string; finished_at: string; volume: number } | undefined;

  return { ...w, exercises, prev_workout: prevW ?? null };
}

export function getActiveWorkout(userId: number) {
  return db
    .prepare("SELECT id, name, started_at FROM workouts WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1")
    .get(userId) as { id: number; name: string; started_at: string } | undefined;
}

export function getScheduledFor(userId: number, dateStr: string) {
  return db
    .prepare(
      "SELECT id, name FROM workouts WHERE user_id = ? AND status = 'scheduled' AND scheduled_for = ? ORDER BY id"
    )
    .all(userId, dateStr) as Array<{ id: number; name: string }>;
}

export function getCalendarWorkouts(userId: number): CalendarWorkout[] {
  return db
    .prepare(
      `SELECT id, name, status,
              COALESCE(scheduled_for, substr(started_at, 1, 10), substr(created_at, 1, 10)) AS date
       FROM workouts WHERE user_id = ?`
    )
    .all(userId) as CalendarWorkout[];
}

export function listFinishedWorkouts(userId: number) {
  return db
    .prepare(
      `SELECT w.id, w.name, w.started_at, w.finished_at,
              COUNT(s.id) AS sets_count,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume,
              COUNT(DISTINCT we.id) AS exercises_count
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished'
       GROUP BY w.id
       ORDER BY w.finished_at DESC`
    )
    .all(userId) as Array<{
    id: number;
    name: string;
    started_at: string | null;
    finished_at: string;
    sets_count: number;
    volume: number;
    exercises_count: number;
  }>;
}

export function getMeasurements(userId: number): Measurement[] {
  return db
    .prepare(
      `SELECT id, date, weight, neck, shoulders, chest, waist, hips, biceps, forearm, thigh, calf, notes
       FROM measurements WHERE user_id = ? ORDER BY date DESC, id DESC`
    )
    .all(userId) as Measurement[];
}

export function getStats(userId: number) {
  const totals = db
    .prepare(
      `SELECT COUNT(DISTINCT w.id) AS workouts,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished'`
    )
    .get(userId) as { workouts: number; volume: number };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM workouts WHERE user_id = ? AND status = 'finished' AND finished_at >= ?"
      )
      .get(userId, monthStart.toISOString()) as { c: number }
  ).c;

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const weekVolume = (
    db
      .prepare(
        `SELECT COALESCE(SUM(s.reps * s.weight), 0) AS v
         FROM workouts w
         JOIN workout_exercises we ON we.workout_id = w.id
         JOIN sets s ON s.workout_exercise_id = we.id
         WHERE w.user_id = ? AND w.status = 'finished' AND w.finished_at >= ?`
      )
      .get(userId, weekAgo) as { v: number }
  ).v;

  const volumeByWorkout = db
    .prepare(
      `SELECT w.id, w.name, w.finished_at AS date,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished'
       GROUP BY w.id
       ORDER BY w.finished_at
       LIMIT 30`
    )
    .all(userId) as Array<{ id: number; name: string; date: string; volume: number }>;

  // Прогресс по упражнениям: лучший вес и оценка 1ПМ на каждой тренировке.
  const raw = db
    .prepare(
      `SELECT we.exercise_id, e.name, w.finished_at AS date, s.reps, s.weight
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN exercises e ON e.id = we.exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ? AND w.status = 'finished' AND s.weight > 0
       ORDER BY w.finished_at`
    )
    .all(userId) as Array<{ exercise_id: number; name: string; date: string; reps: number; weight: number }>;

  const byExercise = new Map<
    number,
    { id: number; name: string; points: Map<string, { maxWeight: number; e1rm: number }> }
  >();
  for (const r of raw) {
    let ex = byExercise.get(r.exercise_id);
    if (!ex) {
      ex = { id: r.exercise_id, name: r.name, points: new Map() };
      byExercise.set(r.exercise_id, ex);
    }
    const key = r.date;
    const point = ex.points.get(key) ?? { maxWeight: 0, e1rm: 0 };
    point.maxWeight = Math.max(point.maxWeight, r.weight);
    point.e1rm = Math.max(point.e1rm, epley1RM(r.weight, r.reps));
    ex.points.set(key, point);
  }

  const exerciseSeries = Array.from(byExercise.values())
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      points: Array.from(ex.points.entries()).map(([date, p]) => ({ date, ...p }))
    }))
    .filter((ex) => ex.points.length >= 1)
    .sort((a, b) => b.points.length - a.points.length);

  const weightSeries = db
    .prepare('SELECT date, weight FROM measurements WHERE user_id = ? AND weight IS NOT NULL ORDER BY date')
    .all(userId) as Array<{ date: string; weight: number }>;

  return { totals, monthCount, weekVolume, volumeByWorkout, exerciseSeries, weightSeries };
}
