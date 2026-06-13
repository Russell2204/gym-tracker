import { all, get } from './db';
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

export async function getExercises(userId: number): Promise<Exercise[]> {
  return all<Exercise>(
    `SELECT id, user_id, name, muscle_group FROM exercises
     WHERE user_id IS NULL OR user_id = ?
     ORDER BY muscle_group, name`,
    [userId]
  );
}

export async function getPrograms(userId: number): Promise<Program[]> {
  const [programs, items] = await Promise.all([
    all<{ id: number; name: string; description: string | null }>(
      'SELECT id, name, description FROM programs WHERE user_id = ? ORDER BY created_at',
      [userId]
    ),
    all<ProgramItem & { program_id: number }>(
      `SELECT pe.program_id, pe.id, pe.exercise_id, e.name AS exercise_name, pe.position,
              pe.superset_group, pe.target_sets, pe.target_reps, pe.rest_seconds
       FROM program_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.program_id IN (SELECT id FROM programs WHERE user_id = ?)
       ORDER BY pe.position`,
      [userId]
    )
  ]);

  return programs.map((p) => ({
    ...p,
    items: items.filter((it) => it.program_id === p.id).map(({ program_id, ...it }) => it)
  }));
}

export async function getProgram(id: number, userId: number): Promise<Program | null> {
  const p = await get<{ id: number; name: string; description: string | null }>(
    'SELECT id, name, description FROM programs WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!p) return null;
  const items = await all<ProgramItem>(
    `SELECT pe.id, pe.exercise_id, e.name AS exercise_name, pe.position,
            pe.superset_group, pe.target_sets, pe.target_reps, pe.rest_seconds
     FROM program_exercises pe
     JOIN exercises e ON e.id = pe.exercise_id
     WHERE pe.program_id = ?
     ORDER BY pe.position`,
    [id]
  );
  return { ...p, items };
}

/** Последняя завершённая тренировка пользователя с этим упражнением — для сравнения «с прошлым разом». */
async function previousResult(userId: number, exerciseId: number, excludeWorkoutId: number) {
  const prev = await get<{ workout_id: number; finished_at: string; we_id: number }>(
    `SELECT w.id AS workout_id, w.finished_at, we.id AS we_id
     FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id
     WHERE w.user_id = ? AND we.exercise_id = ? AND w.status = 'finished' AND w.id != ?
     ORDER BY w.finished_at DESC
     LIMIT 1`,
    [userId, exerciseId, excludeWorkoutId]
  );
  if (!prev) return null;
  const sets = await all<{ reps: number; weight: number }>(
    'SELECT reps, weight FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
    [prev.we_id]
  );
  if (sets.length === 0) return null;
  return { workout_date: prev.finished_at, sets };
}

export async function getWorkoutDetail(id: number, userId: number): Promise<WorkoutDetail | null> {
  const w = await get<{
    id: number;
    name: string;
    status: 'scheduled' | 'active' | 'finished';
    scheduled_for: string | null;
    started_at: string | null;
    finished_at: string | null;
  }>(
    `SELECT id, name, status, scheduled_for, started_at, finished_at
     FROM workouts WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  if (!w) return null;

  const rows = await all<Omit<WorkoutExerciseEntry, 'sets' | 'prev'>>(
    `SELECT we.id, we.exercise_id, e.name, e.muscle_group, we.position, we.superset_group,
            we.target_sets, we.target_reps, we.rest_seconds, we.finished_at
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.position`,
    [id]
  );

  // Все подходы тренировки одним запросом + сравнения «с прошлым разом» параллельно.
  const ref = w.finished_at ?? new Date().toISOString();
  const [allSets, prevs, prevW] = await Promise.all([
    all<{ id: number; workout_exercise_id: number; set_number: number; reps: number; weight: number }>(
      `SELECT id, workout_exercise_id, set_number, reps, weight
       FROM sets WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)
       ORDER BY set_number`,
      [id]
    ),
    Promise.all(rows.map((r) => previousResult(userId, r.exercise_id, id))),
    // Предыдущая завершённая тренировка целиком — для сравнения общего тоннажа.
    get<{ id: number; name: string; finished_at: string; volume: number }>(
      `SELECT w.id, w.name, w.finished_at,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished' AND w.id != ? AND w.finished_at < ?
       GROUP BY w.id
       ORDER BY w.finished_at DESC
       LIMIT 1`,
      [userId, id, ref]
    )
  ]);

  const exercises: WorkoutExerciseEntry[] = rows.map((r, i) => ({
    ...r,
    sets: allSets
      .filter((s) => s.workout_exercise_id === r.id)
      .map(({ workout_exercise_id, ...s }) => s),
    prev: prevs[i]
  }));

  return { ...w, exercises, prev_workout: prevW ?? null };
}

export async function getActiveWorkout(userId: number) {
  return get<{ id: number; name: string; started_at: string }>(
    "SELECT id, name, started_at FROM workouts WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    [userId]
  );
}

export async function getScheduledFor(userId: number, dateStr: string) {
  return all<{ id: number; name: string }>(
    "SELECT id, name FROM workouts WHERE user_id = ? AND status = 'scheduled' AND scheduled_for = ? ORDER BY id",
    [userId, dateStr]
  );
}

export async function getCalendarWorkouts(userId: number): Promise<CalendarWorkout[]> {
  return all<CalendarWorkout>(
    `SELECT id, name, status,
            COALESCE(scheduled_for, substr(started_at, 1, 10), substr(created_at, 1, 10)) AS date
     FROM workouts WHERE user_id = ?`,
    [userId]
  );
}

export async function listFinishedWorkouts(userId: number) {
  return all<{
    id: number;
    name: string;
    started_at: string | null;
    finished_at: string;
    sets_count: number;
    volume: number;
    exercises_count: number;
  }>(
    `SELECT w.id, w.name, w.started_at, w.finished_at,
            COUNT(s.id) AS sets_count,
            COALESCE(SUM(s.reps * s.weight), 0) AS volume,
            COUNT(DISTINCT we.id) AS exercises_count
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     WHERE w.user_id = ? AND w.status = 'finished'
     GROUP BY w.id
     ORDER BY w.finished_at DESC`,
    [userId]
  );
}

export async function getMeasurements(userId: number): Promise<Measurement[]> {
  return all<Measurement>(
    `SELECT id, date, weight, neck, shoulders, chest, waist, hips, biceps, forearm, thigh, calf, notes
     FROM measurements WHERE user_id = ? ORDER BY date DESC, id DESC`,
    [userId]
  );
}

export async function getStats(userId: number) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [totals, monthRow, weekRow, volumeByWorkout, raw, weightSeries] = await Promise.all([
    get<{ workouts: number; volume: number }>(
      `SELECT COUNT(DISTINCT w.id) AS workouts,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished'`,
      [userId]
    ),
    get<{ c: number }>(
      "SELECT COUNT(*) AS c FROM workouts WHERE user_id = ? AND status = 'finished' AND finished_at >= ?",
      [userId, monthStart.toISOString()]
    ),
    get<{ v: number }>(
      `SELECT COALESCE(SUM(s.reps * s.weight), 0) AS v
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished' AND w.finished_at >= ?`,
      [userId, weekAgo]
    ),
    all<{ id: number; name: string; date: string; volume: number }>(
      `SELECT w.id, w.name, w.finished_at AS date,
              COALESCE(SUM(s.reps * s.weight), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
       WHERE w.user_id = ? AND w.status = 'finished'
       GROUP BY w.id
       ORDER BY w.finished_at
       LIMIT 30`,
      [userId]
    ),
    // Прогресс по упражнениям: лучший вес и оценка 1ПМ на каждой тренировке.
    all<{ exercise_id: number; name: string; date: string; reps: number; weight: number }>(
      `SELECT we.exercise_id, e.name, w.finished_at AS date, s.reps, s.weight
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN exercises e ON e.id = we.exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ? AND w.status = 'finished' AND s.weight > 0
       ORDER BY w.finished_at`,
      [userId]
    ),
    all<{ date: string; weight: number }>(
      'SELECT date, weight FROM measurements WHERE user_id = ? AND weight IS NOT NULL ORDER BY date',
      [userId]
    )
  ]);

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

  return {
    totals: totals ?? { workouts: 0, volume: 0 },
    monthCount: monthRow?.c ?? 0,
    weekVolume: weekRow?.v ?? 0,
    volumeByWorkout,
    exerciseSeries,
    weightSeries
  };
}
