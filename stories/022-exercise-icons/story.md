# Exercise Icons

## Context

The long-term goal is a monthly calendar view of completed workouts. The first step is giving every exercise a recognizable icon: strength exercises default to a strength icon, cardio exercises default to a cardio icon, and the user can override the default with a more specific icon when creating an exercise. Icons come from Tabler Icons (MIT), which is already the de-facto source of the app's iconography — `src/lib/components/icons/EditIcon.svelte:1-14` is a verbatim Tabler outline icon (`pencil`), same `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, round caps/joins.

This step covers assignment at creation time and display in the exercise list and exercise detail header. The data model, registry, and picker component are deliberately built so that a later "edit exercise" story only needs a new form action — no schema or component changes.

## Out of Scope

- The monthly calendar view itself (later story).
- Editing the icon of an existing exercise (no edit-exercise action exists today — `src/routes/exercises/[id]/+page.server.ts:288` has only set/cardio actions — and "Editing exercises" remains a product Non-Goal). This story only makes that later addition cheap.
- Custom/user-uploaded icons, emoji, or icon search.
- Per-set or per-cardio-entry icons.
- Backfilling existing exercise rows (they keep `icon = NULL` and resolve to the kind default at render time).
- A DB check constraint on `icon` values (see Implementation approach).

## Implementation approach

### 1. Icon registry — `src/lib/icons/exercise-icons.ts` (new)

Single source of truth, shared by the picker, both display sites, and the future calendar.

```ts
export const STRENGTH_DEFAULT_ICON = 'dumbbell';
export const CARDIO_DEFAULT_ICON = 'run';

// id -> inner SVG markup (children of a Tabler outline <svg>, copied verbatim)
export const EXERCISE_ICONS = { dumbbell: '<path d="..."/>', ... } as const;
export type ExerciseIconId = keyof typeof EXERCISE_ICONS;

export function isExerciseIconId(value: unknown): value is ExerciseIconId;
export function resolveExerciseIcon(
	kind: 'strength' | 'cardio',
	icon: string | null
): ExerciseIconId;
```

Rules, stated explicitly:

- `resolveExerciseIcon` predicate: `isExerciseIconId(icon) ? icon : (kind === 'cardio' ? CARDIO_DEFAULT_ICON : STRENGTH_DEFAULT_ICON)`. An explicit icon always wins, regardless of kind (a cardio exercise may legitimately use `dumbbell`). `null`, `''`, and unknown strings all fall through to the kind default.
- `isExerciseIconId(value)`: `typeof value === 'string' && Object.hasOwn(EXERCISE_ICONS, value)`. This is the allowlist used by server validation.
- SVG data is fetched from Tabler 3.49.0 and vendored: `curl -s https://unpkg.com/@tabler/icons@3.49.0/icons/outline/<id>.svg`, strip the outer `<svg …>` wrapper, keep the inner elements verbatim (do not simplify paths; some icons contain multiple `<path>`/`<circle>` elements). File header comment must carry attribution: `Icons from Tabler Icons v3.49.0 (https://tabler.io/icons), MIT licensed.`
- Adding an icon later = one registry entry + two i18n keys. No migration, no component change.

Curated set (34 ids, all verified present in `@tabler/icons@3.49.0/icons/outline/`):

- Strength: `dumbbell`, `barbell`, `weight`, `bolt`, `flame`, `target`, `trophy`, `medal`
- Cardio: `run`, `run-sprint`, `walk`, `bike`, `swimming`, `pool`, `jump-rope`, `heart`, `activity`, `stopwatch`, `mountain`, `snowboarding`, `jetski`, `kayak`
- Sport: `ball-tennis`, `ball-basketball`, `ball-football`, `golf`, `disc-golf`, `archery-arrow`
- General: `stretching`, `yoga`, `star`, `flag`, `sun`, `moon`

### 2. Icon renderer — `src/lib/components/ExerciseIcon.svelte` (new)

```svelte
props: { id: ExerciseIconId; class?: string /* destructure as `class: klass`, default 'h-5 w-5' */ }
<svg xmlns viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
     data-icon={id} class={klass}>{@html EXERCISE_ICONS[id]}</svg>
```

- Mirrors `EditIcon.svelte` conventions exactly, plus `data-icon={id}` as the test hook. Svelte 5 runes: `let { id, class: klass = 'h-5 w-5' }: { id: ExerciseIconId; class?: string } = $props();` — `class` is a normal prop in Svelte 5, renamed on destructure.
- `{@html}` is safe here and must not be widened: the markup is developer-authored compile-time constants keyed by id; the only user-controlled input is the id, which is validated against the registry allowlist before it reaches the DB (`+page.server.ts`) and again at render time via `resolveExerciseIcon`. Never pass a raw DB value into `id` — always pass the result of `resolveExerciseIcon`.
- No runtime fallback branch: TypeScript plus `resolveExerciseIcon` guarantee a valid id.

