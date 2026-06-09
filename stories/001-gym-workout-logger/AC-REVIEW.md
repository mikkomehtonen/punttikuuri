# AC Review Report — Story 001: Gym Workout Logger MVP

## Lint & Test Results

**Lint:** Pass — prettier and eslint clean
**Tests:** 138 passed, 0 failed, 0 skipped
**Typecheck:** **Fail** — 2 errors, 2 warnings

Type errors:

- `src/routes/exercises/[id]/+page.server.ts:33:32` — `'locals.user' is possibly 'null'`
- `src/routes/exercises/[id]/+page.server.ts:66:32` — `'locals.user' is possibly 'null'`

Warnings (non-breaking):

- `src/routes/settings/+page.svelte:11:30` — state_referenced_locally for `data.currentLocale`
- `src/routes/settings/+page.svelte:12:29` — state_referenced_locally for `data.currentTheme`

## Coverage Summary

### Task 1 — Project Scaffolding & Database Setup: Pass

AC 1: SvelteKit project runs with `npm run dev` → home page loads without errors → **Manual** — verified by running `npm run dev`
AC 2: `npm run build` produces a working Node server output → **Manual** — verified by running `npm run build` then `node build`
AC 3: Drizzle migration runs and creates all five tables → **Tested** — `"should have all five tables with correct schema"` (schema.test.ts:18), plus column and constraint checks (schema.test.ts:32,43,52)
AC 4: `data/*.db` is listed in `.gitignore` → **Tested** — `"should have data/*.db in .gitignore"` (app.test.ts:25)
AC 5: Tailwind CSS v4 configured with dark-mode class strategy → **Tested** — `"should have Tailwind CSS v4 configured with dark mode class strategy"` (app.test.ts:35), `"should have dark mode styles in layout using dark: variant"` (app.test.ts:40), `"should have dark mode styles that activate via dark class on html element"` (app.test.ts:64)
AC 6: Vitest runs and a passing smoke test exists → **Tested** — `"should pass"` (schema.test.ts:63), full suite exits 0

Coverage: 4 Tested + 2 Manual = 6 / 6 — min required: floor(0.9×6)=5 — Pass

### Task 2 — Authentication System: Pass

AC 1: valid username + valid password + register → user row with bcrypt hash, session row, session_id cookie (HttpOnly, SameSite=Lax), redirect to /exercises → **Tested** — `"should create a user and session with valid credentials"` (auth.test.ts:85) checks user creation, bcrypt hash, session token; `"should set session cookie as HttpOnly and SameSite=Lax"` (app.test.ts:193) checks cookie flags; route classification for redirect (app.test.ts:378)
AC 2: duplicate username + register → error "username already taken", no new user → **Tested** — `"should reject duplicate username"` (auth.test.ts:122) checks error message and user count unchanged
AC 3: username <3 chars or password <8 chars + register → validation error for invalid field → **Tested** — `"should reject short username"` (auth.test.ts:106) checks field='username'; `"should reject short password"` (auth.test.ts:114) checks field='password'
AC 4: valid credentials + login → session created, cookie set, redirect to /exercises → **Tested** — `"should login with valid credentials"` (auth.test.ts:145) checks session token; cookie set (app.test.ts:193); route classification (app.test.ts:378)
AC 5: invalid credentials + login → error "invalid username or password", no session → **Tested** — `"should reject invalid password"` (auth.test.ts:156) checks error and no session; `"should reject non-existent username"` (auth.test.ts:171) checks error
AC 6: authenticated user + logout → session deleted, cookie cleared, redirect to /login → **Tested** — `"should delete session"` (auth.test.ts:206) checks session removal; `"should clear all cookies on logout"` (app.test.ts:235) checks cookie clearing; redirect to /login (app.test.ts:349)
AC 7: unauthenticated user + navigates to /exercises → redirect to /login → **Tested** — `"should redirect unauthenticated user from protected route to /login"` (app.test.ts:349)
AC 8: authenticated user + navigates to /login → redirect to /exercises → **Partially tested** — `"should redirect authenticated user from /login to /exercises"` (app.test.ts:378) tests route classification (isAuthRoute/isProtectedRoute) but does not invoke `handle()` with an authenticated user to verify the actual redirect

Coverage: 7 Tested + 1 Partially tested = 8 / 8 — min required: floor(0.9×8)=7 — Pass

### Task 3 — Exercise Type Management: Pass

