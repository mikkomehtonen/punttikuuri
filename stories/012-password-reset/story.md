# Admin Page for Password Reset

## Context

The app has no password recovery mechanism. A household user forgot their password and cannot log in. The app is self-hosted on a home server via Tailscale with no email infrastructure, so email-based reset is not viable. An admin page allows a designated admin user to list all registered users and reset any user's password, including their own. Admin identity is configured via a private `ADMIN_USERNAMES` environment variable (comma-separated usernames), matching the existing env-var configuration pattern (`PUBLIC_LOGO_LINK_URL`). No database schema changes are required.

## Out of Scope

- Email-based password reset or email verification
- User creation or deletion from the admin page
- Editing usernames, locale, or theme from the admin page
- Self-service password reset (users cannot reset their own password without an admin)
- Admin role stored in the database (admin identity is env-var-driven only)
- Rate limiting or audit logging for password resets
- Changing the session duration or cookie configuration

## Implementation approach

### 1. Admin env-var helpers — `src/lib/server/admin.ts` (new file)

A new module that reads the private `ADMIN_USERNAMES` env var and exposes two functions. This module imports only `$env/dynamic/private` — no database dependency — so it can be imported by the layout server load without pulling in the DB proxy.

Unit tests live in `src/lib/server/__tests__/admin.test.ts` and mock `$env/dynamic/private` with `vi.hoisted` + `vi.mock`, following the same pattern as `layout-server.test.ts` mocks `$env/dynamic/public`.

```ts
import { env } from '$env/dynamic/private';

export function getAdminUsernames(): string[] {
	const raw = env.ADMIN_USERNAMES ?? '';
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function isAdminUsername(username: string): boolean {
	return getAdminUsernames().includes(username);
}
```

Key decisions:

- **`$env/dynamic/private`** — reads from `process.env` at runtime (not build time), so `ADMIN_USERNAMES` can be set in the Docker deployment environment without rebuilding. This is the private counterpart to the existing `$env/dynamic/public` usage for `PUBLIC_LOGO_LINK_URL`.
- **Comma-separated, trimmed, empties filtered** — `"admin, bob "` parses to `["admin", "bob"]`. Consecutive commas (`"admin,,bob"`) filter to `["admin", "bob"]`. Empty/unset parses to `[]`.
- **Case-sensitive exact match** — usernames in the database are case-sensitive (SQLite unique constraint), so the admin check must also be case-sensitive. `"Admin"` does not match `"admin"` in the env var. This prevents a user with a differently-cased username from gaining admin access.
- **No `PUBLIC_` prefix** — the env var is server-side only. The layout server load reads it and passes only a boolean `isAdmin` to the client, never the raw username list.

### 2. Route guard — add `/admin` to protected routes

In `src/lib/server/route-guards.ts`, add `'/admin'` to the `protectedRoutes` array so unauthenticated users are redirected to `/login` by `hooks.server.ts`. Do NOT add it to `authRoutes` — authenticated admin users must be able to access it.

```ts
const protectedRoutes = ['/exercises', '/settings', '/admin'] as const;
```

The admin-specific guard (redirecting authenticated non-admins to `/exercises`) is handled in the admin page's server load function, not in route guards, because it requires checking the username against the env var.

### 3. Layout server load — pass `isAdmin` to the client

Update `src/routes/+layout.server.ts` to compute `isAdmin` and include it in the returned data:

```ts
import { isAdminUsername } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		locale: locals.locale,
		theme: locals.theme,
		logoLinkUrl: env.PUBLIC_LOGO_LINK_URL ?? '',
		isAdmin: locals.user ? isAdminUsername(locals.user.username) : false
	};
};
```

Update `src/app.d.ts` to add `isAdmin: boolean` to the `App.PageData` interface:

```ts
interface PageData {
	locale: 'en' | 'fi';
	theme: 'light' | 'dark' | 'system';
	logoLinkUrl: string;
	isAdmin: boolean;
}
```

### 4. Admin nav link in layout

