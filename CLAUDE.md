# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IronLog — a gym workout tracker (Next.js 14 App Router + better-sqlite3 + Tailwind). **All user-facing text is in Russian** — keep new UI strings, error messages, and seed data in Russian.

## Commands

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm start       # serve production build (requires .env with JWT_SECRET, see .env.example)
```

There is no lint script and no test suite. Type-check with `npx tsc --noEmit`.

The SQLite database lives at `data/gym.db`, created automatically on first DB access. To reset all data: stop the server and delete that file.

## Architecture

**No API routes.** All mutations are server actions in `src/lib/actions.ts`; all reads are synchronous query functions in `src/lib/queries.ts`. The standard page pattern: an async server component in `src/app/(app)/...` calls `requireUser()`, fetches via queries, and passes plain props to a `'use client'` component in `src/components/`, which invokes server actions directly. Actions return `{ error: string }` or `{ ok: true }` (or `redirect()`), and call `revalidatePath` themselves.

**Auth:** JWT (jose, HS256) in the `gt_session` httpOnly cookie, signed with `JWT_SECRET` (falls back to a dev secret). `src/middleware.ts` redirects unauthenticated requests to `/login`; `requireUser()` in `src/lib/auth.ts` is the per-page/per-action guard. Every query and mutation must scope by `user_id` — ownership checks are done in SQL (`WHERE ... AND user_id = ?`), not after the fact.

**Database (`src/lib/db.ts`):** better-sqlite3 (synchronous — no `await` on DB calls) exposed as a lazy singleton behind a Proxy so the native module loads on first use, not at import time (this lets `next build` succeed without built bindings; the package is also in `serverComponentsExternalPackages` in next.config.mjs). The full schema is one `CREATE TABLE IF NOT EXISTS` block applied at init — **there is no migration system**; schema changes only apply to fresh databases, so altering existing tables requires a manual migration or deleting `data/gym.db`.

**Domain model:**
- `programs` → `program_exercises` are templates. Starting or scheduling a workout from a program *snapshots* its exercises into `workout_exercises` (via `snapshotProgramToWorkout`), so later program edits don't affect existing workouts.
- Workout `status` flows `scheduled` → `active` → `finished`. The workout page (`src/app/(app)/workouts/[id]/page.tsx`) renders a different component per status: preview / `WorkoutSession` (live tracking) / `WorkoutSummary`.
- Supersets are adjacent exercises sharing the same integer `superset_group`. The rest timer starts after a set — for supersets, only after the last exercise in the group.
- Built-in exercises have `user_id IS NULL` and are shared/read-only; user-created ones carry their `user_id`. New users get seeded with a default program (`createDefaultProgram`).
- "Compare with last time": `queries.ts` attaches each exercise's sets from the user's most recent *finished* workout containing it (`prev` on `WorkoutExerciseEntry`).

**Shared helpers (`src/lib/types.ts`):** domain types plus formatting/calc utilities used on both server and client — `epley1RM`, `volumeOf`, Russian date/number formatters (`fmtDate`, `fmtKg`, `plural`), and local-date helpers (`todayLocalISO`, `toLocalDateStr`). Dates are stored as ISO strings; `scheduled_for` is a bare `YYYY-MM-DD`.

**Styling:** dark theme via custom Tailwind color tokens (`bg`, `card`, `line`, `ink`, `mut`, `acc`, `ok`, `warn`, `hot`) defined in tailwind.config.ts, plus component classes (`.card`, `.input`, `.label`, `.btn-primary`, `.btn-ok`, `.btn-ghost`, `.btn-danger-ghost`, `.num`) in `src/app/globals.css`. Use these instead of raw colors/ad-hoc button styles.
