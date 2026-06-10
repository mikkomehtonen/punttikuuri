# Learnings

## Testing Svelte 5 components with svelte/server render()

Components can be rendered in Node.js using `render()` from `svelte/server`. This produces an HTML string which can be asserted against. The `render()` function accepts props via a `props` object, which includes both `data` and `form` for SvelteKit pages.

### Form state initialization pattern

When initializing `$state` variables from `data` props in Svelte 5 (runes mode), accessing `data` inside `$state(...)` only captures the initial value. This is intentional for form defaults — the form state should initialize from server data but be independently editable afterward. Svelte emits a `state_referenced_locally` warning for this pattern, which is expected and matches the pattern used elsewhere in the codebase (e.g., settings page).

### Prefill from last logged set

For workout logging, form inputs for weight and repetitions are pre-filled from the most recently logged set of the same exercise. The derivation logic:

1. If there are sets logged today, use the last set (highest set_number).
2. Otherwise, use the last set from the most recent previous session (if it has sets).
3. Otherwise, return null (no prefill).

This avoids requiring the user to re-enter the same values repeatedly during training sessions.

## Svelte 5 snippet props in server-side component tests

**Date**: 2026-06-10
**Area**: testing
**What happened**: When testing Svelte 5 components that accept `children: Snippet` props via `render()` from `svelte/server`, you can't pass a plain string. The `createRawSnippet` function from `svelte` is needed to create a snippet that renders text content.
**Takeaway**: Use `createRawSnippet(() => ({ render: () => 'text content' }))` to pass children snippets in server-side component tests. Import it from `svelte`.

---

## Acceptance reviewer requires test for every AC

**Date**: 2026-06-10
**Area**: workflow
**What happened**: The acceptance reviewer checks that every single acceptance criterion has a corresponding automated test assertion. Writing tests only for component behavior and updating obviously broken tests is not enough — every AC needs explicit coverage including CSS class assertions.
**Takeaway**: Write tests for every AC alongside the implementation. For UI redesign stories, this means asserting CSS classes (e.g., `bg-primary-600`, `border-red-400`) in addition to text content. Plan test files for every page, not just components.

---

## Reviewer contradiction on infrastructure checks in unit tests

**Date**: 2026-06-10
**Area**: workflow
**What happened**: Story 005 required `npm audit` to report 0 vulnerabilities as an AC. The acceptance reviewer required an automated test running `npm audit` in the test suite. The code reviewer rejected the same test as non-deterministic (network-dependent, can fail without code changes) and a layer violation (CI concern in unit tests). Neither reviewer could be satisfied without failing the other.
**Takeaway**: When a story's ACs require infrastructure checks (npm audit, build success, etc.), write deterministic proxies in unit tests (e.g., lockfile version assertions) and document the infrastructure check as a CI step. If the acceptance reviewer insists on the live check, escalate early — this is a story design issue, not a code issue.

---

## SvelteKit cookie `secure` defaults to true in production

**Date**: 2026-06-10
**Area**: architecture
**What happened**: Login redirect loop when accessing the app over HTTP (Tailscale IP). Root cause: SvelteKit defaults `secure: true` for cookies in production mode except on `http://localhost`. The `Secure` attribute prevents browsers from sending cookies over HTTP, causing the session cookie to be lost after login.
**Takeaway**: For self-hosted apps accessed over HTTP (not localhost), explicitly set `secure: false` in cookie options. The `csrf: { checkOrigin: false }` config is a separate concern (allows form POSTs from non-localhost origins). If HTTPS is added later, change to `secure: true` or make it dynamic based on `ORIGIN` env var.

---

## SvelteKit `csrf.checkOrigin` is deprecated

**Date**: 2026-06-10
**Area**: build
**What happened**: Test output shows deprecation warning: `config.kit.csrf.checkOrigin` has been deprecated in favour of `csrf.trustedOrigins`.
**Takeaway**: When updating SvelteKit config, use `csrf: { trustedOrigins: [...] }` instead of `csrf: { checkOrigin: false }`. The current config works but will need updating in a future SvelteKit version.
