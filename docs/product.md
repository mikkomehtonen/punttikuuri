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

## Non-Goals

- Editing or deleting exercises, sessions, or sets (create-only MVP)
- Pounds unit support (kilograms only)
- Copying previous workouts as templates
- Personal records, volume calculations, or progress charts
- Exercise categories or workout notes
- Offline-first synchronization
- Shared household or family features
- Password reset or email verification
- Admin interface for user management

## Known Limitations

- No way to correct mistakes in entered data — users cannot edit or delete exercises, workout sessions, or sets.
- Weight is displayed and entered in kilograms only.
- Authentication uses simple username/password without email or password recovery.
- PWA offline support is limited to static asset caching; workout data requires a network connection.
