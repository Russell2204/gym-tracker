// Разовая инициализация продакшен-БД (Turso): создаёт схему и сидит встроенные упражнения.
// Запуск: node scripts/init-db.mjs   (читает TURSO_* и из .env.local)
// Ленивый init в src/lib/db.ts делает то же при первом обращении — это страховка от гонки на холодном старте.
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Простой парсер .env.local, чтобы не тянуть зависимости.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error('Нет TURSO_DATABASE_URL');
  process.exit(1);
}

// Схема — зеркало src/lib/db.ts (источник истины в рантайме там же).
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

const BUILTIN_EXERCISES = [
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

const client = createClient({ url, authToken, intMode: 'number' });

console.log('→ Проверка соединения…');
console.log('  SELECT 1 =', (await client.execute('SELECT 1 AS x')).rows[0].x);

console.log('→ Применяю схему…');
await client.executeMultiple(SCHEMA);

const count = Number((await client.execute("SELECT COUNT(*) AS c FROM exercises WHERE user_id IS NULL")).rows[0].c);
if (count === 0) {
  console.log('→ Сидлю встроенные упражнения…');
  const now = new Date().toISOString();
  await client.batch(
    BUILTIN_EXERCISES.map(([name, group]) => ({
      sql: 'INSERT INTO exercises (user_id, name, muscle_group, created_at) VALUES (NULL, ?, ?, ?)',
      args: [name, group, now]
    })),
    'write'
  );
} else {
  console.log(`→ Встроенные упражнения уже есть (${count}), пропускаю сид.`);
}

const tables = (await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).rows.map((r) => r.name);
const exCount = Number((await client.execute("SELECT COUNT(*) AS c FROM exercises WHERE user_id IS NULL")).rows[0].c);
console.log('✓ Таблицы:', tables.join(', '));
console.log('✓ Встроенных упражнений:', exCount);
console.log('Готово.');
