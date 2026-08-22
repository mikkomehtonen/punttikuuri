# Edit Set Values in Current Exercise Session

## Context

Users occasionally enter a set with incorrect weight or repetitions for the current workout session and need a way to correct it. Deletion exists, but editing preserves the set number and history. The feature allows editing weight and repetitions for sets in the currently selected exercise session only, with validation matching logSet. The UI replaces the single Delete text button with two icon buttons: trashcan for delete and pencil for edit.

## Out of Scope

- Editing sets from historical sessions; history remains read-only.
- Changing set_number; set number is immutable.
- Deleting entire workout sessions or exercise types.
- Renumbering sets on edit.
- Editing session comment via this feature.

## Implementation approach

- Add a named SvelteKit action `editSet` in `src/routes/exercises/[id]/+page.server.ts`. Action receives `workout_date`, `set_number`, `weight_kg`, `repetitions` from form.
- Ownership check uses existing `getOwnedExerciseId`. Date validation uses `validateWorkoutDate`.
- Find workout session for user, exercise, date. If not found, return 400 with `workout.noSetsForDate`.
- Validate set_number is positive integer; if not, return 400 with `workout.invalidSetNumber`.
- Validate weight with `validateWeight`, repetitions with `validateReps`. Return 400 with validation messages on failure.
- Find set entry matching session id and set_number. If not found, return 400 with `workout.invalidSetNumber`.
- Update `set_entry` row setting `weight_kg` and `repetitions`.
- On success, redirect 303 to `/exercises/{id}?date={workout_date}`.
- Client UI: In selected date set list, render edit and delete buttons per set. Edit button uses pencil icon, delete uses trashcan icon, both variant ghost.
- Clicking edit opens a modal with two inputs pre-filled with current weight and repetitions. Inputs use same validation as logSet. Save submits to `?/editSet` with hidden `workout_date` and `set_number` plus weight and reps. Cancel closes modal without submission.
- Add i18n keys `workout.edit` in en.json and fi.json. Use existing `workout.cancel` and `workout.confirm` for modal actions.
- History set cards remain display-only with no edit/delete buttons.

## Tasks

### Task 1 - Server editSet action with validation

- valid session + valid set_number + valid weight + valid reps + valid workout_date + user owns exercise + action submitted
  - → set entry updated with new weight_kg and repetitions
  - → redirect 303 to `/exercises/{id}?date={workout_date}`
- invalid weight + action submitted
  - → 400 error with weight validation message
  - → no database changes
- invalid reps + action submitted
  - → 400 error with reps validation message
  - → no database changes
- invalid set_number + action submitted
  - → 400 error with message `workout.invalidSetNumber`
  - → no database changes
- set not found + action submitted
  - → 400 error with message `workout.invalidSetNumber`
  - → no database changes
- session not found + action submitted
  - → 400 error with message `workout.noSetsForDate`
  - → no database changes
- future workout_date + action submitted
  - → 400 error with message from `validateWorkoutDate`
  - → no database changes

### Task 2 - UI edit button and modal

- selectedDateSets non-empty + page rendered
  - → each set card shows edit button with pencil icon and delete button with trashcan icon
- edit button clicked
  - → modal opens with weight input pre-filled, reps input pre-filled, Save and Cancel buttons
- save clicked with valid inputs
  - → form submits to `?/editSet` with correct `workout_date`, `set_number`, `weight_kg`, `repetitions`
  - → page reloads with updated set values
- cancel clicked in modal
  - → modal closes
  - → no form submission
  - → set list unchanged
- delete button clicked
  - → existing delete confirmation modal opens
- previousSessions rendered
  - → no edit or delete buttons present in history set cards

### Task 3 - Translations

- `workout.edit` key exists in en.json with value "Edit" and fi.json with value "Muokkaa"
- UI renders edit button label via t('workout.edit', locale)

## Notes

- Edit modal uses existing Button, Input, Card components. No new dependencies.
- Set number remains unchanged; only weight_kg and repetitions are updated.
- Validation messages reuse existing validation functions.
- Inline SVG icons are used for edit and delete; no external icon library.
