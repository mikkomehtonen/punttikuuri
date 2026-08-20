# Learnings

---

## Use dynamic ports for HTTP tests

**Date**: 2026-06-10
**Area**: testing | reliability
**What happened**: The HTTP accessibility test started a preview server on a hard‑coded port (4173). If another process occupies that port, the test fails, making it flaky.
**Takeaway**: When spawning a server in tests, either choose an available random port (e.g., `0` to let the OS assign) or make the port configurable via environment variables to avoid collisions.

---

## Validate static assets via file reads

**Date**: 2026-06-10
**Area**: testing | asset verification
**What happened**: Acceptance criteria required confirming that the favicon is served from `/favicon.svg`. Instead of full HTTP integration, reading the layout file and confirming the static href string proved sufficient for the story's ACs and kept tests fast.
**Takeaway**: For static asset verification, direct file reads can satisfy ACs without needing full server integration, unless the story explicitly demands HTTP checks.

---

---

## Avoid explicit `any` types in TypeScript tests

**Date**: 2026-06-10
**Area**: testing | TypeScript
**What happened**: The `favicon-http.test.ts` used `let server: any;`, triggering the `@typescript-eslint/no-explicit-any` rule.
**Takeaway**: Prefer explicit types such as `ReturnType<typeof spawn>` or the specific `ChildProcess` type to keep linting happy and improve type safety.

---

## Assert containment, not just substring presence, in SSR tests

**Date**: 2026-06-25
**Area**: testing | SSR
**What happened**: Initial layout logo tests used `expect(body).toContain(...)` to verify the logo was "inside the app name link". The code reviewer flagged this as false confidence because the substrings also appeared elsewhere in the body (nav links, header wrapper). A second iteration extracted the `<a href="/exercises">` substring first and asserted the logo/classes were inside that slice.
**Takeaway**: When a test claims an element is nested inside another, extract the parent element's HTML (e.g. with a regex) and assert on that slice rather than the whole rendered body.

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
**Takeaway**: When a helper returns a SvelteKit action failure, type it as `ActionFailure<{ error: string }>` (imported from `@sveltejs/kit`) rather than `ReturnType<typeof fail>`, so the page's `ActionData` keeps the `error` field.

---

## Exercise detail server-test harness is duplicated

**Date**: 2026-08-20
**Area**: testing | SvelteKit
**What happened**: Story 014 added `exercise-detail-logset-server.test.ts` by copying the ~70-line harness (vi.mock of `$lib/server/db`, in-memory sqlite + `migrate`, user seeding, `mockEvent`) from `exercise-detail-comments-server.test.ts`. Code reviewer flagged the duplication as technical debt.
**Takeaway**: If a third exercise-detail server test file is needed, extract the shared harness (db setup, user seeding, `mockEvent`) into one helper module and import it from all three files instead of copying a third time.

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

**Date**: 2026-08-20
**Area**: workflow | linting
**What happened**: The acceptance reviewer's lint gate runs `prettier --check .` over the whole repository; story 015's `story.md` (planner output) plus two story files failed it, failing the verdict even though all acceptance criteria were covered.
**Takeaway**: Before running reviewers, run `npx prettier --check .` yourself — `stories/*.md` included — and `prettier --write` the offenders. Prettier's markdown reformatting can mangle inline code spans containing backticks; review the diff after `--write`.

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
