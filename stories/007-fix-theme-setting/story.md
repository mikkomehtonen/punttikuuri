# Fix theme setting has no effect

## Context

Changing the theme (light/dark/system) in the Settings page has no visible effect. The user selects a theme, clicks Save, the form submits and redirects back with a "Settings saved" message, but the UI appearance does not change. Two root causes:

1. **Tailwind v4 dark-mode strategy is misconfigured.** The app uses `dark:` utility classes throughout (e.g. `dark:bg-stone-900`) and the inline script in `app.html` adds/removes the `dark` class on `<html>`. However, Tailwind v4 defaults `dark:` to `@media (prefers-color-scheme: dark)`, so the `dark` class on `<html>` has no effect on `dark:` utilities. The CSS must declare `@custom-variant dark (&:where(.dark, .dark *));` to switch to class-based dark mode.

2. **No reactive theme application after client-side navigation.** The inline script in `app.html` only runs on full page loads. SvelteKit handles form-action redirects client-side by default, so after saving settings the script never re-runs. The `+layout.svelte` receives `data.theme` from the server but never uses it to toggle the `dark` class on `<html>`. A reactive `$effect` is needed to apply the theme whenever `data.theme` changes.

## Out of Scope

- Changing the cookie-based persistence mechanism (it works correctly).
- Changing the server-side theme resolution logic in `hooks.server.ts` (it works correctly).
- Adding a theme toggle button outside of Settings.
- Modifying the `app.html` inline script (it correctly prevents FOUC on initial full page loads and should be kept as-is).

## Implementation approach

### 1. Configure Tailwind v4 class-based dark mode

Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/routes/layout.css`, after the `@import 'tailwindcss';` line and before the `@theme` block. This tells Tailwind v4 that `dark:` utilities should activate when the `dark` class is present on an ancestor element, matching the existing `app.html` inline script behavior.

### 2. Add reactive theme application in `+layout.svelte`

Add a `$effect` in `src/routes/+layout.svelte` that:

- Reads `data.theme` (already available as a prop).
- When `theme === 'dark'`: adds `dark` class to `document.documentElement`.
- When `theme === 'light'`: removes `dark` class from `document.documentElement`.
- When `theme === 'system'`: toggles `dark` class based on `window.matchMedia('(prefers-color-scheme: dark)')`, and subscribes to `change` events on that media query so the class updates when the OS preference changes. The `$effect` cleanup function removes the listener.

This effect runs on the client only (Svelte 5 `$effect` does not run during SSR), so no `browser` guard is needed.

### 3. Keep `app.html` inline script unchanged

The existing inline script in `app.html` correctly prevents flash-of-unstyled-content on initial full page loads by reading the `theme` cookie before Svelte hydrates. It should remain as-is. The layout `$effect` will reconcile any differences on hydration and handle subsequent client-side navigations.

## Tasks

### Task 1 - Configure Tailwind v4 class-based dark mode

- `layout.css` contains `@import 'tailwindcss'` + `@custom-variant dark (&:where(.dark, .dark *));` + existing `@theme` block
  - → `dark:` utilities activate only when `dark` class is on an ancestor, not based on OS preference alone
- `dark:bg-stone-900` applied to an element inside `<html class="dark">`
  - → element has `background-color` matching the dark palette
- `dark:bg-stone-900` applied to an element inside `<html>` without `dark` class
  - → element does NOT have the dark background

### Task 2 - Add reactive theme effect to layout

- `+layout.svelte` contains a `$effect` that reads `data.theme`
- Theme set to `'dark'` + effect runs
  - → `document.documentElement.classList` contains `'dark'`
- Theme set to `'light'` + effect runs
  - → `document.documentElement.classList` does NOT contain `'dark'`
- Theme set to `'system'` + OS prefers dark + effect runs
  - → `document.documentElement.classList` contains `'dark'`
- Theme set to `'system'` + OS prefers light + effect runs
  - → `document.documentElement.classList` does NOT contain `'dark'`
- Theme set to `'system'` + OS preference changes from light to dark while page is open
  - → `document.documentElement.classList` gains `'dark'`
- Theme changes from `'dark'` to `'light'` (simulating settings save + redirect)
  - → `document.documentElement.classList` loses `'dark'`
- `$effect` cleanup removes the `matchMedia` change listener
  - → no memory leak when theme changes away from `'system'`

## Technical Context

- **Tailwind CSS 4.3.0** — uses `@custom-variant` directive (not `darkMode` config key from v3). The syntax `@custom-variant dark (&:where(.dark, .dark *));` is the v4 way to enable class-based dark mode.
- **Svelte 5.56.3** — uses `$effect` for side effects that react to prop changes. `$effect` does not run during SSR, so `document`/`window` access is safe without guards.
- **SvelteKit 2.64.0** — form actions with `throw redirect(303, ...)` are handled client-side by default; layout `data` is re-fetched and reactive after invalidation.

## Notes

- The `app.html` inline script and the layout `$effect` both write to `document.documentElement.classList`. They do not conflict: the inline script runs first (preventing FOUC), then the `$effect` reconciles on hydration and handles future changes.
- The `$effect` must return a cleanup function that removes the `matchMedia` `change` listener when the theme changes away from `'system'` or the component unmounts.