### 3. Schema — `src/lib/server/db/schema.ts`

Add one nullable column to `exerciseType`, mirroring the nullable `short_name` column (`kind` itself is at `schema.ts:37`):

```ts
icon: text('icon'), // no .notNull(), no default, no enum
```

- Deliberately **no** DB check constraint / drizzle `enum` on `icon`: the value set is an app-layer registry that will grow (and later feed the calendar); a DB constraint would force a migration per icon. The allowlist in `isExerciseIconId` is enforced in the form action instead.
- Migration: run `npm run db:generate` (drizzle-kit 0.31.10, config `drizzle.config.ts`, out `./drizzle`, journal `drizzle/meta/_journal.json`). Expected SQL: `ALTER TABLE "exercise_type" ADD "icon" text;` — a nullable add-column, safe on existing rows (they become `NULL` → kind default). Apply with `npm run db:migrate`.

### 4. Create form — `src/routes/exercises/new/+page.server.ts`

The action reads fields via `formData.get(...)` (lines 17-21) and every `fail(400, …)` currently echoes only `{ error }` (lines 25, 30, 35, 42). Parse the icon immediately after the existing field reads (after line 21), before any validation:

```ts
const iconStr = String(formData.get('icon') ?? '').trim();
let icon: ExerciseIconId | null = null;
if (iconStr !== '') {
	if (!isExerciseIconId(iconStr)) {
		return fail(400, { error: t('exercises.iconInvalid', locals.locale) });
	}
	icon = iconStr;
}
```

- Add `icon` to the `db.insert(exerciseType).values({ … })` column list (currently `user_id, name, short_name, display_order, kind, created_at` at lines 48-53).
- Empty string / missing field → store `NULL` (means "kind default"). No kind↔icon compatibility rule: any registry icon is valid for any kind.
- Echo the selection on failure: change the three pre-existing `fail(400, { error: … })` payloads (name, short name, kind) and the display-order one to `fail(400, { error: …, icon: iconStr })`, so a 34-tile selection survives a re-render caused by an unrelated field error. The page seeds its bound picker state from it (`$state(form?.icon ?? '')`).
- `t()` is already used server-side in this route family (`validateExerciseKind(kindStr, locals.locale)` at line 33 takes `locals.locale`); import `t` from `$lib/i18n` in this file if not already imported.

### 5. Picker UI — `src/lib/components/IconPicker.svelte` (new, reusable)

Props: `{ name?: string = 'icon'; value = $bindable(''); locale: Locale; defaultIconId: ExerciseIconId }`. Radios use `bind:group={value}` — the same pattern the page already uses for the kind selector (`new/+page.svelte:66,75`), so no uncontrolled/controlled ambiguity and no client JS.

- `<fieldset>` + `<legend>{t('exercises.icon', locale)}</legend>`, then a `grid grid-cols-6 gap-2` of tiles.
- First tile: `<input type="radio" {name} value="" bind:group={value}>` labelled `t('exercises.iconDefault', locale)`, showing `<ExerciseIcon id={defaultIconId} />` as the live preview of what "Default" resolves to.
- One tile per registry id: `<input type="radio" {name} value={id} class="peer sr-only" bind:group={value} aria-label={t('icons.' + id, locale)}>` wrapped in a `<label>` with the icon; selected state via `peer-checked:` ring classes using the existing `primary-500`/`primary-600` tokens (`src/routes/layout.css` `@theme`).
- Pure form radios — no client JS, works with the existing plain `method="POST"` progressive-enhancement form, and the selection survives re-render after a validation failure because the page seeds the bound state from `form?.icon`.
- Reusability requirement for the future edit story: the component must not import anything route-specific; the caller supplies `defaultIconId` (in `/exercises/new` this is `$derived(kind === 'cardio' ? CARDIO_DEFAULT_ICON : STRENGTH_DEFAULT_ICON)` off the existing `kind` `$state` at `new/+page.svelte:16`, so the preview updates reactively with no extra code).

Mount it in `src/routes/exercises/new/+page.svelte` immediately after the kind `<fieldset>` (ends line 80), before the submit `<Button>`: `let icon = $state(form?.icon ?? '')` (mirrors the existing `let kind = $state('strength')` style) and `<IconPicker bind:value={icon} {locale} defaultIconId={defaultIconId} />`.

### 6. Display

- Exercise list (`src/routes/exercises/+page.svelte:39-51`): inside the `<Card href>`, before `<span class="font-medium">{exercise.name}</span>`, insert
  `<span class="mr-2 inline-flex align-middle text-stone-500 dark:text-stone-400"><ExerciseIcon id={resolveExerciseIcon(exercise.kind, exercise.icon)} /></span>`.
  The list load already uses `db.select().from(exerciseType)` (`+page.server.ts:6`), so `icon` arrives with no load change.
