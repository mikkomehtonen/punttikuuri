# Learnings

---

---

## SvelteKit public env vars must use the `PUBLIC_` prefix

**Date**: 2026-06-28
**Area**: architecture | SvelteKit | environment variables
**What happened**: Story 011 originally specified reading `LOGO_LINK_URL` from `$env/dynamic/public`. SvelteKit 2.64.0 only exposes variables matching `config.kit.env.publicPrefix` (default `PUBLIC_*`) through that module, so the code would not type-check or resolve at runtime. The env var had to be renamed to `PUBLIC_LOGO_LINK_URL`.
**Takeaway**: When adding a runtime-configurable value that must be readable on the server (and potentially the client), name it `PUBLIC_<NAME>` and import it from `$env/dynamic/public`. Non-prefixed variables belong in `$env/dynamic/private` and are server-only.

---

## Adding a field to `App.PageData` ripples to every page test

**Date**: 2026-06-28
**Area**: testing | TypeScript | SvelteKit
**What happened**: Adding `logoLinkUrl: string` to `App.PageData` made it a required field on every page component's `data` prop. Every `makeData()` helper in page tests (landing, login, register, settings, exercises, etc.) had to include `logoLinkUrl: ''`, not just the layout tests.
**Takeaway**: Before changing `App.PageData`, search for all `makeData` helpers and inline `data:` objects in `*.test.ts` files and update them in the same commit to keep `svelte-check` green.

---

## Test DB helper must apply all Drizzle migrations

**Date**: 2026-08-06
**Area**: testing | database | migrations
**What happened**: Adding a `comment` column to `workout_session` (new migration `0001`) broke existing `exercise.test.ts` DB tests with `table workout_session has no column named comment`, because `createTestDb` in `src/lib/server/db/__tests__/test-utils.ts` only loaded migration `0000`.
**Takeaway**: `test-utils.ts` now loads every `*.sql` file in `drizzle/` (sorted). When adding a new migration, existing DB tests pick it up automatically; if a DB test fails with "no column named X", the test DB is not applying the latest migration.

---

## Type SvelteKit action failures with `ActionFailure<{ error: string }>`

**Date**: 2026-08-06
**Area**: TypeScript | SvelteKit
**What happened**: A shared helper returning `ReturnType<typeof fail>` caused `Property 'error' does not exist on type '{}'` on the page's `form?.error`, because `ReturnType<typeof fail>` resolves to a generic `ActionFailure` that loses the `{ error: string }` data shape.
**Takeaway**: When a helper returns a SvelteKit action failure, type it as `ActionFailure<{ error: string }>` (imported from `@sveltejs/kit`) rather than `ReturnType<typeof fail>`, so the page's `ActionData` keeps the `error` field. Note the page's `form` prop is the **unwrapped** `fail()` data bag — it has no `ok`/`status`/`type` properties. To run a component effect only on successful submits (e.g. clearing form fields), gate on `!form`: `form` is non-null only after a failed action; on success it is null (full reload or after an enhanced submit).

---

---

## Client-side behavior tests must use `.svelte.test.ts` (jsdom project)

**Date**: 2026-08-20
**Area**: testing | Svelte | vitest
**What happened**: To test that a `$effect` re-syncs form fields when `data` changes, the SSR test approach (`svelte/server` render, server project) could not be used — `$effect` does not run during SSR. The vitest config lives in `vite.config.ts` (there is no `vitest.config.ts`) and splits by filename: the `server` project (node) runs `src/**/*.test.ts` excluding `*.svelte.test.ts`; the `browser` project (jsdom) runs only `src/**/*.svelte.test.ts`.
**Takeaway**: For client-side reactivity (effects, prop-change behavior), name the test `*.svelte.test.ts` so it lands in the jsdom project, and use `@testing-library/svelte` `render`/`rerender` (see `layout.svelte.test.ts`). `await rerender(...)` flushes `$effect` and the state updates it triggers, so DOM assertions immediately after work.

---

## No auto-cleanup in jsdom component tests — scope queries to the container

