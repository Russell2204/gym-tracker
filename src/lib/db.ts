import { createClient, type Client, type InArgs } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL DEFAULT 'Другое',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS program_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL DEFAULT 0,
  superset_group INTEGER,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps TEXT NOT NULL DEFAULT '8',
  rest_seconds INTEGER NOT NULL DEFAULT 180
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_for TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL DEFAULT 0,
  superset_group INTEGER,
  target_sets INTEGER,
  target_reps TEXT,
  rest_seconds INTEGER NOT NULL DEFAULT 180,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight REAL, neck REAL, shoulders REAL, chest REAL, waist REAL,
  hips REAL, biceps REAL, forearm REAL, thigh REAL, calf REAL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_we ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id, status);
`;

export const BUILTIN_EXERCISES: Array<[string, string]> = [
  ['Приседания со штангой', 'Ноги'],
  ['Становая тяга', 'Спина'],
  ['Жим штанги лёжа', 'Грудь'],
  ['Подтягивания', 'Спина'],
  ['Тяга штанги в наклоне', 'Спина'],
  ['Жим гантелей сидя', 'Плечи'],
  ['Махи гантелей в стороны', 'Плечи'],
  ['Сгибания рук со штангой', 'Руки'],
  ['Французский жим лёжа', 'Руки'],
  ['Жим узким хватом', 'Руки'],
  ['Отжимания на брусьях', 'Грудь'],
  ['Жим ногами', 'Ноги'],
  ['Выпады с гантелями', 'Ноги'],
  ['Подъёмы на носки стоя', 'Ноги']
];

export { SCHEMA };

async function init(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || 'file:data/gym.db';
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL обязателен в продакшене: файловая SQLite на Vercel не сохраняет данные');
  }
  if (url.startsWith('file:')) {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN, intMode: 'number' });
  // Turso включает foreign keys на сервере; PRAGMA нужна локальному файловому клиенту.
  if (url.startsWith('file:')) await client.execute('PRAGMA foreign_keys = ON');
  await client.executeMultiple(SCHEMA);

  const count = Number(
    (await client.execute('SELECT COUNT(*) AS c FROM exercises WHERE user_id IS NULL')).rows[0].c
  );
  if (count === 0) {
    const now = new Date().toISOString();
    await client.batch(
      BUILTIN_EXERCISES.map(([name, group]) => ({
        sql: 'INSERT INTO exercises (user_id, name, muscle_group, created_at) VALUES (NULL, ?, ?, ?)',
        args: [name, group, now]
      })),
      'write'
    );
  }
  return client;
}

/**
 * Ленивый синглтон: промис кладётся в globalThis, чтобы пережить HMR
 * и разделить инициализацию между конкурентными запросами.
 * При ошибке init слот очищается — следующий запрос попробует снова.
 */
const g = globalThis as unknown as { __gymdb?: Promise<Client> };

export function getDb(): Promise<Client> {
  if (!g.__gymdb) {
    g.__gymdb = init().catch((e) => {
      g.__gymdb = undefined;
      throw e;
    });
  }
  return g.__gymdb;
}

/* Хелперы: единственное место, где живут Row-объекты и bigint из libsql.
   Ряды разворачиваются в плоские объекты (важно для сериализации в RSC-пропсы). */

export async function all<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const rs = await (await getDb()).execute({ sql, args });
  return rs.rows.map((r) => ({ ...r })) as T[];
}

export async function get<T>(sql: string, args: InArgs = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(
  sql: string,
  args: InArgs = []
): Promise<{ lastInsertRowid: number; changes: number }> {
  const rs = await (await getDb()).execute({ sql, args });
  return { lastInsertRowid: Number(rs.lastInsertRowid ?? 0), changes: rs.rowsAffected };
}

/** Стартовая программа для нового пользователя — фуллбади раз в неделю. */
export async function createDefaultProgram(userId: number) {
  const now = new Date().toISOString();
  const res = await run('INSERT INTO programs (user_id, name, description, created_at) VALUES (?, ?, ?, ?)', [
    userId,
    'Фуллбади · воскресенье',
    'Тяжёлая база раз в неделю: присед, жим, тяга + подсобка на спину, руки и плечи.',
    now
  ]);
  const programId = res.lastInsertRowid;

  const items: Array<[string, number, string, number, number | null]> = [
    ['Приседания со штангой', 4, '6', 240, null],
    ['Жим штанги лёжа', 4, '8', 180, null],
    ['Становая тяга', 2, '5', 240, null],
    ['Подтягивания', 3, 'макс', 120, null],
    ['Сгибания рук со штангой', 3, '10', 90, 1],
    ['Французский жим лёжа', 3, '10', 90, 1],
    ['Махи гантелей в стороны', 2, '15', 60, null]
  ];

  const builtins = await all<{ id: number; name: string }>(
    'SELECT id, name FROM exercises WHERE user_id IS NULL'
  );
  const idByName = new Map(builtins.map((e) => [e.name, e.id]));

  const stmts = items.flatMap(([name, sets, reps, rest, group], i) => {
    const exId = idByName.get(name);
    if (!exId) return [];
    return [
      {
        sql: `INSERT INTO program_exercises
              (program_id, exercise_id, position, superset_group, target_sets, target_reps, rest_seconds)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [programId, exId, i, group, sets, reps, rest]
      }
    ];
  });
  if (stmts.length > 0) await (await getDb()).batch(stmts, 'write');
}

/** Копирует упражнения программы в тренировку (снимок на момент создания). */
export async function snapshotProgramToWorkout(programId: number, workoutId: number) {
  const items = await all<{
    exercise_id: number;
    position: number;
    superset_group: number | null;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
  }>('SELECT * FROM program_exercises WHERE program_id = ? ORDER BY position', [programId]);
  if (items.length === 0) return;

  await (await getDb()).batch(
    items.map((it) => ({
      sql: `INSERT INTO workout_exercises
            (workout_id, exercise_id, position, superset_group, target_sets, target_reps, rest_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [workoutId, it.exercise_id, it.position, it.superset_group, it.target_sets, it.target_reps, it.rest_seconds]
    })),
    'write'
  );
}
