# Docker Production Deployment

## Context

The application is self-hosted on a home server accessed via Tailscale. Currently it can only be run via `npm run build && node build/index.js` directly on the host, which requires manually installing Node.js, build tools for native modules, and running migrations separately. A Docker container packages the entire runtime — Node.js, compiled native modules (`better-sqlite3`), application code, and migration runner — into a single artifact that can be deployed with one command and consistently reproduced across environments.

## Out of Scope

- CI/CD pipeline or automated image publishing to a registry
- Kubernetes manifests or orchestration beyond single-container docker-compose
- Reverse proxy configuration (TLS termination, routing) — the container exposes a plain HTTP port
- Multi-architecture image builds (single-platform is sufficient for the home server)
- Development-mode Docker setup (Docker is for production deployment only)
- Database backup or restore tooling

## Implementation approach

### Overview

Four new files:

| File                 | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `Dockerfile`         | Multi-stage build producing a minimal production image                  |
| `.dockerignore`      | Exclude source, dev artifacts, and local data from build context        |
| `docker-compose.yml` | Single-service compose with persistent volume for the database          |
| `migrate.js`         | Standalone migration runner using `drizzle-orm/better-sqlite3/migrator` |

### Dockerfile — multi-stage build

**Stage 1: `build`** — base `node:22-bookworm-slim`

1. Install native build tools: `apt-get install -y --no-install-recommends python3 make g++` (required for `better-sqlite3` compilation via `node-gyp` fallback when prebuilds are unavailable).
2. Copy `package.json` and `package-lock.json`.
3. Run `npm ci` to install all dependencies (dev + production) with exact lockfile versions.
4. Copy application source (`src/`, `static/`, `drizzle/`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `drizzle.config.ts`, `.npmrc`, `.prettierrc`, `.prettierignore`, `eslint.config.js`).
5. Run `npm run build` — produces the `build/` directory via `adapter-node`.
6. Run `npm prune --omit=dev` — removes dev dependencies from `node_modules/`, keeping only `better-sqlite3`, `bcryptjs`, `drizzle-orm`, and their transitive runtime dependencies (including the compiled `.node` binary).

**Stage 2: `production`** — base `node:22-bookworm-slim`

1. Create a non-root user `node` (already present in official Node images) and set working directory to `/app`.
2. Copy from build stage: `build/`, `node_modules/`, `drizzle/`, `package.json`, `migrate.js`.
3. Create `/app/data` directory owned by the `node` user.
4. Set `NODE_ENV=production`.
5. Expose port `3000`.
6. `HEALTHCHECK` using `node -e "fetch('http://localhost:3000').then(r=>{if(!r.ok)throw 1})"` — avoids installing `curl`.
7. `CMD`: `["sh", "-c", "node migrate.js && exec node build/index.js"]` — runs migrations first, then `exec` replaces the shell with the Node.js process so it becomes PID 1 and receives SIGTERM/SIGINT for graceful shutdown (handled in `build/index.js` lines 342-343).

### migrate.js — standalone migration runner

A plain JavaScript file (no TypeScript, no build step) at the project root:

```js
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DB_PATH || 'data/punttikuuri.db';
mkdirSync(dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();
```

This uses only `drizzle-orm` (a production dependency) and `better-sqlite3` — no `drizzle-kit` needed. The `migrationsFolder` points to the `drizzle/` directory which is copied into the image. The `DB_PATH` environment variable allows overriding the database location (defaults to `data/punttikuuri.db`, matching the existing `createDb` default in `src/lib/server/db/index.ts`).

### .dockerignore

Excludes: `node_modules`, `.svelte-kit`, `build`, `data`, `.git`, `.vscode`, `.opencode`, `stories`, `docs`, `review-report.md`, `.env*`, `*.db*`.

### docker-compose.yml

Single service definition:

- Image built from the local Dockerfile.
- Port mapping `3000:3000`.
- Named volume `db-data` mounted at `/app/data` for persistent SQLite storage.
- `restart: unless-stopped` for automatic recovery.
- `environment`: `NODE_ENV=production`.