**Date**: 2026-08-20
**Area**: testing | jsdom
**What happened**: A first version of `exercise-detail-page.svelte.test.ts` used global `document.querySelector`; components from earlier tests remained in `document.body` (auto-cleanup did not fire in this setup), so later tests asserted against stale elements from previous tests (e.g. expected `'80'`, received `'90'` from a prior test's rerendered component).
**Takeaway**: In `*.svelte.test.ts` files, scope all queries to the `container` returned by `render` (`container.querySelector(...)`) and clear `document.body.innerHTML` in `afterEach` (or call `unmount()`). Never rely on global `document` queries or on auto-cleanup.

---

## Reviewer lint gate is repo-wide `prettier --check .` (includes `stories/*.md`)

**Date**: 2026-08-22
**Area**: workflow | linting
**What happened**: The acceptance reviewer's lint gate runs `prettier --check .` over the whole repository; story 015's `story.md` (planner output) plus two story files failed it, failing the verdict even though all acceptance criteria were covered. In story 018 the reviewer fixed the pre-existing story-file violations itself and left the changes **uncommitted**, so the branch tree was dirty after a Pass verdict.
**Takeaway**: Before running reviewers, run `npx prettier --check .` yourself — `stories/*.md` and `drizzle/` included — and `prettier --write` the offenders (review the diff; markdown reformatting can mangle inline code spans). After `drizzle-kit generate`, run `npx prettier --write drizzle` — the generated `.sql`/snapshot/journal files fail the check as emitted. After any reviewer run, check `git status` — reviewers may fix lint issues and leave them uncommitted; commit (or revert) those changes before reporting completion.

---

## `vite preview` binds IPv6 `::1` only; stale processes hold port 4173

**Date**: 2026-08-20
**Area**: testing | environment
**What happened**: `favicon-http.test.ts` failed with `ECONNREFUSED 127.0.0.1:4173` for two compounding reasons: (1) `vite preview` bound to IPv6 `::1` only, so fetches to `localhost`/`127.0.0.1` were refused while `http://[::1]:4173` returned 200; (2) earlier runs had left orphaned `vite preview` processes holding port 4173 — `server.kill()` on the npm wrapper does not kill the vite child, and `pkill` is unavailable in this environment.
**Takeaway**: The test now spawns `npm run preview -- --host 127.0.0.1 --port 4173`, polls for readiness (no fixed sleep), and kills the whole process group (`detached: true` + `process.kill(-pid, 'SIGTERM')`). If port 4173 is busy, find stale PIDs by scanning `/proc/*/cmdline` for `vite preview` and `kill` them individually.

---

## Resumed reviewer subagent sessions can re-emit stale reports

**Date**: 2026-08-20
**Area**: workflow | reviewers
**What happened**: Re-running the acceptance reviewer with a reused `task_id` returned a byte-identical copy of the first run's report — citing failures (e.g. a version assertion) that had already been fixed in the code — so the "Fail" verdict did not reflect the current HEAD.
**Takeaway**: When a reviewer verdict contradicts the verified actual state (run the failing commands yourself first), do not trust the report: re-run the reviewer with a fresh session (no `task_id`) and read the full report via `git show <HASH> --format=%B -s` to confirm it matches the current code before acting on it.

---

## Svelte components take event handlers as explicit props, not `$$restProps`

**Date**: 2026-08-21
**Area**: Svelte | components
**What happened**: Passing `onclick` to `<Button>` (story 017's delete button) failed type-checking — `Button` declares only `variant`/`href`/`type`/`children` and spreads no `$$restProps`. The repo convention (see `Input`'s `onchange`) is to declare each supported DOM event handler as an explicit typed prop and forward it to the inner element.
**Takeaway**: When a component needs an event handler, add a typed prop (e.g. `onclick?: (event: MouseEvent) => void`) to its `$props()` and forward it with `{onclick}` on the rendered element. Don't assume unknown attributes pass through.

---

## Modal a11y: focus the dialog on open or Escape/backdrop handlers are dead code

**Date**: 2026-08-21
**Area**: Svelte | accessibility
**What happened**: Story 017's confirmation modal put `onclick`/`onkeydown` on a fixed overlay `<div>`. Compiler a11y rules require `tabindex` on `role="dialog"` and a keyboard handler alongside click handlers on non-interactive elements. More subtly, the code reviewer flagged that after clicking the trigger, focus stays on the delete button (outside the overlay), so the overlay's Escape handler never fired — it only worked if the user had tabbed into the modal.
**Takeaway**: For modals in this repo: give the dialog `tabindex="-1"` + `bind:this`, focus it from a `$effect` when it opens, keep `onclick` (backdrop close via `event.target === event.currentTarget`) and `onkeydown` (Escape) on the overlay so events bubble from the focused dialog, and test focus (`vi.waitFor(() => expect(dialog).toHaveFocus())`) plus Escape close.

---

## A single-item fixture flips to "latest" when the default-expands-latest rule is added

**Date**: 2026-09-04
**Area**: testing | Svelte
**What happened**: Story 020 made `previousSessions[0]` (the latest history session) expand by default even when >7 days old. Three existing tests used a _single_ old session (e.g. `workout_date: '2026-08-12'`) and asserted it started collapsed — they all broke, because that lone session was now both the oldest and the latest, hence auto-expanded.
**Takeaway**: When you change a `$derived` default that keys off positional order (`arr[0]`), re-check fixtures where the only item also satisfies that key. To keep asserting an old session stays collapsed, prepend a newer session so the subject is non-latest; to assert "single old expands," use a one-session fixture and assert expanded. Keep distinct `weight_kg` per session in multi-session fixtures so content presence/absence checks are unambiguous.

---

## drizzle-kit 0.31 SQLite text `enum` is type-only — no CHECK constraint

**Date**: 2026-10-04
**Area**: database | drizzle | migrations
**What happened**: Story 021 typed `exercise_type.kind` with `text('kind', { enum: [...] })` expecting drizzle-kit to emit a `CHECK` constraint. It does not (verified: `enumValues` appears nowhere in drizzle-kit 0.31.10's SQLite generator; regenerating reported "No schema changes"). The enum option only infers the TS union.
**Takeaway**: For a DB-enforced enum in this repo, declare the CHECK explicitly: keep an `as const` `KIND_VALUES` tuple in `schema.ts`, use it for both the column type (`{ enum: KIND_VALUES }`) and a table-level `check()` whose `sql` template interpolates the values via `sql.raw` from the same tuple (bound parameters are illegal in DDL, hence `sql.raw` — safe only for compile-time literals; see `exerciseType` in `schema.ts`). Regenerating an unreleased migration changes the journal `tag`/`when`; devs who applied the old tag should delete their local `data/*.db` rather than re-run the rebuild.

---

## npm audit test fails from upstream advisories — confirm pre-existing, don't fix in feature stories

**Date**: 2026-10-04
**Area**: testing | dependencies
**What happened**: `app.test.ts > Story 005 > should have zero npm audit vulnerabilities` fails on current branches because advisories were published after the lockfile was last updated (transitive dev deps: `vitest`, `@vitest/mocker`, `undici`, etc.). It fails identically at the pre-story base commit.
**Takeaway**: When this test fails, verify it is pre-existing (check out the base commit or confirm the story touched no `package.json`/`package-lock.json`) and report it as environmental dependency drift — do not remediate dependencies inside a feature story, especially when the story pins dependency versions.

---
