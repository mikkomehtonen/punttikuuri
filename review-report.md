### Correctness Issues

1. `src/routes/exercises/[id]/+page.server.ts:89` and `src/routes/exercises/[id]/+page.server.ts:140` — **Workout date uses UTC instead of local time.** `new Date().toISOString().slice(0, 10)` produces a UTC date string. If the server timezone differs from UTC and the user works out near local midnight, the workout gets logged under the wrong calendar date (e.g., a 11:30 PM local workout in UTC-5 would be stored as tomorrow's date in UTC). For a self-hosted household app likely running in the user's timezone this is low-risk, but it is a real correctness gap. Fix: use a local-date helper like `new Date().toLocaleDateString('sv-SE')` or manually construct `YYYY-MM-DD` from local date components. [score: 2]

2. `src/routes/exercises/[id]/+page.server.ts:96` and `src/routes/exercises/[id]/+page.server.ts:148` — **`parseInt` accepts partial numeric strings.** `parseInt("1abc", 10)` returns `1`, so `/exercises/1abc` would silently resolve to exercise ID 1. Not a security issue (data is scoped to the authenticated user), but it produces confusing behavior — the user sees exercise 1 instead of a 404. Fix: add a regex check like `/^\d+$/` before parsing, or use `Number(params.id)` and verify it's an integer. [score: 2]

### Simplicity Issues

1. `src/lib/server/auth.ts` vs route handlers — **Inconsistent DB access pattern.** Auth functions (`registerUser`, `loginUser`, `getSessionUser`, `deleteSession`) accept an optional `dbArg` parameter for dependency injection, enabling clean unit tests. However, all four route handlers that query the DB directly (`exercises/+page.server.ts`, `exercises/[id]/+page.server.ts`, `exercises/new/+page.server.ts`, `settings/+page.server.ts`) import and use the module-level `db` singleton. This means the workout/settings code paths cannot be tested with a test DB without patching the module import. Not blocking for an MVP, but the codebase now has two patterns for the same concern. [score: 3]

2. `src/lib/server/workout-validation.ts:22-25` — **`validateExerciseName` trims redundantly.** The caller in `exercises/new/+page.server.ts:18` already does `String(formData.get('name') ?? '').trim()`, then passes the trimmed value to `validateExerciseName`, which trims again internally. The double-trim is harmless but adds confusion about where trimming responsibility lives. Fix: either remove the trim from the validator (caller's job) or remove it from the caller (validator's job). [score: 2]

### Security Issues

None. Session tokens are SHA-256 hashed before storage, passwords use bcrypt with 12 rounds, all data queries filter by `user_id`, Svelte auto-escapes template output (no raw HTML injection), and cookie flags are appropriate for the Tailscale deployment context (HttpOnly session cookie, SameSite=Lax, no Secure flag — as the story explicitly notes).

### Concurrency Issues

None. The workout-session creation in `src/routes/exercises/[id]/+page.server.ts:155-193` correctly uses a `db.transaction()` with UNIQUE-constraint retry logic, which is the right approach for better-sqlite3's synchronous execution model.

### Other Notes

- The `getSessionUser` function in `auth.ts` performs a DB query on every request (via `hooks.server.ts`). For a self-hosted household app this is perfectly fine; if scale ever matters, a session cache would be the next step.
- The `+page.svelte` home page has no `+page.server.ts` — it relies entirely on layout data. This works correctly because the layout provides `locale` and `theme`.
- The `workoutSession` unique constraint on `(user_id, exercise_type_id, workout_date)` combined with the transaction retry logic is well-designed for the "one session per exercise per day" invariant.

### Suggestions

- Consider extracting a `toLocalDateStr(date: Date): string` helper to centralize date formatting and fix the UTC issue in one place.
- The `app.test.ts` file is 576 lines and covers 8+ distinct concerns (scaffolding, auth, validation, FOUC, PWA, cookies, hooks, settings). Consider splitting by domain for easier maintenance.
- The `as Locale` casts in Svelte components (`$derived(data.locale as Locale)`) are redundant since `PageData.locale` is already typed as `'en' | 'fi'` in `app.d.ts`. They're harmless but could be removed for clarity.

### Verdict

**Reasoning:** No findings score ≥ 4. The UTC-date issue is the most notable correctness gap but is low-severity for a self-hosted household app. The DI inconsistency is a minor maintainability concern, not a bug. Security posture is solid for the deployment context.

**Pass**
