# Fix npm audit vulnerabilities

## Context

`npm install` reports 8 vulnerabilities (4 low, 4 moderate) in the dependency tree. Two distinct issues underlie all 8 entries:

1. **cookie < 0.7.0** (low, GHSA-pxg6-pf52-xh8x) — `cookie@0.6.0` is pulled in by `@sveltejs/kit@2.63.1`. The 0.7.x release adds validation for out-of-bounds characters in cookie name, path, and domain. Even the latest `@sveltejs/kit@2.64.0` still depends on `cookie@^0.6.0`, so a direct version bump of SvelteKit alone does not fix it. Three audit entries (`@sveltejs/kit`, `@sveltejs/adapter-node`, `@vite-pwa/sveltekit`) all trace back to this single `cookie` dependency.

2. **esbuild ≤ 0.24.2** (moderate, GHSA-67mh-4wv8-2f99) — `esbuild@0.18.20` is a transitive dependency of `drizzle-kit@0.31.10` via `@esbuild-kit/esm-loader@2.6.5` → `@esbuild-kit/core-utils@3.3.2`. The other esbuild instances in the tree (0.25.12 from drizzle-kit's direct dep, 0.28.0 from vite/tsx) are already patched. Four audit entries (`esbuild`, `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`) all trace to this single vulnerable instance.

Neither `npm audit fix` (non-force) nor `npm audit fix --force` resolves these safely — the force path would downgrade `@sveltejs/kit` to 0.0.30 and `drizzle-kit` to 0.18.1, both breaking changes. The correct approach is npm `overrides` to pin the patched versions while keeping all direct dependencies at their current versions.

## Out of Scope

- Upgrading `@sveltejs/kit` to a hypothetical future major that bumps `cookie` natively (no such version exists yet).
- Replacing `drizzle-kit` or `@esbuild-kit/esm-loader` with alternative tooling.
- Addressing deprecation warnings (e.g., `config.kit.csrf.checkOrigin`) — those are separate concerns.
- Upgrading `cookie` to `1.x` — that would be a breaking change for `@sveltejs/kit` which expects `0.x` API.

## Implementation approach

Use npm `overrides` in `package.json` to force the resolved versions of the two vulnerable packages:

- **`cookie` → `0.7.2`** — Latest 0.7.x patch. API-compatible with 0.6.0 (only adds input validation; `parse`/`serialize` signatures unchanged). `@sveltejs/kit` declares `cookie@^0.6.0`; the override replaces the resolved 0.6.0 with 0.7.2 without changing the declared range. `@types/cookie@0.6.0` remains valid since the type signatures are unchanged.

- **`esbuild` → `0.25.12`** — Matches the version already resolved by `drizzle-kit`'s direct `esbuild@^0.25.4` dependency. This replaces the vulnerable `0.18.20` instance pulled by `@esbuild-kit/core-utils@3.3.2` while keeping the other two instances (0.25.12 and 0.28.0) unchanged. The esbuild JS API has been backward-compatible across 0.x versions; `@esbuild-kit/esm-loader` only uses esbuild for config-file transpilation, so the override is low-risk.

Also upgrade `@sveltejs/kit` from `2.63.1` to `2.64.0` (latest patch release, no breaking changes — only adds `File` object support in commands and fixes a server-component bundling edge case).

After editing `package.json`, run `npm install` to regenerate the lockfile, then verify with `npm audit` (expect 0 vulnerabilities) and run the full test suite + build.

## Tasks

### Task 1 — Add npm overrides and upgrade SvelteKit

- `package.json` does not contain an `overrides` field + add `overrides` with `cookie` and `esbuild` entries
  - → `npm install` succeeds without errors
  - → `npm audit` reports 0 vulnerabilities
- `@sveltejs/kit` version in `package.json` is `2.63.1` + change to `2.64.0`
  - → `npm install` resolves `@sveltejs/kit@2.64.0`
  - → `npm audit` reports 0 vulnerabilities

### Task 2 — Verify application integrity

- After overrides applied + `npm install` completed + run `npx vitest run`
  - → all 196 existing tests pass
- After overrides applied + run `npm run build`
  - → build completes without errors
- Run `npm audit`
  - → reports 0 vulnerabilities

## Technical Context

- **cookie 0.7.2** — Patch release in the 0.7.x line. Adds validation for out-of-bounds characters (GHSA-pxg6-pf52-xh8x). No breaking API changes from 0.6.0.
- **esbuild 0.25.12** — Already present in the tree as a direct dependency of `drizzle-kit@0.31.10`. The override consolidates the vulnerable 0.18.20 instance to this version.
- **@sveltejs/kit 2.64.0** — Released 2026-06-08. Minor feature (File objects in commands) + patch fix (server-component bundling). No breaking changes from 2.63.1.
- **@types/cookie 0.6.0** — Remains at current version; type signatures for `parse`/`serialize` are unchanged between cookie 0.6 and 0.7.

## Notes

- The `overrides` field is supported by npm ≥ 8.3. The project uses npm (evidenced by `package-lock.json`).
- `@esbuild-kit/esm-loader` is a legacy dependency of `drizzle-kit` used only for config-file loading at dev time. If a future `drizzle-kit` release drops it, the esbuild override can be removed.
- The esbuild vulnerability (GHSA-67mh-4wv8-2f99) only affects the development server — it allows any website to send requests to the dev server and read responses. It is not exploitable in production builds. Nonetheless, fixing it eliminates the `npm audit` noise.
