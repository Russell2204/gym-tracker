# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IronLog — a gym workout tracker (Next.js 14 App Router + libSQL/Turso + Tailwind). It has a public marketing landing at `/` (Three.js + framer-motion) and the authed app under `(app)`. **All user-facing text is in Russian** — keep new UI strings, error messages, and seed data in Russian.

## Commands

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm start       # serve production build (needs .env.local, see .env.example)
```

There is no lint script and no test suite. Type-check with `npx tsc --noEmit` — this is the main safety net for the async data layer (a forgotten `await` becomes a `Promise<T>` type error).

Locally, with no env vars set, the app uses a local SQLite file at `data/gym.db` (created automatically on first DB access via the `file:` libSQL URL). To reset local data: stop the server and delete that file. `scripts/init-db.mjs` bootstraps a remote Turso DB (schema + built-in exercises); `scripts/cleanup-test-user.mjs` deletes a user by email. Both read `.env.local`.

## Architecture

**No API routes.** All mutations are async server actions in `src/lib/actions.ts`; all reads are async query functions in `src/lib/queries.ts`. The standard page pattern: an async server component in `src/app/(app)/...` calls `requireUser()`, `await`s queries (independent ones via `Promise.all`), and passes plain props to a `'use client'` component in `src/components/`, which invokes server actions directly. Actions return `{ error: string }` or `{ ok: true }` (or `redirect()`), and call `revalidatePath` themselves. `redirect()` must stay outside any `try/catch` (it throws `NEXT_REDIRECT`).

**Auth:** JWT (jose, HS256) in the `gt_session` httpOnly cookie, signed with `JWT_SECRET` (falls back to a dev secret). `src/middleware.ts`: `/` is the public landing (matched by equality) and `/login`/`/register` are public; everything else redirects to `/login` when unauthenticated, and authed users on a public path go to `/dashboard`. `requireUser()` in `src/lib/auth.ts` is the per-page/per-action guard. Every query and mutation must scope by `user_id` — ownership checks are done in SQL (`WHERE ... AND user_id = ?`), not after the fact.

**Database (`src/lib/db.ts`):** `@libsql/client`, **async** (every DB call is awaited). A lazy `Promise<Client>` singleton lives on `globalThis` (shared across HMR and concurrent first requests; cleared on init failure for retry). URL resolution: `TURSO_DATABASE_URL` if set, else `file:data/gym.db` for local dev; on Vercel (`process.env.VERCEL`) a missing `TURSO_DATABASE_URL` throws on purpose (the ephemeral filesystem would silently lose data). Three helpers are the only place libSQL `Row` objects and `bigint` are handled: `all<T>` (spreads each row to a plain object — load-bearing for RSC prop serialization), `get<T>`, and `run` (returns `lastInsertRowid` already coerced to `number`). `@libsql/client`/`libsql` are in `serverComponentsExternalPackages` (next.config.mjs). The full schema is one `executeMultiple` block applied at init — **there is no migration system**; schema changes only apply to fresh databases. Transactions: `saveProgramAction` uses an interactive `client.transaction('write')` (it reads ownership mid-transaction); pure-write sequences (snapshots, set renumbering) use `client.batch(stmts, 'write')`.

**Domain model:**
- `programs` → `program_exercises` are templates. Starting or scheduling a workout from a program *snapshots* its exercises into `workout_exercises` (via `snapshotProgramToWorkout`), so later program edits don't affect existing workouts.
- Workout `status` flows `scheduled` → `active` → `finished`. The workout page (`src/app/(app)/workouts/[id]/page.tsx`) renders a different component per status: preview / `WorkoutSession` (live tracking) / `WorkoutSummary`.
- Supersets are adjacent exercises sharing the same integer `superset_group`. The rest timer starts after a set — for supersets, only after the last exercise in the group.
- Built-in exercises have `user_id IS NULL` and are shared/read-only; user-created ones carry their `user_id`. New users get seeded with a default program (`createDefaultProgram`).
- "Compare with last time": `queries.ts` attaches each exercise's sets from the user's most recent *finished* workout containing it (`prev` on `WorkoutExerciseEntry`).

**Shared helpers (`src/lib/types.ts`):** domain types plus formatting/calc utilities used on both server and client — `epley1RM`, `volumeOf`, Russian date/number formatters (`fmtDate`, `fmtKg`, `plural`), and local-date helpers (`todayLocalISO`, `toLocalDateStr`). Dates are stored as ISO strings; `scheduled_for` is a bare `YYYY-MM-DD`.

**Styling:** dark theme via custom Tailwind color tokens (`bg`, `card`, `line`, `ink`, `mut`, `acc`, `acc2`, `ok`, `warn`, `hot`) plus `shadow-glow*`, `bg-hero-radial`/`bg-card-sheen`, and `animate-float` in tailwind.config.ts; component classes (`.card`, `.card-hover`, `.input`, `.label`, `.btn-primary` (acc→acc2 gradient), `.btn-ok`, `.btn-ghost`, `.btn-danger-ghost`, `.num`, `.text-gradient`) in `src/app/globals.css`. Use these instead of raw colors/ad-hoc button styles. Fonts load via `next/font` (Inter + Chakra Petch as CSS variables) in `src/app/layout.tsx`.

**Icons & motion:** lucide-react for icons, framer-motion for animation. Reduced motion: never branch DOM output on `useReducedMotion()` at render time (causes hydration mismatch) — wrap motion-heavy trees in `<MotionConfig reducedMotion="user">` (see the landing) and keep `useState` seeds deterministic across server/client. Three.js (`@react-three/fiber`/`drei`) is isolated to `src/components/landing/Hero3D.tsx`, loaded via `dynamic(..., { ssr: false })`, so it ships only on the landing route, never in the app bundle.
