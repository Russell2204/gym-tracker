'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, createDefaultProgram, snapshotProgramToWorkout } from './db';
import { createSession, destroySession, requireUser } from './auth';

const now = () => new Date().toISOString();

function revalidateAll(workoutId?: number) {
  revalidatePath('/dashboard');
  revalidatePath('/workouts');
  revalidatePath('/calendar');
  revalidatePath('/stats');
  if (workoutId) revalidatePath(`/workouts/${workoutId}`);
}

/* ----------------------------- Auth ----------------------------- */

export async function registerAction(data: { name: string; email: string; password: string }) {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  if (!name || !email || !data.password) return { error: 'Заполни все поля' };
  if (data.password.length < 6) return { error: 'Пароль — минимум 6 символов' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Похоже, в email опечатка' };

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return { error: 'Аккаунт с таким email уже есть — попробуй войти' };

  const hash = bcrypt.hashSync(data.password, 10);
  const res = db
    .prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(email, name, hash, now());
  const userId = Number(res.lastInsertRowid);

  createDefaultProgram(userId);
  await createSession({ id: userId, name, email });
  redirect('/dashboard');
}

export async function loginAction(data: { email: string; password: string }) {
  const email = data.email.trim().toLowerCase();
  const user = db
    .prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
    .get(email) as { id: number; name: string; email: string; password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
    return { error: 'Неверный email или пароль' };
  }
  await createSession({ id: user.id, name: user.name, email: user.email });
  redirect('/dashboard');
}

export async function logoutAction() {
  destroySession();
  redirect('/login');
}

/* --------------------------- Exercises -------------------------- */

export async function createExerciseAction(data: { name: string; muscle_group: string }) {
  const user = await requireUser();
  const name = data.name.trim();
  if (!name) return { error: 'Введи название упражнения' };
  db.prepare('INSERT INTO exercises (user_id, name, muscle_group, created_at) VALUES (?, ?, ?, ?)').run(
    user.id,
    name,
    data.muscle_group || 'Другое',
    now()
  );
  revalidatePath('/exercises');
  return { ok: true };
}

export async function deleteExerciseAction(id: number) {
  const user = await requireUser();
  try {
    const res = db.prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?').run(id, user.id);
    if (res.changes === 0) return { error: 'Удалять можно только свои упражнения' };
  } catch {
    return { error: 'Упражнение используется в программах или тренировках — сначала убери его оттуда' };
  }
  revalidatePath('/exercises');
  return { ok: true };
}

/* ---------------------------- Programs --------------------------- */

type ProgramPayload = {
  id?: number;
  name: string;
  description: string;
  items: Array<{
    exercise_id: number;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    superset_group: number | null;
  }>;
};

export async function saveProgramAction(data: ProgramPayload) {
  const user = await requireUser();
  const name = data.name.trim();
  if (!name) return { error: 'Дай программе название' };
  if (data.items.length === 0) return { error: 'Добавь хотя бы одно упражнение' };

  const tx = db.transaction(() => {
    let programId = data.id ?? 0;
    if (data.id) {
      const owned = db.prepare('SELECT id FROM programs WHERE id = ? AND user_id = ?').get(data.id, user.id);
      if (!owned) throw new Error('not-found');
      db.prepare('UPDATE programs SET name = ?, description = ? WHERE id = ?').run(
        name,
        data.description.trim() || null,
        data.id
      );
      db.prepare('DELETE FROM program_exercises WHERE program_id = ?').run(data.id);
    } else {
      const res = db
        .prepare('INSERT INTO programs (user_id, name, description, created_at) VALUES (?, ?, ?, ?)')
        .run(user.id, name, data.description.trim() || null, now());
      programId = Number(res.lastInsertRowid);
    }
    const ins = db.prepare(
      `INSERT INTO program_exercises
       (program_id, exercise_id, position, superset_group, target_sets, target_reps, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    data.items.forEach((it, i) => {
      ins.run(
        programId,
        it.exercise_id,
        i,
        it.superset_group,
        Math.max(1, it.target_sets || 3),
        it.target_reps.trim() || '8',
        Math.max(0, it.rest_seconds || 180)
      );
    });
  });

  try {
    tx();
  } catch {
    return { error: 'Не получилось сохранить программу' };
  }
  revalidatePath('/programs');
  revalidatePath('/dashboard');
  redirect('/programs');
}

export async function deleteProgramAction(id: number) {
  const user = await requireUser();
  db.prepare('DELETE FROM programs WHERE id = ? AND user_id = ?').run(id, user.id);
  revalidatePath('/programs');
  revalidatePath('/dashboard');
  return { ok: true };
}

/* ---------------------------- Workouts --------------------------- */

export async function scheduleWorkoutAction(data: { date: string; programId: number | null }) {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return { error: 'Некорректная дата' };

  let name = 'Тренировка';
  if (data.programId) {
    const p = db
      .prepare('SELECT id, name FROM programs WHERE id = ? AND user_id = ?')
      .get(data.programId, user.id) as { id: number; name: string } | undefined;
    if (!p) return { error: 'Программа не найдена' };
    name = p.name;
  }
  const res = db
    .prepare(
      `INSERT INTO workouts (user_id, program_id, name, status, scheduled_for, created_at)
       VALUES (?, ?, ?, 'scheduled', ?, ?)`
    )
    .run(user.id, data.programId, name, data.date, now());
  if (data.programId) snapshotProgramToWorkout(data.programId, Number(res.lastInsertRowid));
  revalidateAll();
  return { ok: true };
}

async function createAndStart(userId: number, programId: number | null, name: string): Promise<number> {
  const res = db
    .prepare(
      `INSERT INTO workouts (user_id, program_id, name, status, started_at, created_at)
       VALUES (?, ?, ?, 'active', ?, ?)`
    )
    .run(userId, programId, name, now(), now());
  const id = Number(res.lastInsertRowid);
  if (programId) snapshotProgramToWorkout(programId, id);
  return id;
}

export async function startProgramNowAction(programId: number) {
  const user = await requireUser();
  const p = db
    .prepare('SELECT id, name FROM programs WHERE id = ? AND user_id = ?')
    .get(programId, user.id) as { id: number; name: string } | undefined;
  if (!p) return { error: 'Программа не найдена' };
  const id = await createAndStart(user.id, p.id, p.name);
  revalidateAll(id);
  redirect(`/workouts/${id}`);
}

export async function startEmptyWorkoutAction() {
  const user = await requireUser();
  const id = await createAndStart(user.id, null, 'Тренировка');
  revalidateAll(id);
  redirect(`/workouts/${id}`);
}

export async function startWorkoutAction(workoutId: number) {
  const user = await requireUser();
  db.prepare(
    "UPDATE workouts SET status = 'active', started_at = ? WHERE id = ? AND user_id = ? AND status = 'scheduled'"
  ).run(now(), workoutId, user.id);
  revalidateAll(workoutId);
  return { ok: true };
}

export async function finishWorkoutAction(workoutId: number) {
  const user = await requireUser();
  db.prepare(
    "UPDATE workouts SET status = 'finished', finished_at = ? WHERE id = ? AND user_id = ? AND status = 'active'"
  ).run(now(), workoutId, user.id);
  revalidateAll(workoutId);
  return { ok: true };
}

export async function deleteWorkoutAction(workoutId: number) {
  const user = await requireUser();
  db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(workoutId, user.id);
  revalidateAll();
  redirect('/workouts');
}

export async function cancelScheduledAction(workoutId: number) {
  const user = await requireUser();
  db.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ? AND status = 'scheduled'").run(
    workoutId,
    user.id
  );
  revalidateAll();
  redirect('/calendar');
}

/* ----------------------- Workout exercises ----------------------- */

function ownedWorkoutExercise(weId: number, userId: number) {
  return db
    .prepare(
      `SELECT we.id, we.workout_id, we.position, we.superset_group
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE we.id = ? AND w.user_id = ?`
    )
    .get(weId, userId) as
    | { id: number; workout_id: number; position: number; superset_group: number | null }
    | undefined;
}

export async function addExerciseToWorkoutAction(data: {
  workoutId: number;
  exerciseId: number;
  supersetWithPrev: boolean;
}) {
  const user = await requireUser();
  const w = db
    .prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?')
    .get(data.workoutId, user.id);
  if (!w) return { error: 'Тренировка не найдена' };

  const last = db
    .prepare(
      'SELECT id, position, superset_group FROM workout_exercises WHERE workout_id = ? ORDER BY position DESC LIMIT 1'
    )
    .get(data.workoutId) as { id: number; position: number; superset_group: number | null } | undefined;

  let group: number | null = null;
  if (data.supersetWithPrev && last) {
    if (last.superset_group != null) {
      group = last.superset_group;
    } else {
      const maxGroup = (
        db
          .prepare(
            'SELECT COALESCE(MAX(superset_group), 0) AS m FROM workout_exercises WHERE workout_id = ?'
          )
          .get(data.workoutId) as { m: number }
      ).m;
      group = maxGroup + 1;
      db.prepare('UPDATE workout_exercises SET superset_group = ? WHERE id = ?').run(group, last.id);
    }
  }

  db.prepare(
    `INSERT INTO workout_exercises (workout_id, exercise_id, position, superset_group, target_sets, target_reps, rest_seconds)
     VALUES (?, ?, ?, ?, NULL, NULL, 180)`
  ).run(data.workoutId, data.exerciseId, (last?.position ?? -1) + 1, group);

  revalidatePath(`/workouts/${data.workoutId}`);
  return { ok: true };
}

export async function setExerciseFinishedAction(weId: number, finished: boolean) {
  const user = await requireUser();
  const we = ownedWorkoutExercise(weId, user.id);
  if (!we) return { error: 'Не найдено' };
  db.prepare('UPDATE workout_exercises SET finished_at = ? WHERE id = ?').run(
    finished ? now() : null,
    weId
  );
  revalidatePath(`/workouts/${we.workout_id}`);
  return { ok: true };
}

export async function removeWorkoutExerciseAction(weId: number) {
  const user = await requireUser();
  const we = ownedWorkoutExercise(weId, user.id);
  if (!we) return { error: 'Не найдено' };
  db.prepare('DELETE FROM workout_exercises WHERE id = ?').run(weId);
  revalidatePath(`/workouts/${we.workout_id}`);
  return { ok: true };
}

/* ------------------------------ Sets ----------------------------- */

export async function addSetAction(data: { weId: number; reps: number; weight: number }) {
  const user = await requireUser();
  const we = ownedWorkoutExercise(data.weId, user.id);
  if (!we) return { error: 'Не найдено' };
  if (!Number.isFinite(data.reps) || data.reps <= 0) return { error: 'Укажи количество повторов' };
  const weight = Number.isFinite(data.weight) && data.weight >= 0 ? data.weight : 0;

  const next =
    ((
      db
        .prepare('SELECT COALESCE(MAX(set_number), 0) AS m FROM sets WHERE workout_exercise_id = ?')
        .get(data.weId) as { m: number }
    ).m ?? 0) + 1;

  db.prepare(
    'INSERT INTO sets (workout_exercise_id, set_number, reps, weight, completed_at) VALUES (?, ?, ?, ?, ?)'
  ).run(data.weId, next, Math.round(data.reps), weight, now());

  revalidatePath(`/workouts/${we.workout_id}`);
  return { ok: true };
}

export async function deleteSetAction(setId: number) {
  const user = await requireUser();
  const row = db
    .prepare(
      `SELECT s.id, s.workout_exercise_id, we.workout_id
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE s.id = ? AND w.user_id = ?`
    )
    .get(setId, user.id) as { id: number; workout_exercise_id: number; workout_id: number } | undefined;
  if (!row) return { error: 'Не найдено' };

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sets WHERE id = ?').run(setId);
    const rest = db
      .prepare('SELECT id FROM sets WHERE workout_exercise_id = ? ORDER BY set_number')
      .all(row.workout_exercise_id) as Array<{ id: number }>;
    rest.forEach((s, i) =>
      db.prepare('UPDATE sets SET set_number = ? WHERE id = ?').run(i + 1, s.id)
    );
  });
  tx();

  revalidatePath(`/workouts/${row.workout_id}`);
  return { ok: true };
}

/* -------------------------- Measurements ------------------------- */

export async function addMeasurementAction(data: {
  date: string;
  values: Partial<Record<'weight' | 'neck' | 'shoulders' | 'chest' | 'waist' | 'hips' | 'biceps' | 'forearm' | 'thigh' | 'calf', number | null>>;
  notes: string;
}) {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return { error: 'Некорректная дата' };
  const v = data.values;
  const hasAny = Object.values(v).some((x) => x != null);
  if (!hasAny) return { error: 'Заполни хотя бы одно поле' };

  db.prepare(
    `INSERT INTO measurements (user_id, date, weight, neck, shoulders, chest, waist, hips, biceps, forearm, thigh, calf, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    data.date,
    v.weight ?? null,
    v.neck ?? null,
    v.shoulders ?? null,
    v.chest ?? null,
    v.waist ?? null,
    v.hips ?? null,
    v.biceps ?? null,
    v.forearm ?? null,
    v.thigh ?? null,
    v.calf ?? null,
    data.notes.trim() || null,
    now()
  );
  revalidatePath('/measurements');
  revalidatePath('/stats');
  return { ok: true };
}

export async function deleteMeasurementAction(id: number) {
  const user = await requireUser();
  db.prepare('DELETE FROM measurements WHERE id = ? AND user_id = ?').run(id, user.id);
  revalidatePath('/measurements');
  revalidatePath('/stats');
  return { ok: true };
}
