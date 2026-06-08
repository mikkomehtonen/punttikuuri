# Gym Workout Logger MVP

## Context

A mobile-first web application for quickly logging gym workouts during training sessions. Users need to record sets between exercises with minimal friction — open the app, select an exercise, see previous performance, enter a set, and put the phone away. The app is self-hosted on a home server accessed via Tailscale, supporting multiple household users with completely separated data. This is a greenfield SvelteKit project with SQLite storage, custom authentication, bilingual UI (English/Finnish), dark/light theme support, and PWA installability.

## Out of Scope

- Editing or deleting exercises, workout sessions, or sets (create-only MVP)
- Pounds unit support (kilograms only)
- Copy previous workout as template
- Personal records tracking, volume calculations, progress charts
- Exercise categories or workout notes
- Offline-first synchronization
- Shared household/family features
- Password reset or email verification
- Admin interface or user management beyond self-registration

## Implementation approach

### Architecture

SvelteKit full-stack application with `adapter-node` for self-hosted deployment. SQLite via `better-sqlite3` with Drizzle ORM for type-safe schema and queries. Custom cookie-based authentication using `bcryptjs` for password hashing. Server-side rendering with progressive enhancement via SvelteKit form actions.

### Database

SQLite file stored at `data/punttikuuri.db` (gitignored). Drizzle ORM manages the schema and migrations. All tables use integer auto-increment primary keys except `session` which uses a UUID string. Foreign keys enforce referential integrity; `ON DELETE CASCADE` on `session.user_id`, `exercise_type.user_id`, `workout_session.user_id`, `workout_session.exercise_type_id`, and `set_entry.workout_session_id`.

### Data model

```
user
  id            INTEGER  PK AUTOINCREMENT
  username      TEXT     NOT NULL UNIQUE
  password_hash TEXT    NOT NULL
  locale        TEXT     NOT NULL DEFAULT 'en'
  theme         TEXT     NOT NULL DEFAULT 'system'
  created_at    TEXT     NOT NULL  (ISO 8601)

session
  id            TEXT     PK  (random UUID)
  user_id       INTEGER FK → user.id ON DELETE CASCADE
  expires_at    TEXT     NOT NULL  (ISO 8601)
  created_at    TEXT     NOT NULL  (ISO 8601)

exercise_type
  id            INTEGER  PK AUTOINCREMENT
  user_id       INTEGER FK → user.id ON DELETE CASCADE
  name          TEXT     NOT NULL
  short_name    TEXT     NULL
  display_order INTEGER  NULL
  created_at    TEXT     NOT NULL  (ISO 8601)

workout_session
  id               INTEGER  PK AUTOINCREMENT
  user_id          INTEGER FK → user.id ON DELETE CASCADE
  exercise_type_id INTEGER FK → exercise_type.id ON DELETE CASCADE
  workout_date     TEXT     NOT NULL  (YYYY-MM-DD)
  created_at       TEXT     NOT NULL  (ISO 8601)

set_entry
  id                  INTEGER  PK AUTOINCREMENT
  workout_session_id  INTEGER FK → workout_session.id ON DELETE CASCADE
  set_number          INTEGER  NOT NULL
  weight_kg           REAL     NOT NULL
  repetitions         INTEGER  NOT NULL
  created_at          TEXT     NOT NULL  (ISO 8601)
```

Unique constraint: `(user_id, exercise_type_id, workout_date)` on `workout_session` — one session per user per exercise per day.

### Authentication

- Registration: validate username (3–30 chars, alphanumeric + underscore) and password (8+ chars), hash with `bcryptjs` (12 rounds), store in `user` table.
- Login: verify credentials, create a `session` row with a random UUID token, set an HttpOnly/SameSite=Lax cookie named `session_id` with 30-day expiry.
- Logout: delete the `session` row and clear the cookie.
- Route protection: SvelteKit `hooks.server.ts` checks the cookie on every request, loads the user into `locals`, and redirects unauthenticated users to `/login` for protected routes. Authenticated users visiting `/login` or `/register` are redirected to `/exercises`.