AC 1: valid name (1–100 chars) + create exercise → exercise_type row with user_id, short_name and display_order saved if provided, redirect to /exercises → **Tested** — `"should create an exercise type with name, short_name, and display_order"` (exercise.test.ts:40); `"should create an exercise type without optional fields"` (exercise.test.ts:59)
AC 2: empty name + create exercise → validation error → **Tested** — `"should reject empty exercise name"` (app.test.ts:254)
AC 3: exercise list loaded → all exercises for current user displayed, sorted by display_order ASC (NULLS LAST), then name ASC → **Tested** — `"should return all exercises for user sorted by display_order ASC then name ASC"` (exercise.test.ts:91); `"should display exercise list when exercises exist"` (exercises-page.test.ts:23)
AC 4: user A creates exercise + user B views list → user B does not see user A's exercises → **Tested** — `"should enforce data isolation between users"` (exercise.test.ts:133)
AC 5: no exercises exist + exercise list loaded → empty-state message with link to create → **Tested** — `"should show empty state message and create link when no exercises exist"` (exercises-page.test.ts:6)

Coverage: 5 / 5 — min required: floor(0.9×5)=4 — Pass

### Task 4 — Workout Logging & History: Pass

AC 1: exercise page loaded with no workout session for today → "Add set" form displayed, previous workout sessions displayed below (if any) → **Tested** — `"should show add set form when no workout session for today"` (exercise-detail-page.test.ts:21) checks form elements; previous sessions display tested in AC 4
AC 2: valid weight + valid reps + add-set submitted → workout_session created if not present, set_entry with correct set_number/weight_kg/repetitions, page refreshes showing new set, form clears → **Partially tested** — `"should create a workout session for today on first set entry"` (exercise.test.ts:209) and `"should create a set entry with sequential numbering"` (exercise.test.ts:229) verify DB operations; **missing**: page refresh and form clearing after successful submission (requires integration/e2e test)
AC 3: exercise page loaded with existing session for today → today's sets in set_number order, "Add set" form below → **Tested** — `"should display today sets in set_number order"` (exercise-detail-page.test.ts:43)
AC 4: exercise page loaded with previous workouts → grouped by date newest first, each session shows date and sets in format "130 kg × 5" → **Tested** — `"should display previous workouts grouped by date, newest first"` (exercise-detail-page.test.ts:62); `"should display sets in format: weight kg × reps"` (exercise-detail-page.test.ts:89); `"should display previous session sets in format: weight kg × reps"` (exercise-detail-page.test.ts:102)
AC 5: user A logs a set + user B views same exercise → user B does not see user A's data → **Tested** — `"should isolate workout data between users"` (exercise.test.ts:325)
AC 6: exercise page loaded with no previous workouts at all → only "Add set" form; no history section → **Tested** — `"should not show history section when no previous workouts exist"` (exercise-detail-page.test.ts:35)
AC 7: weight or reps empty or non-numeric + submit → validation error → **Tested** — `"should reject empty weight"` (app.test.ts:127), `"should reject empty reps"` (app.test.ts:131), `"should reject non-numeric weight"` (app.test.ts:135), `"should reject non-numeric reps"` (app.test.ts:143)
AC 8: weight or reps zero or negative + submit → validation error → **Tested** — `"should reject zero weight"` (app.test.ts:147), `"should reject zero reps"` (app.test.ts:151), `"should reject negative weight"` (app.test.ts:155), `"should reject negative reps"` (app.test.ts:159)

Coverage: 7 Tested + 1 Partially tested = 8 / 8 — min required: floor(0.9×8)=7 — Pass

### Task 5 — User Preferences (Language & Theme): Pass

AC 1: settings page loaded → current locale and theme displayed in form → **Tested** — `"should display settings form with language and theme options"` (settings-page.test.ts:18)
AC 2: locale changed to Finnish + submitted → user.locale updated to fi, locale cookie updated, all UI strings in Finnish → **Tested** — `"should update user locale"` (exercise.test.ts:406) checks DB; `"should set locale cookie when updating locale"` (app.test.ts:468) checks cookie; `"should display Finnish translations when locale is fi"` (settings-page.test.ts:62) checks UI
AC 3: locale changed to English + submitted → user.locale updated to en, all UI strings in English → **Partially tested** — English translations verified (i18n.test.ts:5), but explicit DB update to 'en' is not tested (only update to 'fi' is tested at exercise.test.ts:406); the mechanism is identical but the specific scenario is not exercised
AC 4: theme changed to dark + submitted → user.theme updated to dark, theme cookie updated, dark class on <html>, dark styles applied → **Tested** — `"should update user theme"` (exercise.test.ts:421) checks DB; `"should set theme cookie when updating theme"` (app.test.ts:485) checks cookie; `"should add dark class to html element when theme cookie is dark"` (app.test.ts:522) checks FOUC script; dark styles (app.test.ts:40)
AC 5: theme changed to light + submitted → dark class removed from <html>, light styles applied → **Tested** — `"should not add dark class when theme cookie is light"` (app.test.ts:528)
AC 6: theme set to system + OS preference is dark + page loaded → dark styles applied → **Tested** — `"should add dark class when theme is system and OS prefers dark"` (app.test.ts:541)
AC 7: page loaded with saved dark theme preference → no FOUC → **Tested** — `"should execute in head before body renders (FOUC prevention)"` (app.test.ts:548); `"should have FOUC prevention inline script in app.html"` (app.test.ts:45)
AC 8: unauthenticated user + navigates to /settings → redirect to /login → **Tested** — `"should redirect unauthenticated user from /settings to /login"` (app.test.ts:387)