- Exercise detail header (`src/routes/exercises/[id]/+page.svelte:159`): replace the bare `<h1 class="mb-8 text-2xl font-bold">{exercise.name}</h1>` with
  `<div class="mb-8 flex items-center gap-3"><span class="text-stone-500 dark:text-stone-400"><ExerciseIcon id={resolveExerciseIcon(exercise.kind, exercise.icon)} class="h-7 w-7" /></span><h1 class="text-2xl font-bold">{exercise.name}</h1></div>`.
- Icons are decorative next to the name → `aria-hidden="true"` (already on `ExerciseIcon`).

### 7. i18n — `src/lib/i18n/en.json` + `fi.json`

`t()` falls back to the raw key when missing (`src/lib/i18n/index.ts:9-12`) and there is no key-parity test, so both files must be updated together. New keys:

- `exercises.icon` — "Icon" / "Ikoni"
- `exercises.iconDefault` — "Default" / "Oletus"
- `exercises.iconInvalid` — "Invalid icon selected" / "Valittu ikoni on virheellinen"
- `icons.<id>` for all 34 ids. EN: Dumbbell, Barbell, Weight, Bolt, Flame, Target, Trophy, Medal, Run, Sprint, Walk, Bike, Swimming, Pool, Jump rope, Heart, Activity, Stopwatch, Mountain, Snowboarding, Jetski, Kayak, Tennis, Basketball, Football, Golf, Disc golf, Archery, Stretching, Yoga, Star, Flag, Sun, Moon.
- FI: Kierrepainot, Levytanko, Painot, Salama, Liekki, Tavoite, Pokaali, Mitali, Juoksu, Sprintti, Kävely, Pyöräily, Uinti, Allas, Hyppynaru, Syke, Aktiivisuus, Sekuntikello, Vuori, Lautailu, Jetski, Kajakki, Tennis, Koripallo, Jalkapallo, Golf, Discgolf, Jousiammunta, Venyttely, Jooga, Tähti, Lippu, Aurinko, Kuu.

## Tasks

### Task 1 - Icon registry and default resolution

- `resolveExerciseIcon('strength', null)` called
  - → returns `'dumbbell'`
- `resolveExerciseIcon('cardio', null)` called
  - → returns `'run'`
- `resolveExerciseIcon('strength', 'bike')` called
  - → returns `'bike'` (explicit icon wins over kind default)
- `resolveExerciseIcon('cardio', 'dumbbell')` called
  - → returns `'dumbbell'` (cross-kind override allowed)
- `resolveExerciseIcon('cardio', 'not-an-icon')` and `resolveExerciseIcon('cardio', '')` called
  - → both return `'run'` (unknown/empty fall through to kind default)
- `isExerciseIconId` called with `'dumbbell'`, `'DUMBBELL'`, `''`, `'<script>'`, `undefined`, `'__proto__'`
  - → `true` only for `'dumbbell'`; `false` for all others
- `EXERCISE_ICONS` iterated
  - → exactly the 34 ids listed in Implementation approach, each value a non-empty SVG fragment string
- `EXERCISE_ICONS` iterated, for each id `t('icons.' + id, 'en')` and `t('icons.' + id, 'fi')` evaluated
  - → neither equals the key itself (label present in both `en.json` and `fi.json`)

### Task 2 - Nullable icon column and migration

- Exercise inserted without an `icon` value
  - → row persists with `icon` = `null`
- Exercise inserted with `icon = 'bike'`
  - → row persists with `icon` = `'bike'`
- Exercise inserted with `icon = 'dumbbell'` and `kind = 'cardio'`
  - → insert succeeds (no kind↔icon constraint)
- Newly generated migration SQL file under `drizzle/` read from disk after `npm run db:generate`
  - → contains `ALTER TABLE "exercise_type" ADD "icon" text` and no `NOT NULL`, `DEFAULT`, or `CHECK` on that column
- `PRAGMA table_info(exercise_type)` against a database migrated through the full `./drizzle` journal (same drizzle-kit migrator pattern as `migrate.js`)
  - → `icon` column present with `notnull = 0` and `dflt_value = null`
- Exercise row inserted through the pre-migration schema, then migrations applied
  - → that row's `icon` reads back as `null`, no error

### Task 3 - Create-exercise form: picker and validation

- Valid name + kind `strength` + icon radio `bike` selected + form submitted
  - → 303 redirect; stored exercise has `icon = 'bike'`
- Valid name + no icon tile selected (default tile, `value=""`) + form submitted
  - → 303 redirect; stored exercise has `icon = null`
- Valid name + `icon` field omitted entirely from the POST body + form submitted
  - → 303 redirect; stored exercise has `icon = null`