### i18n

Simple store-based approach — no external library. Translation files at `src/lib/i18n/en.json` and `src/lib/i18n/fi.json` contain flat key-value pairs. A `t(key)` function reads from the current locale's translations. The user's locale preference is stored in the `user` table and mirrored in a cookie (`locale`) for server-side rendering. All UI strings must be extracted to these files; no hardcoded user-facing text.

### Theming

Tailwind CSS v4 with dark-mode class strategy (`dark` class on `<html>`). Three modes: `light`, `dark`, `system` (follows `prefers-color-scheme`). Theme preference stored in `user` table and mirrored in a cookie (`theme`). An inline `<script>` in `app.html` reads the cookie and applies the class before first paint to prevent FOUC.

### PWA

`@vite-pwa/sveltekit` generates a service worker and `manifest.webmanifest`. Configured for `adapter-node` compatibility. Manifest includes app name in both locales, standalone display mode, and theme colors matching the app's palette.

### Mobile-first UX

- Minimum touch target size: 44 × 44 px.
- Full-width layouts; no sidebars.
- Exercise list is the landing page after login.
- Exercise detail page shows today's sets at top, previous workouts below — no extra navigation.
- Set entry form uses large number inputs with `inputmode="decimal"` for weight and `inputmode="numeric"` for reps.
- After submitting a set, the form clears and the new set appears immediately.

### Routes

