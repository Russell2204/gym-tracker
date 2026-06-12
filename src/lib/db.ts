import type Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadDriver = () => require('better-sqlite3') as typeof import('better-sqlite3');

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

const BUILTIN_EXERCISES: Array<[string, string]> = [
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

function init(): Database.Database {
  const BetterSqlite3 = loadDriver();
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  const db = new BetterSqlite3(path.join(dir, 'gym.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const count = (db.prepare('SELECT COUNT(*) AS c FROM exercises WHERE user_id IS NULL').get() as { c: number }).c;
  if (count === 0) {
    const ins = db.prepare(
      "INSERT INTO exercises (user_id, name, muscle_group, created_at) VALUES (NULL, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      for (const [name, group] of BUILTIN_EXERCISES) ins.run(name, group, now);
    });
    tx();
  }
  return db;
}

const g = globalThis as unknown as { __gymdb?: Database.Database };

function getDb(): Database.Database {
  if (!g.__gymdb) g.__gymdb = init();
  return g.__gymdb;
}

/**
 * Ленивый синглтон: нативный модуль грузится при первом обращении,
 * а не при импорте файла — так `next build` не требует собранных биндингов.
 */
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  }
});

function exerciseIdByName(name: string): number | null {
  const row = db.prepare('SELECT id FROM exercises WHERE user_id IS NULL AND name = ?').get(name) as
    | { id: number }
    | undefined;
  return row?.id ?? null;
}

/** Стартовая программа для нового пользователя — фуллбади раз в неделю. */
export function createDefaultProgram(userId: number) {
  const now = new Date().toISOString();
  const res = db
    .prepare('INSERT INTO programs (user_id, name, description, created_at) VALUES (?, ?, ?, ?)')
    .run(
      userId,
      'Фуллбади · воскресенье',
      'Тяжёлая база раз в неделю: присед, жим, тяга + подсобка на спину, руки и плечи.',
      now
    );
  const programId = Number(res.lastInsertRowid);

  const items: Array<[string, number, string, number, number | null]> = [
    ['Приседания со штангой', 4, '6', 240, null],
    ['Жим штанги лёжа', 4, '8', 180, null],
    ['Становая тяга', 2, '5', 240, null],
    ['Подтягивания', 3, 'макс', 120, null],
    ['Сгибания рук со штангой', 3, '10', 90, 1],
    ['Французский жим лёжа', 3, '10', 90, 1],
    ['Махи гантелей в стороны', 2, '15', 60, null]
  ];

  const ins = db.prepare(
    `INSERT INTO program_exercises
     (program_id, exercise_id, position, superset_group, target_sets, target_reps, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach(([name, sets, reps, rest, group], i) => {
    const exId = exerciseIdByName(name);
    if (exId) ins.run(programId, exId, i, group, sets, reps, rest);
  });
}

/** Копирует упражнения программы в тренировку (снимок на момент создания). */
export function snapshotProgramToWorkout(programId: number, workoutId: number) {
  const items = db
    .prepare('SELECT * FROM program_exercises WHERE program_id = ? ORDER BY position')
    .all(programId) as Array<{
    exercise_id: number;
    position: number;
    superset_group: number | null;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
  }>;
  const ins = db.prepare(
    `INSERT INTO workout_exercises
     (workout_id, exercise_id, position, superset_group, target_sets, target_reps, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    for (const it of items)
      ins.run(workoutId, it.exercise_id, it.position, it.superset_group, it.target_sets, it.target_reps, it.rest_seconds);
  });
  tx();
}
