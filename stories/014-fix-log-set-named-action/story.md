# Fix Log Set form action conflict with named actions

## Context

Submitting the "Log Set" form on an exercise detail page (`POST /exercises/12`) returns a 500 error:

> When using named actions, the default action cannot be used.

The exercise detail `+page.server.ts` exports an `actions` object that defines **both** a `default` action (the "Log Set" handler) **and** a named action `saveComment`. SvelteKit forbids this combination: once any named action exists, a `default` action is not permitted. The "Log Set" `<form>` in `+page.svelte` has no `action` attribute, so it targets the `default` action, which triggers the error at request time.

This regression was introduced by story 013 (Session Comments), which added the `saveComment` named action alongside the pre-existing `default` action.

## Out of Scope

- No changes to the `saveComment` action or its form.
- No changes to `logSet` business logic in `$lib/server/workout-service.ts`.
- No changes to validation rules in `$lib/server/workout-validation.ts`.
- No changes to the `load` function.
- No changes to other routes (admin page uses a lone `default` action with no named actions, which is valid and unaffected).

## Implementation approach

Rename the `default` action to a named action `logSet` and point the "Log Set" form at it explicitly. This is the minimal change that satisfies SvelteKit's rule (no `default` when named actions exist) while keeping both actions as named actions for consistency.

### File: `src/routes/exercises/[id]/+page.server.ts`

- In the `actions` object, rename the `default` property to `logSet`. The function body, signature, and behavior stay identical — only the property key changes from `default` to `logSet`.

### File: `src/routes/exercises/[id]/+page.svelte`

- On the "Log Set" `<form>` (currently `<form method="POST" class="flex flex-col gap-4">`), add `action="?/logSet"` so it reads `<form method="POST" action="?/logSet" class="flex flex-col gap-4">`.
- The `saveComment` form already uses `action="?/saveComment"` and is unchanged.

### File: `src/routes/exercises/__tests__/detail/exercise-detail-page.test.ts`

- Add an assertion to the existing "should show add set form when no workout session for today" test (or a new test) that the log set form contains `action="?/logSet"`.
- Add an assertion that the log set form does **not** fall back to a bare `method="POST"` without an action attribute (i.e., the rendered HTML contains `action="?/logSet"` on the set-logging form).

### File: `src/routes/exercises/__tests__/detail/exercise-detail-comments-server.test.ts` (or a new `exercise-detail-logset-server.test.ts`)

- Add a server-side test that calls `page.actions.logSet` (the renamed action) with valid weight/reps formData and asserts it redirects to `/exercises/{id}` with status 303 and that a set row is inserted. This verifies the renamed action is exported and callable under its new name.
- Add a test that `page.actions.logSet` with invalid weight returns a 400 fail with the validation error.
- Add a test that `page.actions.logSet` redirects to `/login` when unauthenticated.
- Add a test that `page.actions.logSet` fails with "Exercise not found" for an exercise owned by another user.

The existing `saveComment` tests already call `page.actions.saveComment` and remain valid unchanged.

## Tasks

### Task 1 - Rename default action to named logSet action

- `+page.server.ts` actions object + import of `Actions` type
  - → `actions` object has a `logSet` property and no `default` property
  - → `page.actions.logSet` is a callable async function
  - → `page.actions.default` is `undefined`
- `+page.svelte` log set form
  - → rendered HTML contains `action="?/logSet"` on the set-logging form
  - → rendered HTML still contains `name="weight_kg"` and `name="repetitions"` inputs
  - → rendered HTML still contains the "Log Set" submit button

### Task 2 - logSet action behavior preserved after rename

- authenticated user + valid weight (e.g. "80") and reps (e.g. "10") submitted via `page.actions.logSet`
  - → throws redirect with status 303 and location `/exercises/{exerciseId}`
  - → a `set_entry` row is inserted with `weight_kg=80`, `repetitions=10`, `set_number=1`
- authenticated user + invalid weight (e.g. "0") submitted via `page.actions.logSet`
  - → returns `fail(400, { error: ... })` with a non-empty error string
  - → no `set_entry` row is inserted
- unauthenticated request (locals.user is null) submitted via `page.actions.logSet`
  - → throws redirect with status 303 and location `/login`
- request with an exercise id belonging to another user submitted via `page.actions.logSet`
  - → returns `fail(404, { error: 'Exercise not found' })`

### Task 3 - saveComment action unaffected

- existing `saveComment` tests in `exercise-detail-comments-server.test.ts`
  - → all pass unchanged (they call `page.actions.saveComment` which is still exported under the same name)

## Notes

- SvelteKit rule reference: https://svelte.dev/docs/kit/form-actions#named-actions — "If you have named actions, you cannot also have a default action."
- The admin route (`src/routes/admin/+page.server.ts`) uses only a `default` action with no named actions, which is valid and must not be touched.
- No new dependencies required.
