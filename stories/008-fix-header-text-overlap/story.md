# Fix Finnish Header Text Overlap on Mobile

## Context

On narrow mobile screens, the header in `+layout.svelte` overlaps when the UI language is Finnish. The header uses `flex justify-between` to place the app name ("Punttikuuri", 11 chars) on the left and navigation links on the right. Finnish nav labels are significantly longer than their English counterparts — "Harjoitukset" vs "Exercises", "Asetukset" vs "Settings", "Kirjaudu ulos" vs "Logout" — causing the two sides to collide. The English layout fits comfortably on mobile; only Finnish overflows.

## Out of Scope

- Changing or shortening Finnish translation strings
- Adding a hamburger menu or mobile drawer navigation
- Modifying any page content below the header
- Changing the Button component styling

## Implementation approach

Make the header responsive using Tailwind utility classes so it stacks vertically on narrow viewports and remains horizontal on wider ones.

**Current markup** (`+layout.svelte` line 43):

```html
<div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3"></div>
```

**Updated markup:**

```html
<div
	class="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 py-3 sm:flex-row sm:justify-between sm:gap-0"
></div>
```

Key changes:

- `flex-col` — stacks app name above nav on mobile
- `items-center` — centers both rows horizontally on mobile (already present, kept)
- `gap-2` — adds vertical spacing between the two rows on mobile
- `sm:flex-row` — restores horizontal layout at `sm` breakpoint (640 px) and above
- `sm:justify-between` — restores space-between alignment at `sm` and above
- `sm:gap-0` — removes the vertical gap at `sm` and above since items are side-by-side

The `sm` breakpoint (640 px) is chosen because the English layout fits comfortably at that width, and the Finnish layout fits at 640 px in a horizontal arrangement with the reduced gap. This matches Tailwind's built-in `sm` breakpoint — no custom configuration needed.

No CSS file changes are required; all changes are Tailwind utility classes in the template.

## Tasks

### Task 1 - Make header responsive

- Header rendered with Finnish locale on viewport < 640 px
  - → App name and nav stack vertically (app name above, nav below)
  - → Both rows are horizontally centered
  - → No text overlap between app name and nav items
- Header rendered with Finnish locale on viewport ≥ 640 px
  - → App name and nav display side-by-side (same as current desktop layout)
  - → `justify-between` alignment is preserved
- Header rendered with English locale on any viewport
  - → Layout is identical to the current layout (no visual regression)
- Header rendered when user is not logged in (Login / Register links)
  - → Same responsive stacking behavior on mobile
  - → Same horizontal layout on desktop

## Technical Context

- Tailwind CSS 4.3.0 — `sm:` variant targets `min-width: 640px`; `flex-col` / `flex-row` and `gap-*` utilities are built-in, no plugin needed.
- SvelteKit 2.64.0, Svelte 5.56.3 — no framework changes required.
- No new dependencies.

## Notes

- The `sm` breakpoint (640 px) is sufficient because the longest Finnish nav combination ("Punttikuuri" + "Harjoitukset" + "Asetukset" + "Kirjaudu ulos" button) fits horizontally at 640 px with the current `gap-4` and padding.
- The `gap-2` on mobile provides 8 px of vertical space between the app name and nav, matching the visual rhythm of the existing `py-3` padding.
- On very narrow screens (≤ 320 px), the three Finnish nav items may still be too wide for a single row within the nav element. This is out of scope for this story since the reported overlap is between the app name and the nav, not within the nav itself. If needed, `flex-wrap` on the `<nav>` can be added in a follow-up.
