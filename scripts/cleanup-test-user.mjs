// Удаляет тестового пользователя из Turso (каскадом — его программы/тренировки).
// Встроенные упражнения (user_id IS NULL) не трогаются.
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number'
});

await client.execute('PRAGMA foreign_keys = ON');
const email = process.argv[2] || 'prodtest@ironlog.dev';
const res = await client.execute({ sql: 'DELETE FROM users WHERE email = ?', args: [email] });
console.log(`Удалено пользователей (${email}):`, res.rowsAffected);

const users = Number((await client.execute('SELECT COUNT(*) AS c FROM users')).rows[0].c);
const builtins = Number((await client.execute('SELECT COUNT(*) AS c FROM exercises WHERE user_id IS NULL')).rows[0].c);
console.log('Осталось пользователей:', users, '| встроенных упражнений:', builtins);
