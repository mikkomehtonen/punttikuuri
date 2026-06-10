# Fix Login Redirect Loop on HTTP Deployment

## Context

When the app runs in Docker (`NODE_ENV=production`) and is accessed over HTTP (e.g. `http://100.117.77.95:3106/login`), logging in appears to succeed but the user is immediately redirected back to the login page. The root cause is that SvelteKit defaults the cookie `secure` option to `true` in production (except on `http://localhost`). Since the app is accessed over plain HTTP via a Tailscale IP, the browser receives `Set-Cookie: session_id=…; Secure; …` but then refuses to send that cookie on subsequent HTTP requests — the `Secure` attribute forbids it. The `hooks.server.ts` hook sees no `session_id` cookie, treats the user as unauthenticated, and redirects to `/login`.

Adding `csrf: { checkOrigin: false }` to `svelte.config.js` was a reasonable first step (it disables origin checking for form submissions) but it does not address the cookie `Secure` attribute issue.

## Out of Scope

- Adding HTTPS / TLS termination (reverse proxy setup)
- Changing the Docker networking or Tailscale configuration
- Modifying the session mechanism or token format

## Implementation approach

**Root cause**: SvelteKit's `cookies.set()` defaults `secure` to `true` when the request is not on `http://localhost`. In production Docker, all requests arrive as HTTP from a non-localhost address, so every auth cookie gets the `Secure` attribute. Browsers never send `Secure` cookies over HTTP, so the session cookie is lost on the redirect after login.

**Fix**: Explicitly set `secure: false` in both `COOKIE_OPTIONS` and `PUBLIC_COOKIE_OPTIONS` in `src/lib/server/auth.ts`. This tells SvelteKit to omit the `Secure` attribute, allowing the browser to send the cookie over HTTP. This is appropriate because the app is designed for self-hosting on a private Tailscale network where transport security is handled at the network layer.

The `clearAuthCookies` function only needs matching `path` for deletion — `secure` is irrelevant for `cookies.delete()` — so no changes are needed there.

The settings page (`src/routes/settings/+page.server.ts`) also sets `locale` and `theme` cookies using `PUBLIC_COOKIE_OPTIONS`, so adding `secure: false` there fixes those cookies too.

## Tasks

### Task 1 - Add `secure: false` to cookie options

- `COOKIE_OPTIONS` in `src/lib/server/auth.ts` includes `secure: false`
  - → session cookie is set without the `Secure` attribute
  - → browser sends the cookie over HTTP
- `PUBLIC_COOKIE_OPTIONS` in `src/lib/server/auth.ts` includes `secure: false`
  - → locale and theme cookies are set without the `Secure` attribute
  - → browser sends these cookies over HTTP
- existing test `should set session cookie as HttpOnly and SameSite=Lax` still passes
  - → test is updated to also assert `secure: false`
- existing test `should have httpOnly set to false for public cookies` still passes
  - → test is updated to also assert `secure: false`
- existing test `should have sameSite set to lax` (public cookies) still passes
- existing test `should have path set to /` (public cookies) still passes

### Task 2 - Verify login flow works over HTTP

- login form POST to `/login` with valid credentials
  - → `Set-Cookie` header on response does NOT contain `Secure` attribute for `session_id`
  - → redirect to `/exercises` succeeds (user is authenticated)
- login form POST to `/login` with valid credentials when accessed via non-localhost HTTP URL
  - → session cookie is sent on subsequent requests
  - → user stays logged in (no redirect loop)
- settings page POST to save locale/theme
  - → `locale` and `theme` cookies are set without `Secure` attribute
  - → preferences persist across page loads

## Notes

- The `csrf: { checkOrigin: false }` already in `svelte.config.js` is still needed — it allows form POSTs from non-localhost origins (e.g. the Tailscale IP). This is a separate concern from the cookie `Secure` attribute.
- If the app is later deployed behind an HTTPS reverse proxy, `secure` should be changed to `true` (or made dynamic based on `ORIGIN` / `X-Forwarded-Proto`). For the current self-hosted HTTP-over-Tailscale deployment, `secure: false` is correct.
- The `clearAuthCookies` function uses `cookies.delete()` which only requires matching `path` — no `secure` option is needed for deletion.
