# Delete Set from Current Exercise Session

## Context

Users occasionally enter a set by accident and need a way to remove it. Currently workout data is create-only, so mistakes cannot be corrected. The feature allows deletion of sets only from the currently selected exercise session (the session for the chosen workout date), with a confirmation step to prevent accidental deletion. Sets from historical sessions remain immutable.

## Out of Scope

- Deleting sets from historical sessions; history is read-only.
- Editing weight/repetitions of an existing set.
- Deleting entire workout sessions or exercise types.
- Renumbering sets in historical sessions.

## Implementation approach

- Add a named SvelteKit action `deleteSet` in `src/routes/exercises/[id]/+page.server.ts`. The action receives `workout_date` and `set_number` from the form.
- Ownership check uses existing `getOwnedExerciseId` helper; date validation uses `validateWorkoutDate`.
- Find the workout session for the user, exercise, and date. If not found, return 400 error.
- Delete the `set_entry` row matching `workout_session_id` and `set_number`.
- Renumber remaining sets in the session sequentially starting at 1 by updating `set_number` for each remaining entry in order of creation.
- On success, redirect to `/exercises/{id}` with the same query date to refresh the list.
- Client UI: In the selected date set list, render a delete button per set. Clicking opens a custom confirmation modal consistent with existing UI. Confirmation text is "Delete set?" in English and "Poistetaanko sarja?" in Finnish, using i18n keys `workout.deleteConfirm` and `workout.deleteConfirmFi` or existing t() lookup.
- The delete form posts to `?/deleteSet` with hidden fields `workout_date` and `set_number`. The modal is implemented with existing components (Button, Card/Alert) without new dependencies.

## Tasks

### Task 1 - Server deleteSet action with renumbering

- valid session exists + valid set_number + valid workout_date + user owns exercise + action submitted
  - → set entry deleted from database
  - → remaining sets renumbered sequentially starting at 1
  - → redirect 303 to `/exercises/{id}` with current query date
- session not found + action submitted
  - → 400 error with message "No sets for this date"
  - → no database changes
- invalid set_number + action submitted
  - → 400 error with message "Invalid set number"
  - → no database changes
- future workout_date + action submitted
  - → 400 error with message from `validateWorkoutDate`
  - → no database changes

### Task 2 - UI delete button and confirmation modal

- selectedDateSets non-empty + page rendered
  - → each set card shows a delete button
  - → button is styled as ghost variant
- delete button clicked
  - → confirmation modal opens with localized prompt
- confirm button clicked in modal
  - → form submits to `?/deleteSet` with correct `workout_date` and `set_number`
  - → page reloads with updated set list
- cancel button clicked in modal
  - → modal closes
  - → no form submission
  - → set list unchanged

### Task 3 - History immutability

- previousSessions rendered
  - → no delete buttons present in history set cards
  - → history sets are display-only

## Notes

- Confirmation uses a custom modal, not native `confirm()`, to keep UI consistent.
- Deleting the last set leaves an empty session; session record remains but shows no sets.
- Renumbering ensures set numbers stay sequential for UI display and future `logSet` prefill logic.
- Translations for confirmation prompt should be added to `en.json` and `fi.json` under keys `workout.deleteConfirm` and `workout.deleteConfirmFi` or use existing t() mechanism.