In `src/routes/+layout.svelte`, add an "Admin" nav link inside the `{#if data.user}` block, between the Settings link and the Logout form. The link renders only when `data.isAdmin` is true:

```html
{#if data.isAdmin}
<a
	href="/admin"
	class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-stone-600 hover:text-primary-600 dark:text-stone-300 dark:hover:text-primary-400"
>
	{t('nav.admin', locale)}
</a>
{/if}
```

The link uses the same class pattern as the Exercises and Settings nav links.

### 5. Password reset and user listing — `src/lib/server/auth.ts`

Add two functions to the existing `auth.ts` module. Add `and` and `ne` to the existing `import { eq } from 'drizzle-orm'` line. Unit tests for `listAllUsers` and `resetUserPassword` are added to the existing `src/lib/server/db/__tests__/auth.test.ts`, using the same `createTestDb` / `destroyTestDb` / `cleanTables` helpers.

**`listAllUsers`** — returns all users with only the fields needed by the admin UI (no password hashes):

```ts
export interface UserInfo {
	id: number;
	username: string;
	created_at: string;
}

export function listAllUsers(dbArg: BetterSQLite3Database<typeof schema> = defaultDb): UserInfo[] {
	return dbArg
		.select({ id: user.id, username: user.username, created_at: user.created_at })
		.from(user)
		.all();
}
```

