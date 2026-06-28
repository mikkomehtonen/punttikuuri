# Make Header Logo a Link Driven by PUBLIC_PUBLIC_LOGO_LINK_URL Environment Variable

## Context

The header logo (added in story 010) currently sits inside the app-name `<a href="/exercises">` link, so the logo image and the "Punttikuuri" text form a single link to `/exercises`. The logo image should become its own separate `<a>` element whose `href` is read from the `PUBLIC_LOGO_LINK_URL` environment variable, allowing the logo to point to an external URL (e.g., a parent service dashboard) while the "Punttikuuri" text remains a separate link to `/exercises`. When `PUBLIC_LOGO_LINK_URL` is unset or empty, the logo renders as a plain decorative `<img>` with no link.

## Out of Scope

- Changing the favicon/logo SVG design or its colors
- Re-theming the logo for dark mode
- Adding the logo anywhere other than the header
- Changing the app name text, its translations, or the text link target (`/exercises`)
- URL validation of `PUBLIC_LOGO_LINK_URL` — whatever string is in the env var becomes the `href` verbatim
- Opening the logo link in a new tab — same tab only (no `target` attribute)
- Modifying the PWA manifest or service worker configuration
- Docker/deployment configuration changes (the env var is set in the deployment environment)

## Implementation approach

### 1. Read the env var in the layout server load function

`src/routes/+layout.server.ts` currently returns `user`, `locale`, and `theme`. Add `logoLinkUrl` by reading `PUBLIC_LOGO_LINK_URL` from `$env/dynamic/public`:

```ts
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		locale: locals.locale,
		theme: locals.theme,
		logoLinkUrl: env.PUBLIC_LOGO_LINK_URL ?? ''
	};
};
```

`$env/dynamic/public` reads from `process.env` at runtime (not build time), so the value can be changed without rebuilding — important for the Docker deployment. `PUBLIC_LOGO_LINK_URL` has the `PUBLIC_` prefix, so it is accessible via `$env/dynamic/public`. The `?? ''` coalesces `undefined` (env var unset) to an empty string, so `data.logoLinkUrl` is always a `string`.

### 2. Update app.d.ts

Add `logoLinkUrl: string` to the `App.PageData` interface in `src/app.d.ts`, alongside the existing `locale` and `theme` entries, for consistency with the manual augmentation pattern already in use:

```ts
interface PageData {
	locale: 'en' | 'fi';
	theme: 'light' | 'dark' | 'system';
	logoLinkUrl: string;
}
```

The auto-generated `LayoutData` type from `./$types` will include `logoLinkUrl` automatically from the load function return type, so `data.logoLinkUrl` is typed as `string` in `+layout.svelte`.

### 3. Restructure the header title in +layout.svelte

**Current markup** (`+layout.svelte` lines 46–52) — logo and text share one link:

```html
<a
	href="/exercises"
	class="inline-flex items-center gap-2 text-xl font-bold text-primary-600 dark:text-primary-400"
>
	<img src="/favicon.svg" alt="" class="h-7 w-7" />
	{t('app.name', locale)}
</a>
```

**Updated markup** — logo and text are separate elements inside a wrapper `<div>`:

```html
<div class="inline-flex items-center gap-2">
	{#if data.logoLinkUrl}
	<a href="{data.logoLinkUrl}" class="inline-flex items-center">
		<img src="/favicon.svg" alt="" class="h-7 w-7" />
	</a>
	{:else}
	<img src="/favicon.svg" alt="" class="h-7 w-7" />
	{/if}
	<a href="/exercises" class="text-xl font-bold text-primary-600 dark:text-primary-400">
		{t('app.name', locale)}
	</a>
</div>
```

Key decisions:

