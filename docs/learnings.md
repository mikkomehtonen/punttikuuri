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
