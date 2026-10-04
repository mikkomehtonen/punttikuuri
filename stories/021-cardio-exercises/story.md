# Cardio Exercise Support

## Context

Punttikuuri currently supports only strength exercises: every exercise logs sets of `weight_kg` × `repetitions` (`set_entry` in `src/lib/server/db/schema.ts:49`). The user also does running, ski erg, archery etc., which have no weight/reps — they need duration, an optional distance, and a free-text description (e.g. an interval session like "5x400m/1.30"). Without this, cardio activity cannot be logged at all.

## Out of Scope

- Prefill of cardio form fields from a previous entry (explicitly excluded by the product owner).
- Pounds or non-km distance units (km only, matching the kg-only non-goal).
- Editing the kind (strength ↔ cardio) of an existing exercise; exercises are still create-only.
- Progress charts, pace/speed calculations, personal records, or any derived stats from cardio data.
- Changing any existing strength behavior (set logging, editing, deletion, prefill, history collapsing).

## Implementation approach

**Data model** (`src/lib/server/db/schema.ts`):

1. Add `kind` to `exerciseType`: `text('kind').notNull().default('strength')`, values `'strength' | 'cardio'`. Existing rows become `'strength'` via the column default.
2. New table `cardio_entry`:
   - `id` integer PK autoincrement
   - `workout_session_id` integer NOT NULL → `workout_session.id` ON DELETE cascade (same pattern as `set_entry`)
   - `duration_seconds` integer NOT NULL
   - `distance_m` integer (nullable) — stored in whole meters; the UI input and display stay in km (see formatting)
   - `description` text (nullable)
   - `created_at` text NOT NULL
   - No entry-number column: entries are ordered by `created_at ASC, id ASC` and addressed by `id` in edit/delete actions (unlike sets, no renumbering is needed on delete).
3. Generate the migration with `npm run db:generate` (drizzle-kit 0.31.10 emits `drizzle/0002_*.sql`: `ALTER TABLE exercise_type ADD kind text DEFAULT 'strength' NOT NULL` + `CREATE TABLE cardio_entry`). Commit the generated SQL and snapshot; `migrate.js` applies it at container start, and `createTestDb`/`migrate()` in tests replay `./drizzle`.

**Validation** (new functions in `src/lib/server/workout-validation.ts`, following the existing `validateX(str): string | null` pattern, taking a `locale` and returning `t(key, locale)` messages like `validateWorkoutDate` does):

- `validateExerciseKind(kind)`: `''`/missing → `'strength'`; otherwise must be exactly `'strength'` or `'cardio'`, else error.
- `validateDuration(hoursStr, minutesStr, secondsStr)`: each field `''` → `0`, otherwise must match `/^\d+$/` (non-negative integer; no sign, no decimals); `total = h*3600 + m*60 + s` must satisfy `0 < total <= 86400`. Minutes/seconds may exceed 59 (e.g. "90" minutes) — they normalize into the total. Returns the total seconds on success.
- `validateDistanceM(distanceStr)`: input is in km; `''` → `null`; otherwise `Number(distanceStr)` must be finite, `> 0`, `<= 1000` (same `Number()` semantics as `validateWeight` at `workout-validation.ts:24`); `m = Math.round(km * 1000)` must be `>= 1` (inputs below 0.0005 km round to 0 m and are rejected). Returns meters.
- `validateCardioDescription(desc)`: trim; `''` → `null`; trimmed length `<= 500` (same cap as `validateComment`).

**Kind guards on logging actions** (`src/routes/exercises/[id]/+page.server.ts`): after `getOwnedExerciseId`, load the exercise's `kind`; `logSet` fails 400 (`workout.kindMismatch`) when `kind === 'cardio'`, and the new `logCardio` action fails 400 when `kind === 'strength'`. This keeps cardio sessions free of set rows and vice versa.

**Session reuse**: extract the get-or-create-workout-session block from `logSet` (`src/lib/server/workout-service.ts:29-66`, including the `SQLITE_CONSTRAINT_UNIQUE` race handling) into an exported `getOrCreateWorkoutSession(tx, userId, exerciseId, workoutDate, nowISO)`; `logSet` and a new `logCardio` service function both call it. Multiple cardio entries per day are allowed: each `logCardio` inserts one `cardio_entry` row against the (possibly existing) session for that user+exercise+date.

**Create-exercise form** (`src/routes/exercises/new/`): add a radio group `name="kind"` with values `strength`/`cardio`, `strength` checked by default, using the exact fieldset/legend/label markup pattern from `src/routes/settings/+page.svelte:35-59`. Server action parses and validates `kind` and stores it.