- Valid name + `icon = 'not-an-icon'` + form submitted
  - → `fail(400)`; error message is the `exercises.iconInvalid` translation; no exercise row created
- Valid name + `icon = '<script>alert(1)</script>'` + form submitted
  - → `fail(400)` with the same error; no exercise row created
- Invalid name + `icon = 'bike'` + form submitted
  - → 400; re-rendered form still has the `bike` radio tile checked (`form.icon` round-trips)
- `/exercises/new` rendered
  - → 34 icon radio inputs plus one `value=""` default radio, each icon radio carries `aria-label` from `icons.<id>`
- `/exercises/new` rendered with kind `strength` selected, then kind switched to `cardio`
  - → default tile preview `data-icon` changes from `dumbbell` to `run`

### Task 4 - Display in list and detail header

- Exercise list rendered for a strength exercise with `icon = null`
  - → row contains `svg[data-icon="dumbbell"]`
- Exercise list rendered for a cardio exercise with `icon = null`
  - → row contains `svg[data-icon="run"]`
- Exercise list rendered for a cardio exercise with `icon = 'swimming'`
  - → row contains `svg[data-icon="swimming"]` and no `run` icon for that row
- Exercise list rendered for an exercise with `icon = 'not-an-icon'` in the DB (legacy/tampered row)
  - → row renders the kind default icon; no crash, no raw value injected
- Exercise detail page rendered for an exercise with `icon = 'trophy'`
  - → header contains `svg[data-icon="trophy"]` next to the `<h1>` with the exercise name
- `ExerciseIcon` rendered with any valid id
  - → `<svg>` has `aria-hidden="true"`, `stroke="currentColor"`, `viewBox="0 0 24 24"`, and `data-icon` equal to the id

## Technical Context

- No new npm dependencies. Tabler SVGs are vendored as string constants; `@tabler/icons` is **not** added to `package.json`.
- Tabler Icons **3.49.0** (MIT), verified live via `npm view @tabler/icons version`; per-icon source `https://unpkg.com/@tabler/icons@3.49.0/icons/outline/<id>.svg`. (Lucide 1.54.0 was considered and rejected: ISC-licensed but far fewer sport/exercise glyphs.)
- Stack versions from `package.json`: Svelte 5.56.3 (runes: `$props`, `$state`, `$derived`), `@sveltejs/kit` ^2.70.3, `drizzle-orm` 0.45.2 / `drizzle-kit` 0.31.10 (sqlite via `better-sqlite3` 12.10.0), Tailwind CSS 4.3.0 (tokens in `src/routes/layout.css` `@theme`: `--color-primary-*`; muted text uses `text-stone-500 dark:text-stone-400`), TypeScript ^6.0.2 `strict: true`, vitest 4.1.8.
- Tests: `npm run test` (`vitest --run`). Two projects (`vite.config.ts`): `server` (node env, `src/**/*.{test,spec}.{js,ts}`) and `browser` (jsdom, `src/**/*.svelte.{test,spec}.{js,ts}`, setup `src/test-setup.ts`). `expect.requireAssertions: true` is on — every test must assert. Server tests use in-memory sqlite (`new Database(':memory:')`, see `src/routes/exercises/new/__tests__/new-exercise-server.test.ts:67`), `createTestDb` from `src/lib/server/db/__tests__/test-utils.ts:27`, `registerUser` from `src/lib/server/auth.ts:114`, and invoke actions directly via `page.actions.default(mockEvent(fields))` (line 97).
- DB workflow: `npm run db:generate` then `npm run db:migrate` (dev DB `./data/punttikuuri.db` per `drizzle.config.ts`).
- Format/lint: `npm run format` (prettier --write, tabs, single quotes, printWidth 100, `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`), `npm run lint` (prettier --check + eslint), `npm run check` (svelte-check).

## Notes

- The Finnish icon labels above are proposed translations for a bilingual UI; the user should review wording (e.g. `Levytanko` for barbell, `Salama` for bolt) — trivial string edits, no logic impact.
- Icon tiles are 44px-friendly touch targets to match the app's existing `min-h-[44px]` control sizing; the 6-column grid wraps gracefully on the mobile-first layout.
- Future "edit exercise" story reuses everything here: a new named form action calling `isExerciseIconId` + `update(exerciseType).set({ icon })`, and the same `IconPicker` component with `name="icon"`. Nothing in this story needs to change.
- Future calendar story consumes `resolveExerciseIcon(kind, icon)` — the single resolution point keeps calendar and list consistent.
- `data-icon` on the rendered `<svg>` is the stable test/automation hook; keep it.
- Manual (non-automatable) check: icons look visually balanced at `h-5 w-5` in list rows and `h-7 w-7` in the detail header, in both light and dark themes.
