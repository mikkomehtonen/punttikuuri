### Correctness Issues

1. `src/routes/settings/+page.server.ts:35` — `updateUserLocale`/`updateUserTheme` from `auth.ts` are exported but unused. The settings action does a raw `db.update(user).set({ locale, theme })` instead of calling the existing helper functions. This isn't a bug per se, but it means the `auth.ts` helpers are dead code and the settings page bypasses them, creating two patterns for the same operation. If the update logic ever changes (e.g., adding validation or logging), only one path would be updated. [score: 4]

2. `src/lib/server/workout-validation.ts:17-22` — `validateExerciseName` rejects empty strings (`!name`) but allows whitespace-only strings like `"   "` because the `!name` check only catches `""`, not strings of spaces. The caller in `exercises/new/+page.server.ts:14` does `.trim()` before calling, so the current call site is safe, but the validator itself is misleading — it claims "Exercise name is required" yet would accept `"   "` if called without trimming. The test at `app.test.ts:312` only tests `'   '.trim()` (which is `''`), not `'   '` directly. [score: 4]

3. `src/routes/exercises/[id]/+page.server.ts:35` — `locals.user!.id` uses a non-null assertion on `locals.user`, but the `load` function runs on a protected route where the hook guarantees `locals.user` is non-null. However, the `actions` block at line 77 does a proper `if (!locals.user)` check. The inconsistency between `!` assertion in `load` and explicit check in `actions` is a minor style issue, not a bug. [score: 2]

4. `src/lib/server/auth.ts:197-210` — `getSessionUser` deletes expired sessions but does not rotate session tokens. A session token that is about to expire will still be valid until expiry, but there's no mechanism to extend the session. This means all sessions hard-expire after 30 days regardless of activity. This is likely acceptable for a self-hosted app but worth noting. [score: 2]

5. `src/routes/exercises/[id]/+page.server.ts:77-78` — The action handler re-checks `if (!locals.user)` and redirects, but the `load` function above uses `locals.user!.id` with a non-null assertion. If the hook middleware is bypassed (e.g., direct internal call), the `!` assertion could throw. This is consistent with SvelteKit's guarantee that hooks run first, so it's low risk. [score: 2]

### Simplicity Issues

1. `src/lib/server/auth.ts:248-262` — `updateUserLocale` and `updateUserTheme` are exported functions that are never called anywhere in the codebase. The settings page (`settings/+page.server.ts:35`) does the same DB update inline instead of using these helpers. These are dead code. [score: 4]

2. `src/lib/server/auth.ts:248-262` vs `src/routes/settings/+page.server.ts:35` — Two patterns for updating user preferences: the `auth.ts` helpers (`updateUserLocale`, `updateUserTheme`) do single-column updates, while the settings page does a combined `db.update(user).set({ locale, theme })`. The combined approach is actually better (single DB round-trip), so the helpers should either be removed or the settings page should use them. [score: 4]

3. `src/lib/server/__tests__/app.test.ts` — This 576-line test file mixes concerns: it tests route guards, validation functions, cookie configuration, FOUC prevention, PWA manifest, and file-system configuration checks. These should be split into focused test files (e.g., `route-guards.test.ts`, `workout-validation.test.ts`, `auth-cookies.test.ts`). The file name `app.test.ts` doesn't convey what it tests. [score: 3]

4. `src/routes/exercises/[id]/+page.server.ts:100-160` — The transaction logic for find-or-create workout session with UNIQUE constraint retry is well-structured but complex. The inline SQL constraint error code check (`(err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'`) is repeated in both `auth.ts:131` and here. This pattern could be extracted into a helper, though the duplication is minor (2 occurrences). [score: 3]

### Security Issues

1. `src/lib/server/auth.ts:42-47` — Session tokens are generated with `crypto.getRandomValues` (16 bytes / 32 hex chars), which is cryptographically secure. The token is hashed with SHA-256 before storage, which is correct. No issues here. [score: N/A — no finding]

2. `src/lib/server/auth.ts:268-276` — Cookie configuration uses `sameSite: 'lax'`, `httpOnly: true` for session, and `httpOnly: false` for locale/theme (which need to be read client-side for FOUC prevention). The story explicitly states "No Secure flag (Tailscale network)" — this is intentional and documented. No issue. [score: N/A — no finding]

3. `src/routes/login/+page.server.ts:14` and `src/routes/register/+page.server.ts:14` — Login and register form data is extracted with `String(formData.get('username') ?? '')` which is safe from injection since values are parameterized through Drizzle ORM. No SQL injection risk. [score: N/A — no finding]

### Concurrency Issues

1. `src/routes/exercises/[id]/+page.server.ts:100-160` — The transaction for creating a workout session and inserting a set entry handles the race condition where two concurrent requests might try to create the same session. The UNIQUE constraint on `(user_id, exercise_type_id, workout_date)` and the retry logic correctly handle this. However, the `maxSet` calculation at line 148 (`COALESCE(MAX(set_number), 0)`) within the transaction could still produce duplicate set numbers if two concurrent requests for the same session both read `max=0` before either inserts. Since SQLite's WAL mode with `better-sqlite3` uses synchronous API and the entire transaction is a single blocking call, this is actually safe — no true concurrency within a single Node process. [score: 1 — not a real issue given synchronous SQLite]

### Other Notes

1. `src/lib/server/db/index.ts:20-23` — The `getDb()` function uses a module-level `_db` singleton. This is fine for a single-process Node app with SQLite, but the `export const db = getDb()` at line 24 means the DB is initialized at module import time, before any test setup. Tests correctly use dependency injection via `dbArg` parameter in auth functions, but the exercise and settings route handlers import `db` directly, making them harder to test in isolation.

2. `src/routes/exercises/[id]/+page.server.ts:35` — `locals.user!.id` uses a non-null assertion. While the hook guarantees `locals.user` is non-null on protected routes, TypeScript can't verify this. Consider using a pattern like `const userId = locals.user?.id; if (!userId) throw redirect(302, '/login');` for consistency with the action handler.

3. `src/app.d.ts:13` — `locale` is typed as `'en' | 'fi'` but `theme` is typed as `string`. Since `VALID_THEMES` is `['light', 'dark', 'system']`, `theme` could be typed as `'light' | 'dark' | 'system'` for consistency and additional type safety.

### Suggestions

1. Remove the unused `updateUserLocale` and `updateUserTheme` exports from `auth.ts`, or refactor `settings/+page.server.ts` to use them. If keeping the combined update is preferred, delete the unused helpers.

2. Consider adding a whitespace-only check to `validateExerciseName` (e.g., `if (!name.trim())`) so the validator is self-contained and doesn't rely on callers trimming first.

3. Split `app.test.ts` into focused test files matching the modules they test (e.g., `route-guards.test.ts`, `workout-validation.test.ts`, `auth-cookies.test.ts`).

4. The `validateExerciseName` error message says "Exercise name is required (max 100 characters)" but the validation doesn't check for whitespace-only strings. Consider either adding that check or updating the message.

### Verdict

**Reasoning:** There are two findings at score 4: (1) dead code (`updateUserLocale`/`updateUserTheme` are exported but never used, while the settings page duplicates their logic inline), and (2) `validateExerciseName` allows whitespace-only strings despite claiming the name is "required" — though the current call site trims before calling, the validator itself is misleading. Both are maintainability/correctness concerns that should be addressed.

**Fail**
