# Redesign UI Style — Modern & Personal Look

## Context

The app's functionality is complete, but the UI uses Tailwind's default blue-600 accent color, generic gray surfaces, the system font stack, and the Svelte logo favicon. Every page duplicates button, input, and card styling via inline utility classes with no shared components. The result is functional but generic — it lacks personality and visual cohesion.

This story replaces the default palette with a warm amber/orange primary color, introduces the Inter typeface via Google Fonts CDN, extracts repeated UI patterns into five reusable Svelte components (Button, Input, Card, Alert, Badge), redesigns every page surface, and swaps the favicon for a custom dumbbell icon that matches the gym theme.

## Out of Scope

- Adding, removing, or changing any server-side logic, API endpoints, or database schema.
- Adding new pages or routes — only restyling existing ones.
- Adding new i18n keys beyond `app.tagline` (EN: "Log your gym workouts", FI: "Kirjaa salitreenisi").
- Changing the PWA manifest structure — only updating `theme_color` and `background_color`.
- Offline font loading strategy — the app requires a network connection for data, so a CDN font link is acceptable.
- Editing or deleting workouts (still out of scope per product non-goals).

## Implementation approach

### Design system tokens (Tailwind v4 `@theme`)

Replace the default blue accent with an amber/orange palette and set Inter as the primary font. All tokens are defined once in `src/routes/layout.css` via Tailwind v4's `@theme` directive, making them available as `bg-primary-*`, `text-primary-*`, `font-sans`, etc. throughout every component and page.

