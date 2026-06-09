### Correctness Issues

1. `src/lib/server/db/index.ts:21` — The module-level `export const db = getDb()` eagerly creates a database connection at import time. If the `data/` directory doesn't exist yet (e.g., in CI or fresh clone), this will crash on module load before any code can create the directory. The `createDb` function doesn't ensure the parent directory exists. This is a latent bug that will surface in environments where `data/` hasn't been pre-created. [score: 6]

2. `src/routes/exercises/[id]/+page.server.ts:8-11` — The `load` function manually checks `locals.user` and redirects to `/login`, but `hooks.server.ts` already redirects unauthenticated users on protected routes. This is redundant but not harmful. However, the `load` function uses `redirect(303, ...)` while the hook uses `redirect(302, ...)`. The 303 vs 302 inconsistency could cause subtle browser caching differences. [score: 4]

3. `src/routes/settings/+page.server.ts:38` — `locals.user!.id` uses a non-null assertion, but the preceding `if (!locals.user)` check on line 31 only does a `throw redirect`, which TypeScript may not narrow as a never-type in all control flow paths. While SvelteKit redirects do throw, the non-null assertion is fragile — if the redirect were ever replaced with a return, this would become a runtime crash. [score: 4]

4. `src/lib/server/auth.ts:155-170` — `registerUser` has a TOCTOU race condition: it first checks `select().from(user).where(eq(user.username, input.username)).get()` and then inserts. Between the check and insert, another request could insert the same username. The `catch` block for `SQLITE_CONSTRAINT_UNIQUE` mitigates this, but the initial check is still unnecessary work — the unique constraint alone is sufficient, and the double-check pattern adds complexity. [score: 5]

5. `src/routes/exercises/new/+page.svelte:42-48` — The `short_name` input has no `maxlength` attribute, while `name` has `maxlength={100}`. The server-side `validateShortName` caps at 30 characters, but the client doesn't enforce this, creating a mismatch between client and server validation. [score: 4]

6. `src/routes/login/+page.svelte` and `src/routes/register/+page.svelte` — The login and register forms don't set `maxlength` on the username or password inputs, while the server validates username (3–30 chars) and password (8–72 bytes). This is a minor UX issue but not a correctness bug per se. [score: 3]

7. `src/lib/server/auth.ts:248-258` — `getSessionUser` doesn't handle the case where the user row is deleted but the session still exists. The `innerJoin` would return null, which is fine, but the expired session is only cleaned up when the session row is found and expired. Orphaned sessions (user deleted) are never cleaned up. This is a minor leak, not a correctness bug. [score: 3]

### Simplicity Issues

1. `src/lib/server/auth.ts:155-170` — The `registerUser` function performs a redundant pre-check for username uniqueness before the insert. Since the database has a `UNIQUE` constraint and the catch block already handles `SQLITE_CONSTRAINT_UNIQUE`, the initial `select` query is unnecessary. Removing it would simplify the function and eliminate the TOCTOU window. [score: 5]

2. `src/routes/exercises/[id]/+page.server.ts:8-11` and `src/routes/settings/+page.server.ts:9-11` — Both `load` functions manually check `locals.user` and redirect to `/login`, duplicating the logic already in `hooks.server.ts`. Since `isProtectedRoute` already covers `/exercises` and `/settings`, these checks are redundant. Removing them would reduce duplication and centralize auth logic in the hook. [score: 5]

3. `src/lib/server/__tests__/app.test.ts` — The file is 576 lines and mixes many unrelated test concerns (project scaffolding, route guards, validation, cookie config, FOUC prevention, settings, auth). These should be split into focused test files (e.g., `route-guards.test.ts`, `validation.test.ts`, `cookie.test.ts`) for maintainability. [score: 4]

4. `src/lib/server/db/__tests__/test-utils.ts:8-14` — The `loadMigrationSql` function reads the migration SQL file, splits on `--> statement-breakpoint`, and re-joins with semicolons. This is fragile — it depends on Drizzle's internal migration format and could break if the format changes. Using Drizzle's own migration runner would be more robust. [score: 3]

