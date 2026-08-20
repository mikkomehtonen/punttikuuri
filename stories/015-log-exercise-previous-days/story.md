# Log exercises for previous days

## Context

Workout sessions are currently auto-created for "today" only — both the `logSet` service and the exercise detail page hardcode `new Date().toISOString().slice(0, 10)`. Users sometimes forget to log a set on the day they trained and have no way to back-fill it. This story adds an optional date selector to the exercise detail page so a set (and its session comment) can be logged against any past day, with today remaining the default.

## Out of Scope

- Logging sets for future dates (the date picker's `max` is today and the server rejects future dates).
- Editing or deleting existing sets/sessions (still create-only, per product non-goals).
- Changing the date of an already-logged set.
- A calendar/week view of past workouts — only a single native date input is added.
- Time-of-day granularity (dates only, `YYYY-MM-DD`, matching the existing `workout_date` column).

## Implementation approach

The selected date flows through a `?date=YYYY-MM-DD` query parameter so the SSR `load` function is the single source of truth for which session is displayed. This keeps the displayed sets, the comment form, and the log-set target all consistent with the chosen date without client/server state drift.

**Date selection & navigation.** A native `<input type="date">` is rendered above the log-set form. Its `max` attribute is set to today so the browser picker cannot offer future dates. Changing it calls `goto` (`$app/navigation`) to `?date=<value>`, which re-runs `load`. When the param is absent or invalid the load function falls back to today and the URL stays clean (invalid params are ignored, not echoed back).

**Date validation.** A new `validateWorkoutDate(dateStr)` helper in `src/lib/server/workout-validation.ts` enforces:

- Matches `^\d{4}-\d{2}-\d{2}$`.
- Is a real calendar date — checked by reconstructing via `new Date(dateStr + 'T00:00:00')` and confirming `toISOString().slice(0,10) === dateStr` (this rejects e.g. `2025-02-30`).
- Is not in the future — `dateStr <= today` where `today = new Date().toISOString().slice(0,10)`.
  Returns a translated error string on failure, `null` on success. The same helper is reused by the `logSet` and `saveComment` actions.

**`logSet` service.** `src/lib/server/workout-service.ts` `logSet` gains a `workoutDate: string` parameter (inserted between `exerciseId` and `weightKg`) and uses it instead of computing `today` internally. `created_at` still uses the real current timestamp. The unique-constraint collision handling is unchanged (it now keys on the passed `workoutDate`).

**Load function.** `src/routes/exercises/[id]/+page.server.ts` `load`:

- Reads `url.searchParams.get('date')`; if `validateWorkoutDate` returns non-null or the param is absent, uses today. (Invalid params do not redirect — they silently default to today so a stale/shared link still works.)
- Returns `selectedDate` (the `YYYY-MM-DD` string actually used) and `isToday` (boolean) alongside the existing fields. The existing `todaySets`/`todayComment` fields are renamed to `selectedDateSets`/`selectedDateComment` to reflect that they are no longer always "today".
- Queries the session/sets for `selectedDate` (replacing the hardcoded `today`).
- The previous-sessions query excludes `selectedDate` instead of `today` (the `sql\`${workoutSession.workout_date} != ${today}\``becomes`!= ${selectedDate}`).

**`logSet` action.** Reads `workout_date` from formData. If missing/empty, defaults to today. Runs `validateWorkoutDate`; on failure returns `fail(400, { error })`. On success passes the date to `logSet(db, userId, exerciseId, workoutDate, weightKg, repetitions)`.

**`saveComment` action.** Reads `workout_date` from formData (defaults to today if missing/empty), validates it, and looks up the session for that date instead of hardcoded `today`. Otherwise unchanged.

**UI (`+page.svelte`).**

- The `Input` component (`src/lib/components/Input.svelte`) is extended: add `'date'` to the `type` union and add an optional `max?: string` prop that is forwarded to the underlying `<input>`.
- A date `<input type="date" name="date" max={today} value={selectedDate}>` is placed inside the "Today" section, above the log-set form. On change it navigates via `goto`. It is **not** inside the log-set `<form>` (it is a standalone selector) — the log-set and saveComment forms each carry a hidden `<input type="hidden" name="workout_date" value={selectedDate}>`.
- The section heading is dynamic: when `isToday` is true it renders `t('workout.today', locale)` ("Today"/"Tänään"); otherwise it renders the `selectedDate` string (e.g. `2025-08-19`).
- `todaySets`/`todayComment` references in the component are updated to the renamed `selectedDateSets`/`selectedDateComment`.

**i18n.** New keys added to both `en.json` and `fi.json`:

- `workout.date` — "Date" / "Päivämäärä" (label for the date input).
- `workout.dateError` — "Date must be a valid past or today's date" / "Päivämäärän tulee olla voimassa oleva menneisyyden tai nykyinen päivä" (server validation error).

## Tasks

### Task 1 - Date validation helper

- valid today's date string (`2025-08-20` when today is `2025-08-20`) + `validateWorkoutDate`
  - → returns `null`
- a past date (`2025-08-19`) + `validateWorkoutDate`
  - → returns `null`
- empty string + `validateWorkoutDate`
  - → returns a non-empty error string
- malformed format (`2025/08/20`, `20-08-2025`, `2025-8-20`) + `validateWorkoutDate`
  - → returns a non-empty error string
- syntactically `YYYY-MM-DD` but not a real calendar date (`2025-02-30`) + `validateWorkoutDate`
  - → returns a non-empty error string
- a future date (day after today) + `validateWorkoutDate`
  - → returns a non-empty error string

### Task 2 - `logSet` service accepts a workout date

- `logSet(db, userId, exerciseId, '2025-08-19', 80, 10)` called with no prior session for that date
  - → creates a `workout_session` row with `workout_date = '2025-08-19'`
  - → inserts one `set_entry` with `set_number = 1`, `weight_kg = 80`, `repetitions = 10`
- `logSet(db, userId, exerciseId, '2025-08-19', 90, 8)` called when a session for `2025-08-19` already exists with one set
  - → reuses the existing session (no new `workout_session` row)
  - → inserts a `set_entry` with `set_number = 2`
- `logSet(db, userId, exerciseId, '2025-08-19', ...)` called twice concurrently causing a unique-constraint collision on insert
  - → still results in exactly one session and the set is attached (collision handling preserved)
- `logSet` for date `2025-08-19` does not create or touch a session dated today
  - → no `workout_session` row with today's date exists after the call

### Task 3 - Load function honours the `date` query parameter

- no `date` param + a session exists for today
  - → `selectedDate` equals today's `YYYY-MM-DD`
  - → `isToday` is `true`
  - → `selectedDateSets` contains today's sets
- `?date=2025-08-19` + a session exists for `2025-08-19` but not today
  - → `selectedDate` equals `'2025-08-19'`
  - → `isToday` is `false`
  - → `selectedDateSets` contains the `2025-08-19` sets
  - → `previousSessions` does **not** include the `2025-08-19` session
- `?date=2025-08-19` + sessions exist for both `2025-08-19` and `2025-08-10`
  - → `previousSessions` includes `2025-08-10` but excludes `2025-08-19`
- `?date=invalid` (e.g. `not-a-date`)
  - → `selectedDate` equals today (falls back silently)
  - → `isToday` is `true`
- `?date=2099-01-01` (future date)
  - → `selectedDate` equals today (falls back silently)
  - → `isToday` is `true`
- `?date=2025-08-19` + no session exists for that date
  - → `selectedDateSets` is `[]`
  - → `selectedDateComment` is `null`

### Task 4 - `logSet` action logs against the submitted date

- valid weight/reps + `workout_date='2025-08-19'` submitted
  - → redirects to `/exercises/<id>`
  - → a `workout_session` row with `workout_date='2025-08-19'` exists with one set
- valid weight/reps + no `workout_date` field submitted
  - → redirects to `/exercises/<id>`
  - → a `workout_session` row with today's date exists with one set (defaults to today)
- valid weight/reps + `workout_date='2099-01-01'` (future) submitted
  - → returns `fail(400, { error })` with a non-empty error string
  - → no `workout_session` row is created
- valid weight/reps + `workout_date='2025-02-30'` (not a real date) submitted
  - → returns `fail(400, { error })` with a non-empty error string
- invalid weight (`0`) + `workout_date='2025-08-19'` submitted
  - → returns `fail(400, { error })` (weight validation still runs)
  - → no set inserted
- unauthenticated request
  - → redirects to `/login`

### Task 5 - `saveComment` action uses the submitted date

- `workout_date='2025-08-19'` + a session for `2025-08-19` with one set + comment `'Felt good'`
  - → redirects to `/exercises/<id>`
  - → the `2025-08-19` session's `comment` equals `'Felt good'`
- `workout_date='2025-08-19'` + no session for `2025-08-19`
  - → returns `fail(400, { error })` with the noSetsForComment message
- no `workout_date` field + today's session has sets + comment `'Today note'`
  - → redirects; today's session `comment` equals `'Today note'` (defaults to today)
- `workout_date='2099-01-01'` (future) submitted
  - → returns `fail(400, { error })` with a non-empty date error string
- unauthenticated request
  - → redirects to `/login`

### Task 6 - UI: date selector, dynamic heading, hidden fields, i18n

- page rendered with `selectedDate = today`, `isToday = true`
  - → the section heading contains "Today" (en) / "Tänään" (fi)
  - → a date input with `type="date"`, `name="date"`, and `max` equal to today's date is present
  - → the date input's `value` equals today's date
- page rendered with `selectedDate = '2025-08-19'`, `isToday = false`
  - → the section heading contains `2025-08-19` (not "Today")
  - → the date input's `value` equals `2025-08-19`
- log-set form always contains a hidden input `name="workout_date"` whose `value` equals `selectedDate`
- saveComment form always contains a hidden input `name="workout_date"` whose `value` equals `selectedDate`
- page rendered with `locale = 'fi'`
  - → the date input label contains "Päivämäärä"
- a `form.error` whose value is the date error string is present
  - → the error text is rendered inside an `Alert` with `border-red-400`
- `Input` component rendered with `type="date"` and `max="2025-08-20"`
  - → the underlying `<input>` has `type="date"` and `max="2025-08-20"`

## Technical Context

No new dependencies are introduced — all required packages (`@sveltejs/kit` for `goto`/`redirect`/`fail`, `drizzle-orm`, `better-sqlite3`, `vitest`, `@testing-library/svelte`) are already in `package.json`. The `Input` component is extended in place; no new component is created. Native `<input type="date">` is used for the picker (no date library needed); it submits/renders values as `YYYY-MM-DD`, matching the existing `workout_date` column format.

## Notes

- The date input is a standalone selector (not part of the log-set `<form>`) so that changing the date navigates and refreshes the displayed session before any set is logged. The log-set and saveComment forms carry the selected date via a hidden field so the active session is always the target.
- Invalid `?date` query params are silently ignored (defaulting to today) rather than redirecting, so stale or shared links never break. Future dates are rejected both client-side (`max` attribute) and server-side (`validateWorkoutDate`).
- `created_at` on sessions/sets continues to use the real current timestamp even when `workout_date` is in the past — this preserves insertion ordering and is consistent with the existing schema semantics.
- The existing unique constraint `unique().on(user_id, exercise_type_id, workout_date)` already guarantees one session per exercise per date, so back-filling a past date that already has a session simply appends a set to it (same behaviour as today's repeated logging).
- Renaming the load return fields `todaySets`/`todayComment` to `selectedDateSets`/`selectedDateComment` breaks existing tests that assert on those names: `exercise-detail-page.test.ts` (`makeData` uses `todaySets`/`todayComment` and asserts the "Today" heading) and `exercise-detail-comments-server.test.ts` (load tests assert `todayComment`). These existing tests must be updated to the new field names; the "Today" heading assertion still holds when `isToday` is true (the default in `makeData`). The `logSet`/`saveComment` action tests in `exercise-detail-logset-server.test.ts` / `exercise-detail-comments-server.test.ts` must also be updated to include the `workout_date` field in their mocked `formData` where today's date is expected (or omit it to rely on the today default).
