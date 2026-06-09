# Learnings

## Type narrowing in shared interfaces cascades to test factories
**Date**: 2026-06-09
**Area**: testing
**What happened**: Narrowing `AuthUser.locale` from `string` to `ValidLocale` caused 15 typecheck errors across 3 test files because `makeData()` helpers used plain string literals without `as const`.
**Takeaway**: When narrowing types in shared interfaces (`app.d.ts`, `AuthUser`, etc.), immediately grep for all test data factories and add `as const` assertions in the same commit.

---

## Story deployment context overrides generic security suggestions
**Date**: 2026-06-09
**Area**: architecture
**What happened**: Code reviewer flagged missing `secure: true` on session cookies (score 3), but the story explicitly states "No Secure flag (Tailscale network)" since the app runs over HTTP on a Tailscale network.
**Takeaway**: When a reviewer suggests a security hardening that conflicts with the story's stated deployment context, the story takes precedence. Note the conflict in the fix explanation rather than silently applying the change.

---

## Proxy pattern for lazy module initialization
**Date**: 2026-06-09
**Area**: architecture
**What happened**: `export const db = getDb()` created a SQLite connection at import time, causing side effects in test environments. Replaced with a `Proxy` that defers `getDb()` until first property access.
**Takeaway**: Use `new Proxy({} as T, { get: (_, prop, r) => Reflect.get(getInstance(), prop, r) })` to lazily initialize module-level exports without changing any import sites.

---

## Docker deployment stories require automated test scripts
**Date**: 2026-06-09
**Area**: testing
**What happened**: Acceptance reviewer failed a Docker deployment story despite manual verification of all ACs, because there were no automated test scripts. Infrastructure/deployment work still needs testable verification.
**Takeaway**: For Docker/infrastructure stories, create a shell script (e.g., `test-docker.sh`) that automates build verification, container startup, health checks, persistence tests, and image content validation. Add it to package.json as `test:docker`.
