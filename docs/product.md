# Punttikuuri

A mobile-first gym workout logging application for quickly recording sets during training sessions and reviewing previous performance. Self-hosted on a home server via Tailscale, supporting multiple household users with fully separated data. Bilingual UI (English/Finnish), dark/light theme, installable as a PWA.

## Features

- **Authentication** — Username/password registration and login with cookie-based sessions ([story](stories/001-gym-workout-logger/story.md))
- **Exercise Types** — Create and list custom exercise types with optional short names and display order ([story](stories/001-gym-workout-logger/story.md))
- **Workout Logging** — Log sets (weight in kg, repetitions) set-by-set; workout sessions auto-created per exercise per day ([story](stories/001-gym-workout-logger/story.md))
- **Workout History** — View previous workouts for an exercise inline, grouped by date, newest first ([story](stories/001-gym-workout-logger/story.md))
- **User Preferences** — Language (English/Finnish) and theme (light/dark/system) selection persisted per user ([story](stories/001-gym-workout-logger/story.md))
- **PWA** — Installable on mobile devices for a native-app-like experience ([story](stories/001-gym-workout-logger/story.md))

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