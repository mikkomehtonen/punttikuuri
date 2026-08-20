# Learnings

## Ensure lint compliance for new test files

**Date**: 2026-06-10
**Area**: testing | linting
**What happened**: Added new test files (`favicon-absence.test.ts`, `layout-favicon-static.test.ts`, `favicon-http.test.ts`) which initially triggered Prettier and ESLint errors (explicit `any` usage, formatting). The errors blocked acceptance until manually corrected.
**Takeaway**: After adding any new test or source files, run `npm run format` and `npm run lint` locally before committing. Use proper typings (e.g., `ReturnType<typeof spawn>`) instead of `any` to satisfy `@typescript-eslint/no-explicit-any`.

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

## Keep repository formatting consistent

**Date**: 2026-06-10
**Area**: workflow | code style
**What happened**: Initial commits missed Prettier formatting for newly added files, causing lint failures.
**Takeaway**: Integrate Prettier checks into the development workflow (e.g., pre‑commit hook or CI step) to catch formatting early.

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

## Full test suite has pre-existing environment failures

**Date**: 2026-06-25
**Area**: testing | environment
**What happened**: Running `npm run test` failed on unrelated suites: `better-sqlite3` native module version mismatch, `favicon-http.test.ts` requiring a preview server on port 4173, and an `npm audit` vulnerability check. The story-relevant `layout.test.ts` tests passed cleanly.
**Takeaway**: For UI/presentation changes, rely on the relevant unit tests (e.g. `src/routes/__tests__/layout.test.ts`) and treat the full-suite DB/HTTP/audit failures as environment issues unless the story touches those areas.

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
