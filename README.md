# IronLog — дневник тренировок

Next.js 14 + libSQL (Turso) + Tailwind. Лендинг с 3D на Three.js, регистрация, программы, суперсеты, таймеры отдыха, сравнение с прошлой тренировкой, замеры, статистика, календарь. Весь интерфейс на русском.

## Запуск (локально)

```bash
npm install
npm run dev
```

Открой http://localhost:3000. Без переменных окружения приложение использует локальный файл `data/gym.db` (создаётся автоматически). При регистрации заводится стартовая программа «Фуллбади · воскресенье».

## Переменные окружения

Скопируй `.env.example` → `.env.local` и заполни:

- `JWT_SECRET` — длинная случайная строка для подписи сессий (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- `TURSO_DATABASE_URL` — `libsql://...` из дашборда Turso. **Нужно только в проде.** Локально без неё используется `file:data/gym.db`.
- `TURSO_AUTH_TOKEN` — read-write токен Turso.

## Деплой (Vercel + Turso)

1. **Turso**: создай БД на https://turso.tech, скопируй URL и токен.
2. **Инициализация схемы** (разово): задай `TURSO_*` в `.env.local` и запусти
   ```bash
   node scripts/init-db.mjs
   ```
   Создаёт таблицы и сидит встроенные упражнения. (Рантайм-инициализация в `src/lib/db.ts` делает то же при первом обращении — это страховка.)
3. **Vercel**: импортируй репозиторий на https://vercel.com/new, добавь три переменные окружения (`JWT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) в Production, задеплой. Регион функций задан в `vercel.json` (`hnd1`, Токио) — держи его рядом с регионом Turso для низкой задержки.

> На Vercel файловая SQLite не сохраняет данные между запросами, поэтому в проде обязателен Turso. Если `TURSO_DATABASE_URL` не задан на Vercel, приложение намеренно падает с понятной ошибкой, чтобы не уйти молча в эфемерный файл.

## Как устроено

- **Сессии** — JWT в httpOnly-куке, проверка в middleware (jose).
- **Данные** — `@libsql/client` (async). Чтения в `src/lib/queries.ts`, мутации — server actions в `src/lib/actions.ts`. API-роутов нет.
- **Лендинг** — `/` публичный; залогиненного редиректит на `/dashboard`. 3D-штанга грузится отдельным чанком (`dynamic`, `ssr:false`), с CSS-фолбэком при `prefers-reduced-motion`.
- **Таймер отдыха** — стартует после подхода (в суперсете — после последнего движения связки), тройной сигнал через Web Audio + вибрация.
- **Суперсеты** — общая буква A/B/C у соседних упражнений или галочка «суперсет с предыдущим».

## Структура

```
src/lib              — db (libsql), auth, queries, server actions, типы
src/app              — страницы App Router (лендинг + (app) под авторизацией)
src/components        — клиентские компоненты приложения
src/components/landing — секции лендинга (включая Three.js)
scripts              — init-db / cleanup утилиты для Turso
```
```bash
npm run build   # продакшен-сборка
npm start       # запуск собранного (нужны env)
npx tsc --noEmit # проверка типов (тестов нет)
```