Primary palette (amber scale, matching Tailwind's built-in amber values):

| Token | Value |
|---|---|
| `--color-primary-50` | `#fffbeb` |
| `--color-primary-100` | `#fef3c7` |
| `--color-primary-200` | `#fde68a` |
| `--color-primary-300` | `#fcd34d` |
| `--color-primary-400` | `#fbbf24` |
| `--color-primary-500` | `#f59e0b` |
| `--color-primary-600` | `#d97706` |
| `--color-primary-700` | `#b45309` |
| `--color-primary-800` | `#92400e` |
| `--color-primary-900` | `#78350f` |
| `--color-primary-950` | `#451a03` |

Font override:

| Token | Value |
|---|---|
| `--font-sans` | `'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |

Surface colors use Tailwind's built-in `stone` scale (warm gray) instead of `gray` (cool gray). No custom tokens needed — just switch class references from `gray-*` to `stone-*`.

### Inter font loading

Add a `<link>` tag in `src/app.html` `<head>` to load Inter (weights 400, 500, 600, 700) from Google Fonts with `display=swap`:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
```

### Reusable components

Five Svelte 5 components are created in `src/lib/components/`. Each uses `$props()` and `{@render children()}` (Svelte 5 snippet API). Components centralize styling so pages only specify content and layout.

**Button.svelte** — Renders `<a>` when `href` is provided, `<button>` otherwise.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Visual style |
| `href` | `string \| undefined` | `undefined` | If set, renders as `<a>` |
| `type` | `string` | `'button'` | HTML button type (ignored when `href` is set) |
| `children` | `Snippet` | required | Button content |

Variant classes:
- **primary**: `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900`
- **secondary**: `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-primary-600 px-6 py-3 font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-950`
- **ghost**: `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-3 font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800`

**Input.svelte** — Label + input + optional error message.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Label text |
| `name` | `string` | required | Input name attribute |
| `type` | `string` | `'text'` | Input type |
| `inputmode` | `string \| undefined` | `undefined` | Input inputmode |
| `value` | `string` | `$bindable('')` | Two-way bound value |
| `required` | `boolean` | `false` | HTML required attribute |
| `maxlength` | `number \| undefined` | `undefined` | Max length |
| `placeholder` | `string \| undefined` | `undefined` | Placeholder text |
| `error` | `string \| undefined` | `undefined` | Error message shown below input |

Input element classes: `min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-primary-500 dark:focus:ring-primary-500/20`

Label classes: `mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300`

Error classes: `mt-1 text-sm text-red-600 dark:text-red-400`

**Card.svelte** — Container with optional link behavior.

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` | `string \| undefined` | `undefined` | If set, renders as `<a>` |
| `children` | `Snippet` | required | Card content |

Card classes: `rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800`

When `href` is provided, adds `block` class and renders as `<a>`.

**Alert.svelte** — Error or success message banner.

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `'error' \| 'success'` | required | Alert style |
| `children` | `Snippet` | required | Alert content |

- **error**: `rounded-xl border-l-4 border-red-400 bg-red-50 p-4 text-red-700 dark:border-red-500 dark:bg-red-950/50 dark:text-red-300`
- **success**: `rounded-xl border-l-4 border-green-400 bg-green-50 p-4 text-green-700 dark:border-green-500 dark:bg-green-950/50 dark:text-green-300`

**Badge.svelte** — Small inline label for short names.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Snippet` | required | Badge content |

Badge classes: `ml-2 inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300`

### Page redesigns

Every page file is updated to use the new components and `stone`/`primary` tokens instead of `gray`/`blue`. The structural HTML and all i18n keys remain identical (except the new `app.tagline` key). All existing server-side logic and data flow are untouched.

**Layout** (`+layout.svelte`):
- Outer div: `min-h-screen bg-stone-50 font-sans text-stone-800 dark:bg-stone-900 dark:text-stone-100`
- Header: `bg-white shadow-sm dark:bg-stone-800` (replaces `border-b`)
- App name link: `text-xl font-bold text-primary-600 dark:text-primary-400`
- Nav links: ghost-style links with `text-stone-600 hover:text-primary-600 dark:text-stone-300 dark:hover:text-primary-400`
- Logout: `<Button variant="ghost">` inside a form
- Main: `mx-auto max-w-2xl px-4 py-8`

**Landing page** (`+page.svelte`):
- Centered hero with `py-20` spacing
- App name: `text-4xl font-bold text-primary-600 dark:text-primary-400`
- Tagline: `mt-2 text-lg text-stone-500 dark:text-stone-400` using new `app.tagline` key
- CTA buttons: `<Button variant="primary" href="/login">` and `<Button variant="secondary" href="/register">`

**Login page** (`login/+page.svelte`):
- Title: `mb-8 text-2xl font-bold text-stone-800 dark:text-stone-100`
- Form wrapped in `<Card>` with `max-w-md mx-auto`
- Inputs: `<Input>` components
- Submit: `<Button variant="primary" type="submit">`
- Error: `<Alert type="error">`
- Register link: `<Button variant="ghost" href="/register">`

**Register page** (`register/+page.svelte`):
- Same structure as login
- Field-level errors passed to `<Input error={...}>`
- Top-level error: `<Alert type="error">`

**Exercises list** (`exercises/+page.svelte`):
- Title + create button row: `mb-8 flex items-center justify-between`
- Create button: `<Button variant="primary" href="/exercises/new">`
- Empty state: `<Card>` with centered text and create link
- Exercise items: `<Card href="/exercises/{exercise.id}">` with exercise name + optional `<Badge>`
- Short name in parentheses replaced by `<Badge>` component

**Exercise detail** (`exercises/[id]/+page.svelte`):
- Back link: `<Button variant="ghost" href="/exercises">`
- Title: `mb-8 text-2xl font-bold`
- Today section: `<Card>` wrapping the form
- Weight/reps inputs: `<Input>` components side by side in `flex gap-4`
- Submit: `<Button variant="primary" type="submit">`
- Error: `<Alert type="error">`
- Today's sets: `<Card>` for each set with set number and weight × reps
- History section: date as `text-sm font-medium text-stone-500`, sets in `<Card>` items

**New exercise** (`exercises/new/+page.svelte`):
- Form wrapped in `<Card>` with `max-w-md`
- Inputs: `<Input>` components
- Submit: `<Button variant="primary" type="submit">`
- Error: `<Alert type="error">`
- Back link: `<Button variant="ghost" href="/exercises">`

**Settings** (`settings/+page.svelte`):
- Form wrapped in `<Card>` with `max-w-md`
- Success: `<Alert type="success">`
- Radio options styled with `accent-primary-600`
- Save button: `<Button variant="primary" type="submit">`

### Favicon

Replace `src/lib/assets/favicon.svg` with a custom dumbbell icon in primary-600 color (`#d97706`). The SVG uses a 100×100 viewBox with three rounded rectangles: two weight plates and a connecting bar.

### PWA manifest

Update `src/lib/pwa-manifest.ts`:
- `theme_color`: `'#d97706'` (was `'#2563eb'`)
- `background_color`: `'#fafaf9'` (stone-50, was `'#ffffff'`)

### i18n additions

Add one new key to both `en.json` and `fi.json`:
- `app.tagline`: `"Log your gym workouts"` / `"Kirjaa salitreenisi"`

## Tasks

### Task 1 — Design system foundation

Update `layout.css`, `app.html`, `pwa-manifest.ts`, and `favicon.svg` with the new design tokens, font, colors, and icon.

- `layout.css` contains `@theme` block with `--color-primary-50` through `--color-primary-950` matching the amber palette values listed above
- `layout.css` contains `--font-sans` override with Inter as the first font
- `app.html` `<head>` contains a `<link>` tag loading Inter (weights 400, 500, 600, 700) from `fonts.googleapis.com` with `display=swap`
- `pwa-manifest.ts` `theme_color` is `'#d97706'`
- `pwa-manifest.ts` `background_color` is `'#fafaf9'`
- `favicon.svg` contains three `<rect>` elements forming a dumbbell shape (two weight plates + one bar) with `fill="#d97706"` or `fill="#b45309"`

### Task 2 — Reusable UI components

Create five Svelte 5 components in `src/lib/components/` with the APIs described in the implementation approach. Each component must use `$props()` and `{@render children()}`.

- Button renders `<a>` element when `href` prop is provided + `children` text is present in output
  - → output contains `href` attribute with the provided value
  - → output contains `bg-primary-600` class (primary variant default)
- Button renders `<button>` element when `href` prop is omitted + `children` text is present
  - → output contains `bg-primary-600` class
  - → output contains `type="button"` by default
- Button with `variant="secondary"` renders
  - → output contains `border-primary-600` class
- Button with `variant="ghost"` renders
  - → output contains `text-stone-600` class
- Input renders label text and `<input>` element with the provided `name` attribute
  - → output contains the label text
  - → output contains `name="weight_kg"` when `name="weight_kg"` is passed
- Input with `error` prop renders
  - → output contains the error message text
  - → output contains `text-red-600` class on the error element
- Card renders `<div>` by default with `children` content
  - → output contains `rounded-xl` class
  - → output contains children text
- Card with `href` prop renders `<a>` element
  - → output contains `href` attribute with the provided value
- Alert with `type="error"` renders
  - → output contains `border-red-400` class
  - → output contains children text
- Alert with `type="success"` renders
  - → output contains `border-green-400` class
- Badge renders children text
  - → output contains `rounded-md` class
  - → output contains `bg-primary-50` class

### Task 3 — Layout and navigation redesign

Update `+layout.svelte` to use the new design tokens and components.

- Layout renders with `bg-stone-50` class on the outer div
- Layout renders with `dark:bg-stone-900` class on the outer div
- Layout renders with `font-sans` class on the outer div
- Header renders with `shadow-sm` class (no `border-b`)
- App name renders with `text-primary-600` class
- Nav links render with `text-stone-600` class
- Logout button renders as a `<Button variant="ghost">` component

### Task 4 — Landing and auth pages redesign

Update `+page.svelte` (landing), `login/+page.svelte`, and `register/+page.svelte`.

- Landing page renders `app.tagline` i18n key text
- Landing page renders login Button with `variant="primary"` and `href="/login"`
- Landing page renders register Button with `variant="secondary"` and `href="/register"`
- Login page renders Input components for username and password
- Login page renders submit Button with `variant="primary"`
- Login page renders error Alert with `type="error"` when `form?.error` is present
- Register page renders Input components for username and password
- Register page renders field-level error text when `form?.field === 'username'` and `form?.error` is present
- Register page renders submit Button with `variant="primary"`

### Task 5 — Exercise pages redesign

Update `exercises/+page.svelte`, `exercises/new/+page.svelte`, and `exercises/[id]/+page.svelte`.

- Exercises list page renders "Create Exercise" Button with `variant="primary"` and `href="/exercises/new"`
- Exercises list page renders each exercise as a Card component with `href="/exercises/{id}"`
- Exercises list page renders exercise short_name inside a Badge component (when short_name is not null)
  - Note: the Badge replaces the previous parenthetical format `(BP)` with just `BP` inside a styled badge element. The existing test asserting `'(BP)'` must be updated to assert `'BP'` instead.
- New exercise page renders Input components for name, short_name, and display_order
- New exercise page renders submit Button with `variant="primary"`
- New exercise page renders back Button with `variant="ghost"` and `href="/exercises"`
- Exercise detail page renders back Button with `variant="ghost"` and `href="/exercises"`
- Exercise detail page renders weight and reps Input components
- Exercise detail page renders submit Button with `variant="primary"`
- Exercise detail page renders today's sets as Card components
- Exercise detail page renders error Alert with `type="error"` when `form?.error` is present

### Task 6 — Settings page redesign

Update `settings/+page.svelte`.

- Settings page renders success Alert with `type="success"` when `saved` is true
- Settings page renders save Button with `variant="primary"`
- Settings page renders radio inputs with `accent-primary-600` class

### Task 7 — i18n additions

Add `app.tagline` key to both translation files.

- `en.json` contains `"app.tagline": "Log your gym workouts"`
- `fi.json` contains `"app.tagline": "Kirjaa salitreenisi"`

## Technical Context

- **SvelteKit 2.63.1** with **Svelte 5.56.3** — components use `$props()`, `$state()`, `$derived()`, `$bindable()`, and `{@render children()}` snippet API.
- **Tailwind CSS 4.3.0** with `@tailwindcss/vite 4.3.0` — uses CSS-first `@theme` configuration (no `tailwind.config.js`). Custom tokens are defined in `src/routes/layout.css`.
- **Inter font** — loaded via Google Fonts CDN (`fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`). The app requires a network connection for workout data, so a CDN font is acceptable.
- **Existing tests** use `render()` from `svelte/server` and check text content / href attributes. They do not assert CSS classes. After the redesign, all existing tests must still pass because text content and structural HTML remain the same.
- **Component testing** — new component tests follow the same `render()` from `svelte/server` pattern. Svelte 5 snippet props (`children`) are passed using `createRawSnippet` imported from `svelte`: `createRawSnippet(() => ({ render: () => 'Click me' }))`. The exact API should be verified against the Svelte 5.56.3 source during implementation.
- **PWA manifest** — `src/lib/pwa-manifest.ts` exports a plain object; only `theme_color` and `background_color` values change.

## Notes

- The `min-h-[44px]` and `min-w-[44px]` touch-target sizes are preserved in all interactive elements for mobile accessibility.
- Dark mode support is maintained throughout — every new class has a `dark:` variant where the original had one, and `stone` replaces `gray` in both modes.
- The existing `app.name` i18n key ("Punttikuuri") remains unchanged. The new `app.tagline` key provides a descriptive subtitle for the landing page only.
- The Badge component replaces the previous parenthetical short_name format `(BP)` with just `BP` inside a styled badge. The existing exercises page test that asserts `'(BP)'` must be updated to assert `'BP'` instead.
- The favicon SVG uses `fill` attributes (not CSS) so it renders correctly in all browsers and as a PWA icon.
- No new npm dependencies are added — all styling uses Tailwind CSS v4 utilities and custom `@theme` tokens.