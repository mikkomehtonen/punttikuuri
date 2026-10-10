## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Verification

- The reviewer lint gate is repo-wide: run `npx prettier --check .` yourself before invoking reviewers — `stories/*.md` and generated `drizzle/` files are included (`prettier --write drizzle` after `drizzle-kit generate`). After a reviewer run, check `git status`: reviewers sometimes fix lint issues and leave them uncommitted.
- Subagents cannot spawn other subagents (`subagent_depth: 1`), so an implementer cannot run its own reviewers (`peck code-review` / `peck acceptance-review` only commit reports — they do not run reviews). The top-level session must run the verify loop: `npm run lint` + `npm test` green, then @acceptance-reviewer (story path) and @code-reviewer (`master..HEAD`) in parallel, reading each full report with `git show <HASH> --format=%B -s`. Any later code change invalidates the verdicts — commit and re-run both.

## Commands

- `npm run dev` needs the DB migrated first: `npm run db:migrate` (SQLite at `data/punttikuuri.db`).
- `npm run lint` = `prettier --check . && eslint .` (repo-wide, includes `stories/*.md` and `drizzle/`); `npm run format` fixes.
- `npm run check` = typecheck (`svelte-kit sync && svelte-check`).
- `npm test` = vitest run; single file: `npm test -- src/lib/server/db/__tests__/exercise.test.ts`. `npm run test:unit` is watch mode.
- `npm run test:docker` = Docker deployment smoke test via `docker-compose.test.yml` (isolated data dir `/tmp/punttikuuri-test`); requires a Docker daemon.
- Migrations: edit `src/lib/server/db/schema.ts`, then `npm run db:generate` → `npm run db:migrate`. The production container runs `node migrate.js` on startup before serving.

## Testing architecture (vite.config.ts — there is no vitest.config.ts)

Two vitest projects split by filename: `server` (node env) runs `src/**/*.test.ts` excluding `*.svelte.test.ts`; `browser` (jsdom) runs only `src/**/*.svelte.test.ts`. Tests of client-side reactivity (`$effect`, prop-change behavior) must be named `*.svelte.test.ts` — `$effect` never runs under SSR. `expect.requireAssertions: true`: every test needs at least one real assertion.

- DB tests: `createTestDb` in `src/lib/server/db/__tests__/test-utils.ts` applies every `drizzle/*.sql` via raw `sqlite.exec` (not the drizzle migrator) with `foreign_keys = ON` — child rows need a parent `user` row first. drizzle-kit emits backtick-quoted SQL, so migration-text assertions must tolerate backticks.
- `favicon-http.test.ts` spawns `vite preview --host 127.0.0.1 --port 4173` (bare `vite preview` binds IPv6 `::1` only). If 4173 is stuck, find orphaned `vite preview` PIDs by scanning `/proc/*/cmdline` and kill them (`pkill` is unavailable here).
- The npm-audit test (`app.test.ts > Story 005`) can fail from upstream advisories unrelated to your change: confirm it fails identically at the base commit, report it as dependency drift, and remediate only in a separate standalone commit.

## SvelteKit / Svelte quirks

- Svelte 5 runes mode is forced for all first-party code (`svelte.config.js`) — use `$props`/`$state`/`$effect`, not legacy syntax.
- `csrf.checkOrigin` is disabled intentionally and auth cookies set `secure: false`: the app runs over plain HTTP on Tailscale.
- Runtime env config: anything readable client-side must be `PUBLIC_*` from `$env/dynamic/public` (e.g. `PUBLIC_LOGO_LINK_URL`); everything else is server-only `$env/dynamic/private` (e.g. `ADMIN_USERNAMES`, comma-separated usernames for `/admin`).
- Shared UI components (Button, Input, …) declare event handlers as explicit typed `$props()` and forward them to the inner element — there is no `$$restProps` pass-through.
- i18n: flat-key JSON dictionaries `src/lib/i18n/{en,fi}.json` used via `t(key, locale)`; every new UI string needs both locales.

## Workflow

- Default branch is `master` (`.opencode/peck.json`); one branch per story, named after its `stories/NNN-slug/` directory; start story work with `peck story load <id>`.
- `docs/learnings.md` collects hard-won pitfalls (testing, drizzle, SvelteKit env, reviewer handling). Read the entries relevant to the area before starting; append new learnings after finishing a task (reflect skill).
