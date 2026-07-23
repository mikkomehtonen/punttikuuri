# Punttikuuri

Mobile-first gym workout logging app. Log sets (weight + reps) during training and review previous performance. Self-hosted on a home server via Tailscale, supporting multiple household users with separated data. Bilingual UI (English/Finnish) with dark/light theme, installable as a PWA.

## Tech Stack

- **SvelteKit** (Svelte 5, runes mode) with Node adapter
- **Tailwind CSS 4**
- **SQLite** via better-sqlite3 + Drizzle ORM
- **Vitest** + Testing Library
- **PWA** via vite-plugin-pwa

## Developing

```sh
npm install
npm run db:migrate
npm run dev
```

## Building

```sh
npm run build
npm run preview
```

## Database

SQLite database lives at `./data/punttikuuri.db`.

```sh
npm run db:generate   # generate migrations from schema changes
npm run db:migrate    # apply migrations
npm run db:studio     # open Drizzle Studio
```

## Testing

```sh
npm run test          # run all unit tests
npm run test:unit     # run in watch mode
npm run test:docker   # run Docker deployment tests
npm run check         # typecheck
npm run lint          # prettier + eslint
```

## Admin Panel

Designate admin users via the `ADMIN_USERNAMES` environment variable (comma-separated list of usernames). Admins can access `/admin` to list all registered users and reset passwords without requiring email or account access.

```sh
ADMIN_USERNAMES="admin,bob" npm run dev
```

When an admin resets a password, their own session is preserved while all other sessions for the target user are invalidated.

## Admin Panel

Designate admin users via the `ADMIN_USERNAMES` environment variable (comma-separated list of usernames). Admins can access `/admin` to list all registered users and reset passwords without requiring email or account access.

```sh
ADMIN_USERNAMES="admin,bob" npm run dev
```

When an admin resets a password, their own session is preserved while all other sessions for the target user are invalidated.

## Admin Panel

Designate admin users via the `ADMIN_USERNAMES` environment variable (comma-separated list of usernames). Admins can access `/admin` to list all registered users and reset passwords without requiring email or account access.

```sh
ADMIN_USERNAMES="admin,bob" npm run dev
```

When an admin resets a password, their own session is preserved while all other sessions for the target user are invalidated.

## Production (Docker)

Build and run the production container:

```sh
docker compose up -d
```

The app is available at http://localhost:3000. The SQLite database persists in `/data/punttikuuri` on the host across container restarts.

```sh
docker compose down       # stop the container (data preserved)
docker compose logs -f    # view logs
```