### Database path in production

The existing `createDb()` in `src/lib/server/db/index.ts` defaults to `data/punttikuuri.db`. The `migrate.js` script uses the same default. In Docker, the volume mount at `/app/data` ensures the database persists across container restarts. No source code changes to the application are needed.

## Tasks

### Task 1 - Dockerfile builds successfully

- fresh clone with no `node_modules` or `build/` + `docker compose build`
  - → build completes without errors
  - → final image contains `build/`, `node_modules/` (production deps only), `drizzle/`, `migrate.js`, `package.json`
  - → final image does not contain `src/`, `vite.config.ts`, `tsconfig.json`, or dev dependencies in `node_modules/`

### Task 2 - Container starts and serves the application

- `docker compose up` on a fresh volume (no existing database)
  - → `migrate.js` creates `data/punttikuuri.db` and applies all migrations
  - → `node build/index.js` starts and logs `Listening on http://0.0.0.0:3000`
  - → HTTP GET `http://localhost:3000` returns a 200 response with the login page HTML

### Task 3 - Database persists across container restarts

- container has been running, a user has registered and logged data + `docker compose down` followed by `docker compose up`
  - → the previously registered user can still log in
  - → previously logged workout data is still visible

### Task 4 - Migrations are idempotent

- container starts with an already-migrated database (volume contains a database with all migrations applied)
  - → `migrate.js` completes without errors (no duplicate migration attempts)
  - → application starts normally

### Task 5 - Health check passes

- container is running and serving requests
  - → `docker inspect` shows the health check status as `healthy` after the initial interval

### Task 6 - Non-root user runs the application

- container is running
  - → `docker exec` shows the Node.js process running as the `node` user (not root)

### Task 7 - .dockerignore excludes unnecessary files

- `docker compose build` from a workspace that has `node_modules/`, `build/`, `data/*.db`, `.git/`, and `stories/`
  - → build context does not include `node_modules`, `build`, `data`, `.git`, or `stories` (verified by build log context size or `docker build` output)

## Technical Context

- **Node.js 22.22.3** — current LTS line (22.x). The `node:22-bookworm-slim` image tracks this. No breaking changes in 22.x.
- **@sveltejs/adapter-node 5.5.4** — already in `package.json` devDependencies. Produces `build/` directory with `index.js` entry point. Listens on `0.0.0.0:3000` by default (configurable via `PORT` and `HOST` env vars).
- **better-sqlite3 12.10.0** — native module. Uses `prebuild-install` to download prebuilt binaries; falls back to `node-gyp rebuild` requiring `python3`, `make`, `g++`. The build stage installs these tools.
- **drizzle-orm 0.45.2** — production dependency. The `migrate` function from `drizzle-orm/better-sqlite3/migrator` reads `drizzle/meta/_journal.json` and applies pending SQL migrations. Idempotent — tracks applied migrations in a `__drizzle_migrations` table.
- **Debian Bookworm (glibc)** — chosen over Alpine (musl) because `better-sqlite3` prebuilds target glibc. Using bookworm-slim keeps the image small (~200MB) while avoiding native compilation issues.

## Notes

- The `migrate.js` script runs synchronously before the server starts. For this application's migration size (single migration file), this adds negligible startup time.
- The `DB_PATH` environment variable in `migrate.js` is only used by the migration runner. The application itself uses the hardcoded `data/punttikuuri.db` path in `src/lib/server/db/index.ts`. Both default to the same location, and the Docker volume mount at `/app/data` ensures consistency. If `DB_PATH` is ever needed for the application, `createDb()` already accepts a `dbPath` parameter.
- The container runs as the `node` user (UID 1000 in official Node images). The `/app/data` directory is created with appropriate ownership in the Dockerfile.
- `docker compose down` does not remove the named volume. Use `docker compose down -v` to destroy data.
