# Move "Oletus" Caption Above Icon Picker Default Tile

## Context

The exercise icon picker (added in story 022) renders the first/default tile with a visible caption "Oletus" (fi) / "Default" (en) below the icon. The extra caption line makes the first tile taller than every other tile, and because the grid stretches row items, the icons in the first row end up misaligned with each other (see user screenshot). The caption text itself is wanted — the fix is to move it above the icon and bottom-align the grid so all 44px icon tiles line up while the caption stays visible.

## Out of Scope

- Changing the default-option behavior: the radio keeps `value=""` and still resolves to the kind default (dumbbell for strength, running figure for cardio).
- Changing selection/focus styling of the tiles (`peer-checked` tile styles stay as-is).
- Changing the caption text or removing the `exercises.iconDefault` translation keys — the caption stays visible and the `aria-label` stays.
- Any other labels or tiles in the picker grid.

## Implementation approach

Current structure in `src/lib/components/IconPicker.svelte`:

- Grid container (line 28): `<div class="grid grid-cols-6 gap-2">` — default `align-items: stretch`, so the tall default tile stretches the whole first row and centers the other tiles' icons at a different vertical position.
- Every tile is a `<label class="flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1">`; the icon itself sits in a span with `tileClasses` (line 23) which is fixed `h-11 w-11` (44px).
- Default tile (lines 29-42): `sr-only` radio with `aria-label={t('exercises.iconDefault', locale)}` (line 36), icon span (line 38), then the visible caption span `<span class="text-xs text-stone-500 dark:text-stone-400">{t('exercises.iconDefault', locale)}</span>` (lines 39-41).

Changes:

1. In the default tile's label, move the caption span (lines 39-41) to render before the icon span (line 38). The label's last child becomes the 44px icon span.
2. Add `items-end` to the grid container (line 28). With `align-items: end`, tiles no longer stretch: non-default labels size to their 44px icon span and sit at the row bottom; the default label (caption + `gap-1` + icon span) also sits at the row bottom, so its icon span's bottom edge — and therefore the icon — aligns with every other icon. The caption occupies the extra height at the top of the first row inside the grid box (no overflow, since the row grows to fit the tallest tile).
3. Keep the radio's `aria-label={t('exercises.iconDefault', locale)}` and the `exercises.iconDefault` keys in `src/lib/i18n/en.json:38` / `src/lib/i18n/fi.json:38` unchanged. The existing assertion in `src/routes/exercises/new/__tests__/new-exercise-page.svelte.test.ts:36` (`aria-label` equals `'Default'`) keeps passing.
4. Leave `min-h-[44px]`, `gap-1`, and `justify-center` on the labels untouched — with the caption above the icon they are inert or match the tile touch target; minimal diff.
5. Add regression tests in `src/routes/exercises/new/__tests__/new-exercise-page.svelte.test.ts` (the file that already renders the page via `render(NewExercisePage, { props: { data: makeData(), form: null } })`, where `makeData()` supplies `data.locale`; fi-locale rendering is an established pattern — see `src/routes/settings/__tests__/settings-page.test.ts:72`): assert the caption still renders, appears before the icon in DOM order inside the default tile's label, and that the grid container carries the `items-end` class.

## Tasks

### Task 1 - Move the default-tile caption above the icon and bottom-align the grid

- new exercise page rendered (en locale), icon picker visible
  - → the caption text "Default" is still rendered inside the default tile's `<label>`
  - → within that label, the caption span precedes the icon span (the label's first visible child is the caption; its text starts with "Default")
  - → the default radio input still exists with `value=""` and `aria-label="Default"`
- new exercise page rendered (fi locale), icon picker visible
  - → the caption text "Oletus" is rendered above the default tile's icon (same DOM-order assertion)
- icon picker grid container
  - → its class list includes `items-end` (the alignment mechanism is pinned by the test)
- existing icon picker tests (default radio selection, submitting the form with the default option selected, `aria-label === 'Default'` at `new-exercise-page.svelte.test.ts:36`)
  - → all pass unchanged

## Technical Context

- Formatter/linter: Prettier + ESLint. Check with `npm run lint` (`prettier --check . && eslint .`), fix with `npm run format` (`prettier --write .`).
- Tests: `npm test` (`npm run test:unit -- --run`, Vitest + Svelte component tests).
- `t('exercises.iconDefault', locale)` is the i18n call pattern used throughout; `locale` is derived from the page's `data` prop (`src/routes/exercises/new/+page.svelte:12`).
- Tailwind CSS utility classes are used directly in markup; `h-11` = 44px, `gap-1` = 4px, `gap-2` = 8px.

## Notes

- Icon alignment is ultimately a visual property; the automated proxies are the DOM-order assertion (caption before icon) plus the `items-end` grid class. A quick visual check that the first row's icons line up and the caption sits above the default tile without colliding with the "Ikoni" field label is a nice-to-have, not a test requirement.
- The selected default tile's amber border comes from `peer-checked` tile styles and is unaffected by reordering the caption.