**Exercise list** (`src/routes/exercises/+page.server.ts` + `+page.svelte`): load returns `kind`; each list row renders a `<Badge>` with the translated kind label (`exercises.kindStrength` / `exercises.kindCardio`).

**Detail page** (`src/routes/exercises/[id]/`):

- `load` returns `exercise.kind`. When `kind === 'cardio'`:
  - `selectedDateCardioEntries`: cardio entries for the selected date ordered by `created_at ASC, id ASC`.
  - History: a separate query joining `workout_session` with `cardio_entry` (do NOT left-join both `set_entry` and `cardio_entry` in one query — that would produce a cartesian product); previous-session items gain an `entries` array (empty for strength exercises; `sets` stays empty for cardio).
  - `lastSet` stays `null` (no cardio prefill).
- When `kind === 'cardio'` the today/selected-date form renders: three duration inputs (`hours`, `minutes`, `seconds`, `inputmode="numeric"`), a distance input (`name="distance_km"`, `inputmode="decimal"`, optional), a `Textarea` for `description` (optional, `maxlength={500}`), and a hidden `workout_date` — submitting to named action `?/logCardio`. The strength form is untouched.
- Selected-date cardio entries render as cards showing formatted duration, optional distance, optional description, plus edit and delete ghost buttons (same icon-button pattern as sets, `[id]/+page.svelte:178-221`).
- History cards for cardio sessions render the same formatted entry data instead of sets; collapsible/latest-expanded behavior is unchanged.
- `saveComment` gate: for `kind === 'cardio'` require ≥1 `cardio_entry` for the session (error `workout.noEntriesForComment`); strength keeps the existing set-count check.

**Cardio edit/delete actions** (named actions `editCardio` / `deleteCardio` in `[id]/+page.server.ts`, mirroring `editSet`/`deleteSet`): both take hidden `workout_date` + `cardio_entry_id`; validate the date, find the session for that date, find the entry by `id` scoped to that session (missing → 400 `workout.invalidCardioEntry`), then update (re-running all cardio validation) or delete. Because any date is selectable via the existing `?date=` picker, every cardio entry is always editable/deletable — this is the product owner's requirement.

**Display formatting** (pure helper in `src/routes/exercises/[id]/utils.ts`, unit-testable):

- `formatDuration(totalSeconds)`: `h = floor(s/3600)`, `m = floor((s%3600)/60)`, `sec = s%60` → `` `${h}:${pad2(m)}:${pad2(sec)}` `` (e.g. `3930` → `1:05:30`, `45` → `0:00:45`).
- Distance renders as `{distance_m / 1000} km` (JS shortest round-trip number rendering: `42195` → `42.195 km`, `5050` → `5.05 km`, `5000` → `5 km`).

**i18n**: add all new keys to both `src/lib/i18n/en.json` and `src/lib/i18n/fi.json` (currently 77 keys each):

| key                         | en                                                                    | fi                                                                                   |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| exercises.kind              | Exercise type                                                         | Harjoituksen tyyppi                                                                  |
| exercises.kindStrength      | Strength                                                              | Voima                                                                                |
| exercises.kindCardio        | Cardio                                                                | Cardio                                                                               |
| workout.duration            | Duration                                                              | Kesto                                                                                |
| workout.hours               | Hours                                                                 | Tunnit                                                                               |
| workout.minutes             | Minutes                                                               | Minuutit                                                                             |
| workout.seconds             | Seconds                                                               | Sekunnit                                                                             |
| workout.distance            | Distance (km)                                                         | Matka (km)                                                                           |
| workout.description         | Description                                                           | Kuvaus                                                                               |
| workout.submitCardio        | Log Cardio                                                            | Tallenna cardio                                                                      |
| workout.durationError       | Duration must be whole numbers totaling between 1 second and 24 hours | Keston tulee olla kokonaislukuja, yhteensä vähintään 1 sekunti ja enintään 24 tuntia |
| workout.distanceError       | Distance must be a positive number (max 1000 km)                      | Matkan tulee olla positiivinen luku (enintään 1000 km)                               |
| workout.descriptionError    | Description must be at most 500 characters                            | Kuvauksen tulee olla enintään 500 merkkiä                                            |
| workout.deleteCardioConfirm | Delete cardio entry?                                                  | Poistetaanko cardio-suoritus?                                                        |
| workout.invalidCardioEntry  | Invalid cardio entry                                                  | Virheellinen cardio-suoritus                                                         |
| workout.noEntriesForComment | Log at least one cardio entry before adding a comment                 | Kirjaa vähintään yksi cardio-suoritus ennen kommentin lisäämistä                     |
| workout.kindMismatch        | This exercise type does not match the form used                       | Harjoituksen tyyppi ei täsmää käytetyn lomakkeen kanssa                              |