- **Wrapper `<div>` with `inline-flex items-center gap-2`** — takes over the layout classes from the old single `<a>`, keeping the logo and text in a row with an 8 px gap, vertically centered. The wrapper is a flex item of the header container, so the existing responsive layout (`flex-col` on mobile, `sm:flex-row` on desktop) is unaffected.
- **`{#if data.logoLinkUrl}`** — empty string is falsy, so the `<a>` wrapper is omitted when the env var is unset/empty; the `<img>` renders standalone. Any non-empty string is truthy, so the `<a>` wraps the `<img>`.
- **Logo `<a>` has `inline-flex items-center`** — ensures the `<img>` is laid out cleanly inside the link without inline-baseline gaps. As a flex item of the wrapper, `inline-flex` is blockified to `flex`, which is fine.
- **Text `<a>` keeps `text-xl font-bold text-primary-600 dark:text-primary-400` and `href="/exercises"`** — unchanged from the original link, just no longer wrapping the logo.
- **No `target` attribute** — the logo link opens in the same tab per the requirement.
- **`alt=""`** — the image remains decorative; the adjacent "Punttikuuri" text conveys the brand name.

### 4. Update existing tests

The `describe('Header logo')` block in `src/routes/__tests__/layout.test.ts` uses an `appNameLink(body)` helper that matches `<a[^>]*href="\/exercises"[^>]*>[\s\S]*?<\/a>`. With the new structure, this matches only the text link (which no longer contains the `<img>`). Tests that assert `<img`, `h-7`, `w-7`, `inline-flex`, `items-center`, or `gap-2` inside `appNameLink(body)` will fail and must be rewritten to reflect the separate-link structure.

The `makeData()` helper in `src/routes/__tests__/layout.test.ts` must add `logoLinkUrl: ''` as a default field so that existing tests represent the "unset" state (plain img) and new tests can override with `makeData({ logoLinkUrl: 'https://example.com' })` to test the "set" state.

The `makeData()` helper in `src/routes/__tests__/layout.svelte.test.ts` must also add `logoLinkUrl: ''` — this file uses `@testing-library/svelte` which type-checks component props against `LayoutData`, so the `data` prop must include all `LayoutData` fields.

Other test files (`landing-page.test.ts`, `login-page.test.ts`, `register-page.test.ts`, `settings-page.test.ts`, `exercises-page.test.ts`) use `render` from `svelte/server` which accepts loose `Record<string, any>` props, so they do not need `logoLinkUrl` for type checking. The page components they test do not access `data.logoLinkUrl`, so there is no runtime impact either. The implementation agent should verify `npm run check` passes after all changes.

### 5. Add a server load function test

Create `src/routes/__tests__/layout-server.test.ts` to test that the load function reads `PUBLIC_LOGO_LINK_URL` and passes it through. Use `vi.hoisted` + `vi.mock` to mock `$env/dynamic/public`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>
}));

vi.mock('$env/dynamic/public', () => ({
	get env() {
		return mockEnv;
	}
}));