| Route             | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `/login`          | Login form                                     |
| `/register`       | Registration form                              |
| `/exercises`      | Exercise list (main page)                      |
| `/exercises/new`  | Create exercise type                           |
| `/exercises/[id]` | Exercise workout view (today's sets + history) |
| `/settings`       | Language and theme preferences                 |

### Workout session auto-creation

When a user submits a set for an exercise that has no session for today, the server action creates the `workout_session` row first, then the `set_entry`. The `set_number` is calculated as `MAX(set_number) + 1` within the session (starting at 1).

## Tasks

### Task 1 - Project Scaffolding & Database Setup

- SvelteKit project runs with `npm run dev`
  - → home page loads without errors
- `npm run build` produces a working Node server output
  - → `node build` starts and serves the app
- Drizzle migration runs and creates all five tables (user, session, exercise_type, workout_session, set_entry)
  - → `data/punttikuuri.db` file exists with the expected schema
- `data/*.db` is listed in `.gitignore`
  - → database file is not tracked by git
- Tailwind CSS v4 is configured with dark-mode class strategy
  - → applying `class="dark"` to `<html>` element activates dark styles
- Vitest runs and a passing smoke test exists
  - → `npm run test` exits with code 0

### Task 2 - Authentication System

- valid username (3–30 chars, alphanumeric/underscore) + valid password (8+ chars) + register form submitted
  - → user row created in database with bcrypt-hashed password
  - → session row created in database
  - → `session_id` cookie set (HttpOnly, SameSite=Lax)
  - → redirected to `/exercises`
- duplicate username + register form submitted
  - → error message displayed: username already taken
  - → no new user created
- username shorter than 3 chars or password shorter than 8 chars + register form submitted
  - → validation error displayed for the invalid field
- valid credentials + login form submitted
  - → session created, cookie set, redirected to `/exercises`
- invalid credentials + login form submitted
  - → error message displayed: invalid username or password
  - → no session created
- authenticated user + logout action
  - → session row deleted from database
  - → `session_id` cookie cleared
  - → redirected to `/login`
- unauthenticated user + navigates to `/exercises`
  - → redirected to `/login`
- authenticated user + navigates to `/login`
  - → redirected to `/exercises`

### Task 3 - Exercise Type Management

- valid name (1–100 chars) + create exercise form submitted
  - → exercise_type row created in database with current user's `user_id`
  - → `short_name` and `display_order` saved if provided
  - → redirected to `/exercises`
- empty name + create exercise form submitted
  - → validation error displayed
- exercise list page loaded with existing exercises
  - → all exercise types for the current user displayed
  - → sorted by `display_order` ASC (NULLS LAST), then `name` ASC
- user A creates an exercise + user B views exercise list
  - → user B does not see user A's exercises
- no exercises exist + exercise list page loaded
  - → empty-state message displayed with link to create an exercise

### Task 4 - Workout Logging & History

- exercise page loaded with no workout session for today
  - → "Add set" form displayed
  - → previous workout sessions displayed below (if any exist)
- valid weight (positive number) + valid reps (positive integer) + add-set form submitted
  - → `workout_session` row created for today if not already present
  - → `set_entry` row created with correct `set_number`, `weight_kg`, `repetitions`
  - → page refreshes showing the new set in today's workout
  - → form fields clear after successful submission
- exercise page loaded with existing workout session for today
  - → today's sets displayed in `set_number` order
  - → "Add set" form displayed below today's sets
- exercise page loaded with previous workouts
  - → previous workout sessions displayed grouped by date, newest first
  - → each session shows date and all sets in format: `130 kg × 5`
- user A logs a set + user B views the same exercise
  - → user B does not see user A's workout data
- exercise page loaded with no previous workouts at all
  - → only "Add set" form displayed; no history section shown
- weight or reps field empty or non-numeric + add-set form submitted
  - → validation error displayed
- weight or reps is zero or negative + add-set form submitted
  - → validation error displayed

### Task 5 - User Preferences (Language & Theme)

- settings page loaded
  - → current locale and theme displayed in the form
- locale changed to Finnish (`fi`) + form submitted
  - → `user.locale` updated to `fi` in database
  - → `locale` cookie updated
  - → all UI strings rendered in Finnish
- locale changed to English (`en`) + form submitted
  - → `user.locale` updated to `en` in database
  - → all UI strings rendered in English
- theme changed to `dark` + form submitted
  - → `user.theme` updated to `dark` in database
  - → `theme` cookie updated
  - → `dark` class added to `<html>` element
  - → dark styles applied immediately
- theme changed to `light` + form submitted
  - → `dark` class removed from `<html>` element
  - → light styles applied immediately
- theme set to `system` + OS preference is dark + page loaded
  - → dark styles applied
- page loaded with saved `dark` theme preference (cookie present)
  - → no visible flash of light theme (FOUC prevention via inline script)
- unauthenticated user + navigates to `/settings`
  - → redirected to `/login`

### Task 6 - PWA Configuration

- `GET /manifest.webmanifest` returns valid JSON
  - → contains `name`, `short_name`, `icons`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`
- service worker is registered on page load
  - → `navigator.serviceWorker.controller` is not null after page load
- Lighthouse PWA audit or manual verification
  - → app is installable on mobile Chrome
  - → app opens in standalone mode (no browser chrome) when launched from home screen

## Bootstrap

```bash
# 1. Scaffold SvelteKit project (interactive CLI — select: minimal template, TypeScript, ESLint, Prettier)
npx sv create /tmp/punttikuuri-scaffold

# 2. Copy scaffolded files to workspace (preserving existing .git, docs, stories)
cp -r /tmp/punttikuuri-scaffold/* /home/mikko/workspace/punttikuuri/
cp -r /tmp/punttikuuri-scaffold/.* /home/mikko/workspace/punttikuuri/ 2>/dev/null || true
rm -rf /tmp/punttikuuri-scaffold

# 3. Install production dependencies
npm install better-sqlite3@12.10.0 drizzle-orm@0.45.2 bcryptjs@3.0.3

# 4. Install dev dependencies
npm install -D @sveltejs/adapter-node@5.5.4 drizzle-kit@0.31.10 @types/better-sqlite3@7.6.13 @types/bcryptjs@3.0.0 @vite-pwa/sveltekit@1.1.0 tailwindcss@4.3.0 @tailwindcss/vite@4.3.0 vitest@4.1.8 @testing-library/svelte@5.3.1 @testing-library/jest-dom@6.9.1 jsdom@29.1.1

# 5. Create data directory for SQLite (gitignored)
mkdir -p data
echo "data/*.db" >> .gitignore

# 6. Verify setup
npm run dev
```

## Technical Context

| Package                   | Version | Notes                                                                                            |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| @sveltejs/kit             | 2.63.1  | SvelteKit framework; uses Svelte 5 with runes                                                    |
| svelte                    | 5.56.3  | Component API uses `$state()`, `$derived()`, `$effect()` — not legacy reactive declarations      |
| @sveltejs/adapter-node    | 5.5.4   | Produces a Node.js server; configure in `svelte.config.js`                                       |
| vite                      | 8.0.16  | Build tool; already included by SvelteKit                                                        |
| better-sqlite3            | 12.10.0 | Synchronous SQLite3 binding; database path: `data/punttikuuri.db`                                |
| drizzle-orm               | 0.45.2  | Type-safe ORM; schema in `src/lib/server/db/schema.ts`; import from `drizzle-orm/better-sqlite3` |
| drizzle-kit               | 0.31.10 | Migration tool; config in `drizzle.config.ts`                                                    |
| bcryptjs                  | 3.0.3   | Pure JS bcrypt; no native compilation; 12 salt rounds                                            |
| @vite-pwa/sveltekit       | 1.1.0   | PWA plugin; verify compatibility with adapter-node during implementation                         |
| tailwindcss               | 4.3.0   | CSS-first config; `@import "tailwindcss"` in `app.css`; dark mode via `.dark` class              |
| @tailwindcss/vite         | 4.3.0   | Vite plugin for Tailwind v4; add to `vite.config.ts`                                             |
| vitest                    | 4.1.8   | Test runner                                                                                      |
| @testing-library/svelte   | 5.3.1   | Component testing; supports Svelte 5                                                             |
| @testing-library/jest-dom | 6.9.1   | DOM matchers for Vitest                                                                          |
| jsdom                     | 29.1.1  | DOM environment for Vitest                                                                       |

Key integration notes:

- Svelte 5 runes: use `$state()` instead of `let`, `$derived()` instead of `$:`, `$effect()` instead of reactive statements.
- Tailwind v4: no `tailwind.config.js`; configuration lives in CSS via `@theme` directive. Dark mode uses the `dark` selector variant with the `class` strategy.
- Drizzle ORM with better-sqlite3: `import Database from 'better-sqlite3'` then `const db = drizzle(new Database('data/punttikuuri.db'), { schema })`.
- FOUC prevention: inline `<script>` in `app.html` reads the `theme` cookie and sets `document.documentElement.classList.add('dark')` before any CSS renders.
- Session cookie: name `session_id`, flags `HttpOnly` and `SameSite=Lax`. No `Secure` flag (Tailscale network). 30-day expiry.
- Production build: `npm run build` then `node build` to start the server. Default port 3000, configurable via `PORT` env var.

## Notes

- Create-only MVP: users cannot edit or delete exercises, workout sessions, or sets. Mistakes cannot be corrected in this version.
- Weight unit is kilograms only; no pounds option.
- Workout sessions are auto-created on first set entry for a given exercise on a given day. The unique constraint `(user_id, exercise_type_id, workout_date)` enforces one session per exercise per day.
- Set numbers are auto-incremented within a session (1, 2, 3…).
- The inline theme script in `app.html` must execute before any CSS renders to prevent flash of unstyled content (FOUC).
- All user-facing strings must be extracted to `src/lib/i18n/en.json` and `src/lib/i18n/fi.json`. No hardcoded UI text in components.
- The `locale` and `theme` cookies are set alongside the database update so that server-side rendering can read them without a database query on every request.
- For mobile input: weight field uses `inputmode="decimal"`, reps field uses `inputmode="numeric"`.
- Minimum touch target size: 44 × 44 px on all interactive elements.