## Tasks

### Task 1 - Schema and migration

- Fresh test DB created via `createTestDb`/`migrate()` from `./drizzle`
  - → `exercise_type` has a `kind` column, NOT NULL, default `'strength'`
  - → `cardio_entry` table exists with columns `id`, `workout_session_id`, `duration_seconds`, `distance_m`, `description`, `created_at`
- Insert exercise without `kind`
  - → stored row has `kind === 'strength'`
- Insert `cardio_entry` with duration only (null distance/description), then select it back
  - → round-trips with `distance_m === null` and `description === null`
- Delete the parent `workout_session` of a cardio entry (FKs ON)
  - → cardio entry is cascade-deleted

### Task 2 - Create exercise with kind

- Valid name + `kind=cardio` + form submitted (`new/+page.server.ts` default action)
  - → redirect 303 to `/exercises`; stored row has `kind === 'cardio'`
- Valid name + `kind=strength` + form submitted
  - → stored row has `kind === 'strength'`
- Valid name + `kind` missing/empty + form submitted
  - → stored row has `kind === 'strength'`
- Valid name + `kind=bogus` + form submitted
  - → `fail(400)` with a non-empty error; no row inserted
- New-exercise page rendered (`svelte/server` render)
  - → contains a radio group named `kind` with values `strength` and `cardio`, `strength` checked by default, labeled via i18n

### Task 3 - Exercise list badge

- Exercises list load
  - → each exercise object includes `kind`
- Cardio exercise rendered in list (en)
  - → Badge shows "Cardio"; strength exercise Badge shows "Strength"
- Same list rendered with locale `fi`
  - → strength badge shows "Voima"

### Task 4 - logCardio action

- Cardio exercise + duration `0h/25m/30s` + empty distance + empty description + submit `logCardio`
  - → redirect 303; one `cardio_entry` with `duration_seconds === 1530`, `distance_m === null`, `description === null`; workout session auto-created for the selected date
- Same exercise + second `logCardio` same date
  - → two `cardio_entry` rows, still exactly one `workout_session` for that date
- `logCardio` + distance `5.05` + description `5x400m/1.30`
  - → stored `distance_m === 5050`, `description === '5x400m/1.30'`
- `logCardio` + distance `42.195` (marathon)
  - → stored `distance_m === 42195` exactly
- `logCardio` + all duration fields empty (or all `0`)
  - → `fail(400)` with duration error; no entry and no session inserted
- `logCardio` + duration field `1.5` or `-5` or `abc`
  - → `fail(400)` with duration error
- `logCardio` + duration totaling 86401 seconds
  - → `fail(400)` with duration error
- `logCardio` + distance `0`, `-1`, or `abc`
  - → `fail(400)` with distance error; no entry inserted
- `logCardio` + distance `1001`
  - → `fail(400)` with distance error
- `logCardio` + distance `0.0004` (rounds to 0 m)
  - → `fail(400)` with distance error
- `logCardio` + description of 501 characters
  - → `fail(400)` with description error
- `logCardio` + future `workout_date`
  - → `fail(400)` with the existing date error (`workout.dateError` text)
- `logCardio` + valid past `workout_date`
  - → entry stored against a session for that past date
- `logCardio` + unauthenticated
  - → redirect 303 to `/login`
- `logCardio` + exercise owned by another user
  - → `fail(404)` "Exercise not found"
- `logCardio` + strength exercise
  - → `fail(400)` with kind-mismatch error; nothing inserted
- `logSet` + cardio exercise
  - → `fail(400)` with kind-mismatch error; no set/session inserted

### Task 5 - Detail page cardio UI

- Cardio exercise detail page rendered (en)
  - → form posts to `?/logCardio` with inputs named `hours`, `minutes`, `seconds`, `distance_km`, `description` and hidden `workout_date`
  - → no `weight_kg`/`repetitions` inputs present
- Strength exercise detail page rendered
  - → still posts to `?/logSet` with `weight_kg`/`repetitions` (unchanged)
- Cardio exercise with one entry (duration 3930s, distance 5050 m, description "5x400m/1.30")
  - → page shows `1:05:30`, `5.05 km`, and the description text
- Cardio entry with `distance_m === 42195`
  - → page shows `42.195 km`
- Cardio entry with null distance and null description
  - → page shows the duration but no `km` text