**`resetUserPassword`** — validates the new password, finds the target user by username, updates the password hash, and invalidates all sessions for that user (except optionally the acting admin's current session):

```ts
export interface ResetInput {
	username: string;
	newPassword: string;
	preserveSessionToken?: string;
}

export interface ResetResult {
	ok: true;
}

export interface ResetError {
	ok: false;
	error: string;
	field?: 'password' | 'username';
}

export type ResetOutcome = ResetResult | ResetError;

export function resetUserPassword(
	input: ResetInput,
	dbArg: BetterSQLite3Database<typeof schema> = defaultDb
): ResetOutcome {
	const passwordError = validatePassword(input.newPassword);
	if (passwordError) {
		return { ok: false, error: passwordError, field: 'password' };
	}

	const existing = dbArg.select().from(user).where(eq(user.username, input.username)).get();

	if (!existing) {
		return { ok: false, error: 'User not found', field: 'username' };
	}

	const passwordHash = bcrypt.hashSync(input.newPassword, SALT_ROUNDS);
	dbArg.update(user).set({ password_hash: passwordHash }).where(eq(user.id, existing.id)).run();

	const preserveHash = input.preserveSessionToken ? hashToken(input.preserveSessionToken) : null;

	if (preserveHash) {
		dbArg
			.delete(session)
			.where(and(eq(session.user_id, existing.id), ne(session.id, preserveHash)))
			.run();
	} else {
		dbArg.delete(session).where(eq(session.user_id, existing.id)).run();
	}

	return { ok: true };
}
```

Key decisions:

- **Reuses `validatePassword`** — same 8–72 byte rule as registration and login.
- **Reuses `hashToken`** (private function in `auth.ts`) — to hash the acting admin's raw session token for the `ne` exclusion. The session table stores SHA-256 hashes of tokens, not raw tokens.
- **Session invalidation logic** — when `preserveSessionToken` is provided, the query deletes sessions where `user_id = target AND id != preserveHash`. This correctly handles both cases:
  - **Self-reset** (admin resets own password): `user_id` matches, so `ne` excludes the current session; all other sessions for the admin are deleted.
  - **Other-user reset**: `user_id` is the target's, not the admin's, so the admin's session is already excluded by the `user_id` condition; `ne` is always true for the target's sessions; all target sessions are deleted.
- **Error messages in English** — consistent with existing auth functions (`'Invalid username or password'`, `'Username already taken'`). The UI displays them directly via `form.error`.
- **`User not found`** — returned when the username doesn't exist. In normal usage the admin selects from a dropdown populated by `listAllUsers`, so this is a race-condition safeguard.

### 6. Admin page — `src/routes/admin/+page.server.ts` (new file)

```ts
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdminUsername } from '$lib/server/admin';
import { listAllUsers, resetUserPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !isAdminUsername(locals.user.username)) {
		throw redirect(302, '/exercises');
	}
	return {
		users: listAllUsers(),
		resetUsername: url.searchParams.get('reset') ?? null
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.user || !isAdminUsername(locals.user.username)) {
			throw redirect(302, '/exercises');
		}

		const formData = await request.formData();
		const username = String(formData.get('username') ?? '');
		const newPassword = String(formData.get('password') ?? '');
		const preserveSessionToken = cookies.get('session_id') ?? undefined;

		const result = resetUserPassword({ username, newPassword, preserveSessionToken });

		if (!result.ok) {
			return fail(400, { error: result.error, field: result.field ?? null });
		}

		throw redirect(303, `/admin?reset=${encodeURIComponent(username)}`);
	}
};
```

The guard check runs in both `load` and `actions` — defense in depth. The `preserveSessionToken` is read from the `session_id` cookie and passed to `resetUserPassword` so the acting admin's current session is preserved during a self-reset.

On success, the action throws a redirect to `/admin?reset=<username>`. The load function reads the `reset` query param and passes it as `resetUsername` to the page. This follows the existing settings page pattern (`/settings?saved=1`), which avoids `ActionData` union type issues — `form` is only used for error display (the `fail()` return type), so `form?.error` and `form?.field` are always valid. The success state is conveyed via `data.resetUsername` instead of `form`.

### 7. Admin page — `src/routes/admin/+page.svelte` (new file)

The page shows a user list and a password reset form. It uses the existing `Card`, `Input`, `Button`, and `Alert` components. The `<select>` element is styled with the same classes as the `Input` component's `<input>` for visual consistency (no reusable Select component exists).

```svelte
<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Card from '$lib/components/Card.svelte';
	import Alert from '$lib/components/Alert.svelte';

	let {
		data,
		form
	}: {
		data: PageData;
		form: import('./$types').ActionData;
	} = $props();

	const locale = $derived(data.locale as Locale);
	let selectedUsername = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>{t('admin.title', locale)} - {t('app.name', locale)}</title>
</svelte:head>

<h1 class="mb-8 text-2xl font-bold text-stone-800 dark:text-stone-100">
	{t('admin.title', locale)}
</h1>

{#if data.resetUsername}
	<div class="mb-4">
		<Alert type="success">
			{t('admin.resetSuccess', locale)}
			{data.resetUsername}
		</Alert>
	</div>
{/if}

{#if form?.error && form?.field !== 'password'}
	<div class="mb-4">
		<Alert type="error">
			{form.error}
		</Alert>
	</div>
{/if}

<div class="mx-auto max-w-md">
	<Card>
		<h2 class="mb-4 font-medium text-stone-800 dark:text-stone-100">
			{t('admin.users', locale)}
		</h2>
		<ul class="mb-6 flex flex-col gap-1">
			{#each data.users as u}
				<li class="text-sm text-stone-700 dark:text-stone-300">
					{u.username}
				</li>
			{/each}
		</ul>

		<form method="POST" class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
					{t('admin.selectUser', locale)}
				</span>
				<select
					name="username"
					bind:value={selectedUsername}
					required
					class="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-sm transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
				>
					{#each data.users as u}
						<option value={u.username}>{u.username}</option>
					{/each}
				</select>
			</label>

			<Input
				label={t('admin.newPassword', locale)}
				name="password"
				type="password"
				bind:value={password}
				required
				error={form?.field === 'password' ? form?.error : undefined}
			/>

			<Button variant="primary" type="submit">
				{t('admin.resetPassword', locale)}
			</Button>
		</form>
	</Card>
</div>
```

After a successful form submission, the action redirects to `/admin?reset=<username>`. The load function re-runs (refreshing the user list) and passes `resetUsername` to the page. The component is re-created, so `selectedUsername` and `password` reset to `''` (fields clear).

### 8. i18n keys

Add the following keys to both `src/lib/i18n/en.json` and `src/lib/i18n/fi.json`:

| Key                   | English            | Finnish                       |
| --------------------- | ------------------ | ----------------------------- |
| `nav.admin`           | Admin              | Ylläpito                      |
| `admin.title`         | Admin              | Ylläpito                      |
| `admin.users`         | Users              | Käyttäjät                     |
| `admin.selectUser`    | Select user        | Valitse käyttäjä              |
| `admin.newPassword`   | New password       | Uusi salasana                 |
| `admin.resetPassword` | Reset password     | Nollaa salasana               |
| `admin.resetSuccess`  | Password reset for | Salasana nollattu käyttäjälle |

### 9. Update existing test `makeData()` helpers

The following test files define local `makeData()` helpers that must add `isAdmin: false` as a default field, matching the new `PageData` shape:

- `src/routes/__tests__/layout.test.ts`
- `src/routes/__tests__/layout.svelte.test.ts`
- `src/routes/__tests__/landing-page.test.ts`
- `src/routes/register/__tests__/register-page.test.ts`
- `src/routes/login/__tests__/login-page.test.ts`
- `src/routes/settings/__tests__/settings-page.test.ts`
- `src/routes/exercises/new/__tests__/new-exercise-page.test.ts`
- `src/routes/exercises/__tests__/detail/exercise-detail-page.test.ts`

Files using `render` from `svelte/server` accept loose props, so missing `isAdmin` has no runtime impact (the components they test don't access `data.isAdmin`). The `layout.svelte.test.ts` file uses `@testing-library/svelte` which type-checks props against `LayoutData`, so `isAdmin` must be present. The implementation agent should verify `npm run check` passes after all changes.

### 10. Update `layout-server.test.ts`

The existing test mocks `$env/dynamic/public`. Add a second mock for `$env/dynamic/private` using the same `vi.hoisted` + `vi.mock` pattern, and add test cases for `isAdmin` in the returned data.

### 11. Admin page server test — `src/routes/admin/__tests__/admin-page-server.test.ts` (new file)

The admin page load guard tests mock `$lib/server/admin` and `$lib/server/auth` to isolate the guard logic from the env var and database:

```ts
const { mockIsAdminUsername, mockListAllUsers } = vi.hoisted(() => ({
	mockIsAdminUsername: vi.fn(),
	mockListAllUsers: vi.fn()
}));

vi.mock('$lib/server/admin', () => ({
	isAdminUsername: mockIsAdminUsername
}));

vi.mock('$lib/server/auth', () => ({
	listAllUsers: mockListAllUsers,
	resetUserPassword: vi.fn()
}));
```

The `load` function is called with a minimal mock event providing only `locals` (and `url` for the `reset` query param test). The `null` user case throws a redirect before `isAdminUsername` is called, so no mock setup is needed for that case. The non-admin and admin cases set `mockIsAdminUsername.mockReturnValue(false/true)` respectively.

## Tasks

### Task 1 - Admin env-var helpers, route guard, and layout integration

- `ADMIN_USERNAMES` env var set to `"admin"` + `isAdminUsername('admin')` called
  - → returns `true`
- `ADMIN_USERNAMES` env var set to `"admin,bob"` + `isAdminUsername('bob')` called
  - → returns `true`
- `ADMIN_USERNAMES` env var set to `"admin"` + `isAdminUsername('wife')` called
  - → returns `false`
- `ADMIN_USERNAMES` env var unset + `isAdminUsername('admin')` called
  - → returns `false`
- `ADMIN_USERNAMES` env var set to empty string `""` + `isAdminUsername('admin')` called
  - → returns `false`
- `ADMIN_USERNAMES` env var set to `" admin , bob "` (with spaces) + `getAdminUsernames()` called
  - → returns `["admin", "bob"]` (trimmed)
- `ADMIN_USERNAMES` env var set to `"admin,,bob,"` (consecutive/trailing commas) + `getAdminUsernames()` called
  - → returns `["admin", "bob"]` (empties filtered)
- `ADMIN_USERNAMES` env var set to `"admin"` + `isAdminUsername('Admin')` called
  - → returns `false` (case-sensitive)
- `isProtectedRoute('/admin')` called
  - → returns `true`
- `isProtectedRoute('/admin/')` called
  - → returns `true`
- `isAuthRoute('/admin')` called
  - → returns `false`
- Layout server load called with `locals.user = { username: 'admin', ... }` and `ADMIN_USERNAMES = 'admin'`
  - → returned data includes `isAdmin: true`
- Layout server load called with `locals.user = { username: 'wife', ... }` and `ADMIN_USERNAMES = 'admin'`
  - → returned data includes `isAdmin: false`
- Layout server load called with `locals.user = null` and `ADMIN_USERNAMES = 'admin'`
  - → returned data includes `isAdmin: false`
- Layout server load called with `locals.user = { username: 'admin', ... }` and `ADMIN_USERNAMES` unset
  - → returned data includes `isAdmin: false`
- Layout server load still returns `user`, `locale`, `theme`, and `logoLinkUrl` from locals/env
  - → returned data includes `user`, `locale`, `theme`, and `logoLinkUrl` with the values from locals/env
- Layout rendered with `data.user` set and `data.isAdmin = true`
  - → the body contains an `<a>` element with `href="/admin"`
  - → the link text is the `nav.admin` translation ("Admin" for en, "Ylläpito" for fi)
- Layout rendered with `data.user` set and `data.isAdmin = false`
  - → the body does NOT contain `href="/admin"`
- Layout rendered with `data.user = null` and `data.isAdmin = false`
  - → the body does NOT contain `href="/admin"`

### Task 2 - Password reset and user listing auth functions

- Database with two registered users + `listAllUsers()` called
  - → returns an array of length 2
  - → each entry has `id` (number), `username` (string), and `created_at` (string)
  - → returned usernames match the registered usernames
  - → returned entries do NOT include `password_hash`, `locale`, or `theme`
- Registered user with password `"oldpassword"` + `resetUserPassword({ username: 'thatuser', newPassword: 'newpassword' })` called
  - → returns `{ ok: true }`
  - → `loginUser({ username: 'thatuser', password: 'newpassword' })` succeeds (returns `ok: true`)
  - → `loginUser({ username: 'thatuser', password: 'oldpassword' })` fails (returns `ok: false`)
- Registered user with an active session + `resetUserPassword({ username: 'thatuser', newPassword: 'newpassword' })` called (no `preserveSessionToken`)
  - → `getSessionUser(oldSessionToken)` returns `null` (session invalidated)
- Registered user with an active session + `resetUserPassword({ username: 'thatuser', newPassword: 'newpassword', preserveSessionToken: oldSessionToken })` called
  - → `getSessionUser(oldSessionToken)` returns the user (session preserved)
- Admin with session A and user with session B + `resetUserPassword({ username: 'user', newPassword: 'newpass', preserveSessionToken: adminSessionToken })` called
  - → `getSessionUser(userSessionToken)` returns `null` (user's session invalidated)
  - → `getSessionUser(adminSessionToken)` returns the admin (admin's session unaffected)
- `resetUserPassword({ username: 'anyuser', newPassword: '1234567' })` called (password < 8 chars)
  - → returns `{ ok: false, error: 'Password must be at least 8 characters', field: 'password' }`
- `resetUserPassword({ username: 'anyuser', newPassword: 'a'.repeat(73) })` called (password > 72 bytes)
  - → returns `{ ok: false, field: 'password' }`
- `resetUserPassword({ username: 'nonexistent', newPassword: 'validpass' })` called
  - → returns `{ ok: false, error: 'User not found', field: 'username' }`

### Task 3 - Admin page UI and server guard

- Admin page load called with `locals.user = null`
  - → throws a redirect with `status: 302` and `location: '/exercises'`
- Admin page load called with `locals.user = { username: 'wife' }` and `isAdminUsername` returning `false`
  - → throws a redirect with `status: 302` and `location: '/exercises'`
- Admin page load called with `locals.user = { username: 'admin' }` and `isAdminUsername` returning `true`
  - → returns `{ users: [...] }` with the user list from `listAllUsers()`
  - → returned `resetUsername` is `null` when no `reset` query param is present
  - → returned `resetUsername` is the query param value when `?reset=wife` is present
- Admin page rendered with `data.users` containing two users and `data.resetUsername = null`
  - → the body contains both usernames in the user list
  - → the body contains a `<select name="username">` with `<option>` elements for each user
  - → the body does NOT contain `border-green-400` (no success alert)
  - → the body does NOT contain `border-red-400` (no error alert)
- Admin page rendered with `data.resetUsername = 'wife'` and `form: null`
  - → the body contains `border-green-400` (success alert)
  - → the body contains the text "wife" inside the success alert
- Admin page rendered with `form: { error: 'User not found', field: 'username' }` and `data.resetUsername = null`
  - → the body contains `border-red-400` (error alert)
  - → the body contains "User not found"
- Admin page rendered with `form: { error: 'Password must be at least 8 characters', field: 'password' }` and `data.resetUsername = null`
  - → the body contains "Password must be at least 8 characters"
  - → the body contains `text-red-600` (field-level error on password input)
- Admin page rendered with `data.locale = 'fi'`
  - → the body contains "Ylläpito" (title)
  - → the body contains "Käyttäjät" (users heading)
  - → the body contains "Uusi salasana" (password label)
  - → the body contains "Nollaa salasana" (submit button)
- Admin page rendered with `data.users` containing users
  - → the body contains a submit button with `bg-primary-600` (primary variant)

## Technical Context

- SvelteKit 2.64.0, Svelte 5.56.3 — `$env/dynamic/private` is a built-in SvelteKit module for reading private (non-`PUBLIC_`-prefixed) env vars at runtime. No new dependencies.
- `$env/dynamic/private` reads from `process.env` at runtime, so `ADMIN_USERNAMES` can be set in the Docker deployment environment without rebuilding.
- The `sveltekit()` Vite plugin (active in vitest via `vite.config.ts`) resolves `$env/dynamic/private` in the test environment. Tests mock it with `vi.mock('$env/dynamic/private', ...)` using a `vi.hoisted` mutable object, following the existing `$env/dynamic/public` mock pattern in `layout-server.test.ts`.
- `drizzle-orm` 0.45.2 — `and` and `ne` are core operators exported from `drizzle-orm`, already available alongside the existing `eq` import. No version change needed.
- `bcryptjs` 3.0.3 — already used for password hashing in `registerUser` and `loginUser`. `resetUserPassword` reuses the same `SALT_ROUNDS` (12) and `bcrypt.hashSync`.
- The `hashToken` function (private in `auth.ts`) uses `node:crypto` `createHash('sha256')` to hash session tokens. `resetUserPassword` reuses it to compute the `preserveHash` for session exclusion.
- No database schema changes — the existing `user` and `session` tables are sufficient. No new Drizzle migration is needed.
- No new npm dependencies.

## Notes

- **Configuring admin users in Docker**: add `environment: - ADMIN_USERNAMES=admin` to the `app` service in `docker-compose.yml`. Multiple admins: `ADMIN_USERNAMES=admin,bob`. This is a deployment concern; the docker-compose.yml change is optional and not required for the code to function (the env var can be set in any deployment environment).
- **When `ADMIN_USERNAMES` is unset or empty**, no user has admin access, the admin nav link never appears, and `/admin` redirects to `/exercises`. This is the safe default.
- **Case sensitivity**: `ADMIN_USERNAMES` must contain the exact username as stored in the database. Usernames are validated with `^[a-zA-Z0-9_]+$` during registration and stored verbatim.
- **Session invalidation on self-reset**: when an admin resets their own password, their current session is preserved (they stay logged in), but any other sessions they have (e.g., another device) are invalidated. When resetting another user's password, all of that user's sessions are invalidated, forcing them to log in with the new password.
- **Error messages are in English** — consistent with existing auth error strings (`'Invalid username or password'`, `'Username already taken'`). The UI displays them directly via `form.error`.
- **The admin page does not show password hashes or any sensitive user data** — `listAllUsers` returns only `id`, `username`, and `created_at`.