Coverage: 7 Tested + 1 Partially tested = 8 / 8 — min required: floor(0.9×8)=7 — Pass

### Task 6 — PWA Configuration: Pass

AC 1: GET /manifest.webmanifest returns valid JSON with name, short_name, icons, start_url, display: "standalone", theme_color, background_color → **Tested** — `"should have a valid manifest with required fields"` (app.test.ts:177)
AC 2: service worker is registered on page load → navigator.serviceWorker.controller is not null → **Not covered** — no test verifies service worker registration; would require browser-based integration test
AC 3: Lighthouse PWA audit or manual verification → app installable, opens in standalone mode → **Manual** — inherently requires manual verification per story specification

Coverage: 1 Tested + 1 Manual = 2 / 3 — min required: floor(0.9×3)=2 — Pass

## Story Gaps

1. **No AC for exercise name length upper bound validation on the form** — The story specifies 1–100 chars for exercise name, and `validateExerciseName` is tested for >100 chars (app.test.ts:258), but there is no AC explicitly covering the form-level validation error display for names over 100 chars.
2. **No AC for short_name validation on the create exercise form** — `validateShortName` is tested (app.test.ts:560-575) but no AC covers the form behavior when short_name exceeds 30 chars.
3. **No AC for the root route (/) behavior** — The story doesn't specify what happens when an unauthenticated user visits `/`. The tests show it's not a protected route (app.test.ts:89), but there's no AC describing the expected behavior (redirect to /login? show landing page?).
4. **No AC for the logout route** — The story mentions logout deletes session and clears cookie, but doesn't specify the route (`/logout`) or its behavior as a form action.
5. **No AC for the `/exercises/new` page rendering** — The create exercise form page is not covered by any page-level render test.
6. **No AC for the `/login` and `/register` page rendering** — Login and register form pages have no render tests; only the backend auth functions are tested.

## Issues

### Failing

- **Typecheck** — 2 errors in `src/routes/exercises/[id]/+page.server.ts`: `locals.user` is possibly `null` on lines 33 and 66. The `load` function accesses `locals.user.id` without a null guard or non-null assertion. While the hooks.server.ts redirect ensures `locals.user` is always set at runtime for this protected route, TypeScript cannot infer this. Line 17 uses `locals.user!` (non-null assertion) but lines 33 and 66 do not.

### Non-blocking

- **Task 2 / AC 8** — `"should redirect authenticated user from /login to /exercises"` (app.test.ts:378) only tests route classification (isAuthRoute/isProtectedRoute booleans), not the actual `handle()` redirect with an authenticated user on /login. The redirect logic is inferred but not exercised end-to-end.
- **Task 4 / AC 2** — DB operations for workout session auto-creation and set entry are tested, but the page refresh and form clearing after successful set submission are not tested. These are SvelteKit form action behaviors that would require integration/e2e testing.
- **Task 5 / AC 3** — English locale DB update is not explicitly tested; only Finnish locale update is tested (exercise.test.ts:406). The mechanism is identical but the specific scenario is not exercised.
- **Task 6 / AC 2** — Service worker registration is not covered by any test. This would require a browser-based test (e.g., Playwright) to verify `navigator.serviceWorker.controller` is not null after page load.

## Verdict

**Fail**

**Reasoning:** All 6 tasks meet the ≥90% AC coverage threshold, and all 138 tests pass. However, `npm run check` (svelte-check) reports 2 type errors in `src/routes/exercises/[id]/+page.server.ts` where `locals.user` is possibly null on lines 33 and 66. The typecheck failure blocks the overall verdict.