import { load } from '../+layout.server';
```

The `vi.hoisted` declaration ensures `mockEnv` is available when the hoisted `vi.mock` factory runs. The `get env()` getter returns the live `mockEnv` object, so mutating `mockEnv.PUBLIC_LOGO_LINK_URL` between tests takes effect immediately. Call `load` with a minimal mock event providing only `locals` (the only property the function destructures).

## Tasks

### Task 1 - Pass PUBLIC_LOGO_LINK_URL through the layout server load function

- `PUBLIC_LOGO_LINK_URL` env var set to `"https://example.com"` + load function called with mock locals
  - → returned data includes `logoLinkUrl: "https://example.com"`
- `PUBLIC_LOGO_LINK_URL` env var set to `"/some-internal-page"` + load function called
  - → returned data includes `logoLinkUrl: "/some-internal-page"`
- `PUBLIC_LOGO_LINK_URL` env var unset + load function called
  - → returned data includes `logoLinkUrl: ""` (empty string)
- `PUBLIC_LOGO_LINK_URL` env var set to empty string `""` + load function called
  - → returned data includes `logoLinkUrl: ""` (empty string)
- Load function still returns `user`, `locale`, and `theme` from locals
  - → returned data includes `user`, `locale`, and `theme` with the values from `locals`

### Task 2 - Render the logo as a separate link driven by logoLinkUrl

- Layout rendered with `logoLinkUrl: "https://example.com"` in data
  - → the `<img src="/favicon.svg">` is wrapped in an `<a href="https://example.com">`
  - → the logo `<a>` does NOT contain the text "Punttikuuri"
  - → the "Punttikuuri" text is in a separate `<a href="/exercises">` that does NOT contain the `<img>`
- Layout rendered with `logoLinkUrl: "/some-page"` (relative URL) in data
  - → the `<img>` is wrapped in an `<a href="/some-page">`
- Logo link opens in the same tab
  - → the logo `<a>` does NOT have a `target` attribute
- Layout rendered with `logoLinkUrl: ""` (empty) in data
  - → the `<img src="/favicon.svg">` is rendered WITHOUT a wrapping `<a>`
  - → the "Punttikuuri" text is still in `<a href="/exercises">`
- Layout rendered with `logoLinkUrl` omitted from data (undefined)
  - → the `<img>` is rendered WITHOUT a wrapping `<a>`
- Logo image attributes preserved in both cases (linked and unlinked)
  - → the `<img>` has `src="/favicon.svg"`, `alt=""`, `h-7`, and `w-7`
- Text link styling and target preserved
  - → the text `<a>` has `text-xl`, `font-bold`, `text-primary-600`, `dark:text-primary-400`, and `href="/exercises"`
- Logo and title laid out in a row
  - → the wrapper element containing the logo and text link has `inline-flex`, `items-center`, and `gap-2` classes
- Header responsive layout unchanged
  - → the header container still has `flex-col`, `items-center`, `gap-2`, `sm:flex-row`, `sm:justify-between`, and `sm:gap-0` classes
- App name text still rendered with both locales
  - → "Punttikuuri" appears in the body with `en` locale
  - → "Punttikuuri" appears in the body with `fi` locale

## Technical Context

- SvelteKit 2.64.0, Svelte 5.56.3 — `$env/dynamic/public` is a built-in SvelteKit module for reading public (non-`PRIVATE_`-prefixed) env vars at runtime. No new dependencies.
- `$env/dynamic/public` reads from `process.env` at runtime, so `PUBLIC_LOGO_LINK_URL` can be set in the deployment environment (e.g., Docker `environment:` in `docker-compose.yml`) without rebuilding the app.
- The `sveltekit()` Vite plugin (active in vitest via `vite.config.ts`) resolves `$env/dynamic/public` in the test environment. The load function test mocks it with `vi.mock('$env/dynamic/public', ...)` using a `vi.hoisted` mutable object so different env-var states can be tested in the same file.
- Component rendering tests follow the existing `src/routes/__tests__/layout.test.ts` pattern: SSR-render the layout via `render` from `svelte/server` and assert on the returned `body` string. The `<svelte:head>` favicon `<link>` is returned in `head`, not `body`, so it does not interfere with `body` assertions.
- The load function test file (`layout-server.test.ts`) runs in the vitest `server` project (node environment, `.test.ts` extension). The component test file (`layout.test.ts`) also runs in the `server` project. The theme `$effect` test file (`layout.svelte.test.ts`) runs in the `browser` project (jsdom, `.svelte.test.ts` extension).
- No new dependencies.

## Notes

- No URL validation is performed on `PUBLIC_LOGO_LINK_URL`. Whatever string is in the env var becomes the `href` verbatim. This includes relative URLs (e.g., `/dashboard`), external URLs (e.g., `https://example.com`), and protocol-relative URLs (e.g., `//example.com`).
- The logo link opens in the same tab (no `target="_blank"`, no `rel="noopener"`). This is intentional per the requirement.
- When `PUBLIC_LOGO_LINK_URL` is unset or empty, the logo renders as a plain decorative `<img>` with `alt=""` — identical to the unlinked state. No fallback URL is used.
- To configure in Docker, add `environment: - PUBLIC_LOGO_LINK_URL=https://your-url.example` to the `app` service in `docker-compose.yml`. This is a deployment concern and not part of the code changes.
- The `.gitignore` already allows `.env.example` files (`!.env.example`), but no `.env.example` file exists currently. Creating one is optional and not required for this story.