- Cardio exercise with a previous-date session containing entries
  - → history section renders the entry data (duration/distance/description) instead of set rows
- `formatDuration` unit tests: `45` → `0:00:45`, `3930` → `1:05:30`, `86400` → `24:00:00`
- Cardio session with ≥1 entry + comment submitted via `saveComment`
  - → comment saved; cardio session with 0 entries + comment → `fail(400)` with `workout.noEntriesForComment` text

### Task 6 - Cardio entry edit and delete

- Cardio entry + `deleteCardio` with its `cardio_entry_id` and matching `workout_date`
  - → redirect 303; entry row gone; sibling entries untouched
- `deleteCardio` with an id not belonging to the selected date's session (or nonexistent)
  - → `fail(400)` with invalid-entry error; nothing deleted
- Cardio entry + `editCardio` with new duration/distance/description
  - → redirect 303; row updated with new values
- `editCardio` + invalid duration (total 0) or invalid distance
  - → `fail(400)` with the matching validation error; row unchanged
- `editCardio`/`deleteCardio` against a past date selected via `?date=`
  - → succeeds (entries are always editable/deletable, not just today)
- `editCardio`/`deleteCardio` where the exercise belongs to another user
  - → `fail(404)` with "Exercise not found" (same as `getOwnedExerciseId` in existing actions); no mutation
- Detail page for a cardio exercise with entries on the selected date
  - → each entry card renders edit and delete buttons; delete confirmation dialog posts to `?/deleteCardio`

## Technical Context

- Stack (all already installed — no new dependencies): SvelteKit `^2.70.3`, Svelte `5.56.3`, TypeScript `^6.0.2`, drizzle-orm `0.45.2`, drizzle-kit `0.31.10`, better-sqlite3 `12.10.0`, vitest `4.1.8`, @testing-library/svelte `5.3.1`, jsdom `29.1.1`.
- Tests: two vitest projects (`vite.config.ts:20-49`) — `server` (node env, `src/**/*.{test,spec}.ts`) and `browser` (jsdom, `*.svelte.test.ts`). Server action tests follow `src/routes/exercises/__tests__/detail/exercise-detail-logset-server.test.ts`: `vi.hoisted` mock of `$lib/server/db`, real in-memory better-sqlite3 with `migrate(db, { migrationsFolder: './drizzle' })`, then import `+page.server` and call actions with a hand-built event object. Component tests use `render` from `svelte/server` (see `src/routes/exercises/__tests__/exercises-page.test.ts`).
- `vitest` config sets `expect: { requireAssertions: true }` — every test must assert.
- Run: `npm run test` (unit, `--run`), `npm run check` (svelte-check), `npm run lint` (prettier check + eslint), `npm run format` (prettier write). Migration generation: `npm run db:generate`; the generated `drizzle/0002_*.sql` must be committed because tests replay migrations from `./drizzle`.
- i18n: flat key/value JSON (`src/lib/i18n/en.json`, `fi.json`) consumed by `t(key, locale)`; `locals.locale` is available in actions/load.
- Existing validation error strings are asserted verbatim in tests (e.g. `"Date must be a valid past or today's date"`); new validators return the translated strings from the table above, and new tests must assert those exact strings.

## Notes

- Product-owner decisions baked in: multiple cardio entries per day (morning/evening runs); duration required, distance and description optional; cardio entries always editable/deletable — implemented as edit/delete buttons on the selected date's entries, and since any date is reachable via the existing date picker, every entry is reachable; no prefill for cardio; kind badge on the exercise list.
- "Always editable/deletable" interpretation: cardio entries on the _selected_ date get edit/delete affordances (same mechanism as current-session sets). History cards for non-selected dates stay read-only until the user picks that date — consistent with strength UX.
- Distance is stored as integer meters (`distance_m`) but entered and displayed in km: conversion happens only at the boundaries (`Math.round(km * 1000)` on input, `distance_m / 1000` on display). Rationale: meters are exact integers (marathon = `42195`), avoiding IEEE-754 storage artifacts of km doubles, and consistent with `duration_seconds` being an integer. The existing `weight_kg real` column is not touched.
- Max duration 24 h and max distance 1000 km are explicit assumptions (documented in the validation rules); they bound SQLite-friendly values and prevent typos like `99999`.
- Distance unit is km only, matching the product's kg-only non-goal.
- The `?/logCardio`, `?/editCardio`, `?/deleteCardio` named actions must not collide with existing named actions (`logSet`, `saveComment`, `deleteSet`, `editSet`) — see story 014 for the collision failure mode.
- Existing strength flows must not regress: run the full suite after the session-creation refactor in `workout-service.ts`.
