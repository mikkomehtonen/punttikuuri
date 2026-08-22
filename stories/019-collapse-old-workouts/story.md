<!-- The filled story must contain 0 HTML comments and 0 empty sections. Delete unused optional sections entirely. -->

# Collapse old workouts in history listing

## Context

The exercise detail page lists previous workout sessions newest first. Sessions older than one week create visual clutter. Collapsing older sessions to show only the date by default reduces noise while keeping full details accessible on demand. Users can click the date heading to expand and view sets and session comment.

## Out of Scope

No changes to data model, workout logging, or session comment persistence. Recent sessions (<7 days old) remain always expanded. Expanded state is not persisted across page loads. No animation requirements.

## Implementation approach

History rendering lives in `src/routes/exercises/[id]/+page.svelte`. Add client-side state `expanded` mapping workout_date → boolean.

Age calculation: `daysAgo = floor((todayMs - sessionDateMs) / 86400000)`. Session is old if `daysAgo > 7`.

Initialization: On component mount, set expanded to `true` for sessions with `daysAgo <= 7`, otherwise `false`.

Date heading rendered as a button with `aria-expanded` reflecting state. Click toggles expanded state.

When collapsed: only the date heading is visible; sets list and comment are not rendered.

When expanded: date heading, comment if present, and sets list are rendered.

No server-side changes required; `previousSessions` data shape unchanged.

## Tasks

### Task 1 - Collapsible history for sessions older than 7 days

- previousSessions contains a session with workout_date >7 days ago + page renders
  - → date heading is rendered as a clickable button
  - → sets and comment for that session are not rendered initially
- previousSessions contains a session with workout_date >7 days ago + date heading clicked
  - → sets and comment for that session are rendered
  - → `aria-expanded` is true
- previousSessions contains a session with workout_date <=7 days old + page renders
  - → sets and comment for that session are rendered initially
  - → date heading is not collapsible or is expanded by default
- previousSessions empty + page renders
  - → history section is not rendered
- previousSessions contains a session with no sets + page renders
  - → date heading is rendered, no sets list rendered
- date heading clicked twice
  - → expansion toggles each click

## Notes

The threshold is strictly greater than 7 days. Sessions exactly 7 days old remain expanded. Date comparison uses the `today` value provided by load, not client clock, to avoid hydration mismatch. Button should be keyboard accessible.
