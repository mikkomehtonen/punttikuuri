<!-- The filled story must contain 0 HTML comments and 0 empty sections. Delete unused optional sections entirely. -->

# Redirect authenticated users from root to exercises

## Context

Users report that login appears to expire frequently, especially on mobile when switching tabs and returning to the app. Investigation shows the root page `/` always renders the public landing with login/register buttons, even when a valid session exists. Users visiting `http://localhost:3106/` perceive themselves as logged out and are forced to re-authenticate. Session duration is already 30 days for both DB expiration and cookie maxAge, which the user confirmed is acceptable. Redirecting authenticated users from root to `/exercises` removes the confusion and provides a seamless entry point.

## Out of Scope

- Changing session duration from 30 days
- Implementing sliding session renewal
- Modifying cookie `secure` / `sameSite` settings
- Changing PWA start_url

## Implementation approach

Add a server load for the root route `src/routes/+page.server.ts`. On each GET to `/`, check `event.locals.user` set by `hooks.server.ts`. If a user is present, throw a 303 redirect to `/exercises`. If no user, allow the existing `+page.svelte` to render. This mirrors existing redirect patterns in the codebase (`throw redirect(303, '/exercises')`) and keeps the root page public for unauthenticated visitors.

## Tasks

### Task 1 - Redirect authenticated users from root to exercises

- User authenticated + GET `/`
  - → 303 redirect to `/exercises`
  - → response location header equals `/exercises`
- User not authenticated + GET `/`
  - → 200 response with root page rendered
  - → login and register buttons visible
- User authenticated + GET `/exercises`
  - → 200 response, exercises page rendered (no double redirect)
- Direct navigation to `/` after logout
  - → root page renders, no redirect

## Notes

- Root page remains publicly accessible for unauthenticated users; no login enforcement on `/`.
- The redirect is server-side to avoid client-side flash of landing page.
- Existing tests for hooks and route guards remain valid; no changes to session cookie options.