5. `src/routes/exercises/[id]/+page.server.ts:100-180` — The action handler is ~80 lines with transaction logic, validation, and error handling all in one function. Extracting the "find-or-create workout session" logic into a helper function would improve readability and testability. [score: 4]

### Security Issues

1. `src/lib/server/auth.ts:248-258` — `getSessionUser` accepts a raw session token from the cookie and hashes it with SHA-256. This is correct — the token is never stored in plaintext. However, the session cookie lacks a `secure` flag in `COOKIE_OPTIONS`. In production over HTTP, the session cookie would be transmitted in cleartext. The `COOKIE_BASE` object should conditionally set `secure: true` based on the environment. [score: 6]

2. `src/app.html:10-18` — The FOUC prevention script reads `document.cookie` which includes all cookies, not just the theme cookie. While it only extracts the `theme` value, this pattern is visible in the page source and could leak cookie names to client-side scripts. Since `session_id` is HttpOnly, it won't be accessible, but this is still a minor concern. [score: 3]

3. `src/routes/login/+page.server.ts:14` and `src/routes/register/+page.server.ts:14` — The login and register actions don't implement any rate limiting or brute-force protection. An attacker could make unlimited login attempts. This is a significant concern for production but may be acceptable for an MVP. [score: 5]

4. `src/lib/server/auth.ts:COOKIE_BASE` — The `sameSite: 'lax'` setting is appropriate for this application, but the `maxAge` of 30 days for the session cookie is quite long. Consider whether a shorter session duration with refresh would be more appropriate. [score: 2]

### Concurrency Issues

1. `src/routes/exercises/[id]/+page.server.ts:100-180` — The action handler uses `db.transaction()` which is good for atomicity. However, the `try/catch` for `SQLITE_CONSTRAINT_UNIQUE` inside the transaction (lines 130-145) catches the constraint violation and re-fetches. In SQLite with WAL mode, concurrent writes are serialized, so this race condition is unlikely but the pattern is correct for handling it. No issue here. [score: 0]

### Other Notes

1. `src/lib/server/db/index.ts:5-19` — The `getDb()` function uses a module-level `_db` variable as a lazy singleton. This works for a single-process Node server but could be surprising in test environments where you might want to inject a different database. The `createDb` export and the ability to pass `dbArg` to auth functions partially addresses this.

2. `src/lib/i18n/index.ts:8-11` — The `t()` function returns the key itself as a fallback when the translation is missing. This is a reasonable default but means missing translations silently appear as dot-separated keys (e.g., `app.name`) rather than signaling an error.

3. `src/routes/exercises/+page.server.ts:11-13` — When the user is not authenticated, the load function returns `{ exercises: [] }` instead of redirecting. This is intentional since the hook handles the redirect, but it means the page briefly renders with an empty list before the redirect happens. This is fine since the hook runs first.

### Suggestions

1. Consider adding `secure: true` to `COOKIE_OPTIONS` when `NODE_ENV === 'production'` to prevent session cookies from being sent over HTTP in production.

2. The `validateShortName` function in `workout-validation.ts` accepts `null` as valid (for optional fields) but the form in `exercises/new/+page.svelte` converts empty strings to `null` via `String(formData.get('short_name') ?? '').trim() || null`. This is correct but could be confusing — consider documenting the null-semantics.

3. The `app.d.ts` `Locals.theme` is typed as `string` rather than `ValidTheme`, which loses the type narrowing that `isValidTheme` provides. Consider typing it as `ValidTheme` for consistency with `locale`.

### Verdict

**Reasoning:** Several findings score ≥4: the redundant auth checks in route handlers (simplicity, 5), the redundant username uniqueness check (simplicity/correctness, 5), missing `secure` cookie flag (security, 6), the eager DB initialization that can crash (correctness, 6), the non-null assertion on `locals.user` (correctness, 4), and the missing `maxlength` on short_name input (correctness, 4).

**Fail**
