# Add Logo Next to Page Title

## Context

The app header in `+layout.svelte` currently shows only the app name "Punttikuuri" as a text link to `/exercises`. The brand already has a dumbbell logo authored as `static/favicon.svg`, served at `/favicon.svg` and established as the single source of truth in story 009 (the same file is used for the `<link rel="icon">` and the PWA manifest). The header should display this logo immediately to the left of the app name text, so the top of every page reads `[logo] Punttikuuri` with the title text otherwise unchanged.

## Out of Scope

- Changing the favicon/logo SVG design or its colors
- Re-theming the logo for dark mode (the favicon uses fixed amber fills `#d97706`/`#b45309`; it is rendered as-is in both light and dark themes)
- Adding the logo anywhere other than the header title
- Changing the app name text, its translations, or the link target (`/exercises`)
- Modifying the PWA manifest or service worker configuration

## Implementation approach

Render the existing favicon as an `<img>` inside the app-name link in `+layout.svelte`, to the left of the `{t('app.name', locale)}` text. Using `<img src="/favicon.svg">` keeps a single source of truth (the file in `static/`) — the same file already referenced by the `<link rel="icon">` and the PWA manifest — and avoids duplicating SVG markup inline.

**Current markup** (`+layout.svelte` lines 46–48):

```html
<a href="/exercises" class="text-xl font-bold text-primary-600 dark:text-primary-400">
	{t('app.name', locale)}
</a>
```

**Updated markup:**

```html
<a
	href="/exercises"
	class="inline-flex items-center gap-2 text-xl font-bold text-primary-600 dark:text-primary-400"
>
	<img src="/favicon.svg" alt="" class="h-7 w-7" />
	{t('app.name', locale)}
</a>
```

Key decisions:

- `inline-flex items-center gap-2` — lays the logo out in a row with the title text, vertically centered, with an 8 px gap. Applied to the existing `<a>` so the logo and name form a single clickable link to `/exercises` (standard logo + name pattern).
- `h-7 w-7` (28 × 28 px) — matches the `text-xl` line height (1.75 rem = 28 px), keeping the logo proportional to the title. This is an explicit design assumption; adjust only if the visual review requests a different size.
- `alt=""` — the image is decorative; the adjacent "Punttikuuri" text already conveys the brand name, so an empty `alt` is the accessibility-correct choice (screen readers ignore the image and read the text).
- `src="/favicon.svg"` — references the static file served at the root path; no Vite import, so it stays a cacheable HTTP asset and the single source of truth.

No CSS file changes are required; all changes are Tailwind utility classes in the template. The existing responsive header layout (`flex-col` on mobile, `sm:flex-row` on desktop) is unaffected because the logo is contained inside the app-name link, which remains a single flex item of the header container.

## Tasks

### Task 1 - Add logo image to the left of the app name in the header

- Layout rendered with default (English) locale
  - → SSR output contains an `<img>` with `src="/favicon.svg"` inside the header
  - → the `<img>` appears before the app name text "Punttikuuri" in the rendered HTML body
  - → the app name text "Punttikuuri" is still rendered (unchanged)
- Layout rendered with Finnish locale
  - → the `<img src="/favicon.svg">` is present (logo is locale-independent)
  - → the app name text "Punttikuuri" is still rendered
- Logo image is decorative and accessible
  - → the `<img>` has `alt=""` (empty alt)
- App name link styling and target are preserved
  - → the link still has `text-primary-600` and `dark:text-primary-400` classes
  - → the link still has `text-xl` and `font-bold` classes
  - → the link still points to `href="/exercises"`
- Logo and title are laid out in a row
  - → the app-name link has `inline-flex`, `items-center`, and `gap-2` classes
  - → the `<img>` has `h-7` and `w-7` classes
- Header responsive layout is unchanged
  - → the header container still has `flex-col`, `items-center`, `gap-2`, `sm:flex-row`, `sm:justify-between`, and `sm:gap-0` classes

## Technical Context

- SvelteKit 2.64.0, Svelte 5.56.3 — no framework changes required; an `<img>` with a static `src` string renders identically in SSR and on the client.
- Tailwind CSS 4.3.0 — `inline-flex`, `items-center`, `gap-2`, `h-7`, and `w-7` are built-in utilities; no plugin or config needed.
- `static/favicon.svg` is served by SvelteKit at `/favicon.svg` (story 009); the same file is referenced by the `<link rel="icon">` in this layout and by the PWA manifest — single source of truth.
- Tests for this change follow the existing `src/routes/__tests__/layout.test.ts` pattern: SSR-render the layout via `svelte/server` and assert on the returned `body` string (the `<svelte:head>` favicon `<link>` is returned separately in `head`, so it does not interfere with `body` assertions).
- No new dependencies.

## Notes

- The favicon SVG uses fixed fills `#d97706` (primary-600) and `#b45309` (primary-700). In dark mode the title text becomes primary-400 (`#fbbf24`), so the logo will appear slightly darker than the text. This is intentional per the request ("Logo can be found from favicon.svg") — the logo is rendered as-is. Theming the logo with `currentColor` would require inlining the SVG markup and duplicating the source of truth, which is out of scope.
- The `<img>` reuses the already-cached `/favicon.svg` asset (also loaded as the browser tab icon), so it adds no additional unique network payload beyond the first load.
