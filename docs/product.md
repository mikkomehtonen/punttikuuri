# Punttikuuri

A mobile-first gym workout logging application for quickly recording sets during training sessions and reviewing previous performance. Self-hosted on a home server via Tailscale, supporting multiple household users with fully separated data. Bilingual UI (English/Finnish), dark/light theme, installable as a PWA.

## Features

- **Authentication** — Username/password registration and login with cookie-based sessions ([story](stories/001-gym-workout-logger/story.md))
- **Exercise Types** — Create and list custom exercise types with optional short names and display order ([story](stories/001-gym-workout-logger/story.md))
- **Workout Logging** — Log sets (weight in kg, repetitions) set-by-set; workout sessions auto-created per exercise per day ([story](stories/001-gym-workout-logger/story.md))
- **Workout History** — View previous workouts for an exercise inline, grouped by date, newest first ([story](stories/001-gym-workout-logger/story.md))
- **User Preferences** — Language (English/Finnish) and theme (light/dark/system) selection persisted per user ([story](stories/001-gym-workout-logger/story.md))
- **PWA** — Installable on mobile devices for a native-app-like experience ([story](stories/001-gym-workout-logger/story.md))
- **Set Prefill** — Weight and reps inputs auto-fill from the most recent set of the same exercise ([story](stories/003-prefill-set-values/story.md))
- **Modern UI** — Warm amber/orange color palette, Inter typeface, reusable Button/Input/Card/Alert/Badge components, custom dumbbell favicon, cohesive dark/light theme with stone surface tones ([story](stories/004-redesign-ui-style/story.md))
- **Secure Dependencies** — All npm audit vulnerabilities resolved via overrides for `cookie` (0.7.2) and `esbuild` (0.25.12), plus SvelteKit upgrade to 2.64.0 ([story](stories/005-fix-npm-vulnerabilities/story.md))
- **HTTP Cookie Fix** — Auth cookies explicitly set with `secure: false` so login works over plain HTTP (Tailscale) where SvelteKit would otherwise default to `Secure`-only cookies ([story](stories/006-fix-login-redirect-loop/story.md))
- **Responsive Header** — Header stacks vertically on mobile to prevent Finnish nav text from overlapping the app name ([story](stories/008-fix-header-text-overlap/story.md))
- **Favicon HTTP Access** — Favicon SVG served at `/favicon.svg` for external service dashboards, moved from Vite-inlined asset to SvelteKit static directory ([story](stories/009-serve-favicon-svg/story.md))
- **Header Logo** — Dumbbell logo (`favicon.svg`) displayed to the left of the "Punttikuuri" title in the header, sharing the single source of truth with the favicon and PWA manifest ([story](stories/010-add-logo-to-title/story.md))
- **Logo Link** — Header logo is a separate link whose target is read from the `LOGO_LINK_URL` environment variable; when unset, the logo renders as a plain decorative image ([story](stories/011-logo-link-env/story.md))
- **Admin Password Reset** — Admin users (configured via the `ADMIN_USERNAMES` env var) can list all users and reset any user's password from an admin page; resetting a password invalidates all of that user's sessions except the acting admin's current session ([story](stories/012-password-reset/story.md))
- **Session Comments** — Add an editable free-text comment (up to 500 characters) to today's workout session to record how it felt or whether it went well; comments are displayed in the workout history alongside past sessions ([story](stories/013-add-session-comments/story.md))
- **Log Set Form Action Fix** — Renamed the exercise detail page's default form action to a named `logSet` action so it no longer conflicts with the `saveComment` named action, resolving the 500 error on "Log Set" submission ([story](stories/014-fix-log-set-named-action/story.md))
- **Back-date Exercise Logging** — A date selector on the exercise detail page (defaulting to today) lets users log sets and session comments against any past day via a `?date=YYYY-MM-DD` query parameter; future dates are rejected ([story](stories/015-log-exercise-previous-days/story.md))
- **Root Redirect** — Authenticated users visiting `/` are redirected to `/exercises` for seamless entry ([story](stories/016-extend-session-duration/story.md))
- **Set Deletion** — Delete individual sets from the current exercise session with confirmation; sets are renumbered to keep sequential numbering ([story](stories/017-delete-set/story.md))
- **Set Editing** — Edit weight and repetitions for individual sets in the current exercise session with validation; set numbers remain unchanged ([story](stories/018-edit-set-values/story.md))
- **Collapsible Old Workouts** — Workout history sessions older than 7 days collapse to date only by default; clicking the date expands to show sets and comment ([story](stories/019-collapse-old-workouts/story.md))

## Non-Goals

- Editing exercises or sessions, and deleting/editing sets from historical sessions — core workout data is create-only except for session comments and deleting/editing sets from the current session (session comments are editable, see Session Comments feature)
- Pounds unit support (kilograms only)
- Copying previous workouts as templates
- Personal records, volume calculations, or progress charts
- Offline-first synchronization
- Shared household or family features
- Email-based password reset or email verification (password reset is admin-driven via the admin page)
- User deletion or creation from the admin interface (admin page only supports password reset)

## Known Limitations

- No way to correct mistakes in entered data for historical sessions — users cannot edit exercises, workout sessions, or sets from past sessions; sets from the current session can be edited for weight and repetitions and deleted with confirmation (session comments are editable for all sessions).
- Weight is displayed and entered in kilograms only.
- Authentication uses simple username/password without email; password recovery is admin-driven via the admin page.
- PWA offline support is limited to static asset caching; workout data requires a network connection.
