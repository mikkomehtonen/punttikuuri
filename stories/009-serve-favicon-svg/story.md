# Serve Favicon SVG via HTTP

## Context

The favicon (`src/lib/assets/favicon.svg`) is currently imported as a Vite module in `+layout.svelte`, which causes Vite to inline it as a data URI in the `<link rel="icon">` tag. This means the favicon is not accessible via HTTP at `/favicon.svg`. An external services dashboard needs to fetch the favicon from `/favicon.svg` by URL. Additionally, the existing PWA configuration in `vite.config.ts` already references `favicon.svg` in `includeAssets` and `pwa-manifest.ts` uses it as an icon `src` — both expecting the file to exist in the `static/` directory where SvelteKit serves files at the root path.

## Out of Scope

- Changing the favicon design or SVG content
- Adding additional favicon formats (ICO, PNG, apple-touch-icon)
- Modifying PWA manifest or service worker configuration beyond what this change enables
- Adding `<link rel="icon">` to `app.html` (the layout-based approach is retained)

## Implementation approach

Move `favicon.svg` from `src/lib/assets/` to `static/`. SvelteKit serves files in `static/` at the root URL path, so `static/favicon.svg` becomes accessible at `/favicon.svg` with the correct `image/svg+xml` content type. Update the layout to reference the static path directly instead of importing via Vite.

**File changes:**

1. **Move** `src/lib/assets/favicon.svg` → `static/favicon.svg`
   - Single source of truth — avoids maintaining two copies
   - Aligns with the existing PWA `includeAssets: ['favicon.svg']` config

2. **Update** `src/routes/+layout.svelte`:
   - Remove `import favicon from '$lib/assets/favicon.svg';`
   - Change `<link rel="icon" href={favicon} />` to `<link rel="icon" href="/favicon.svg" />`

3. **Update** `src/lib/__tests__/design-system.test.ts`:
   - Change `path.resolve('src/lib/assets/favicon.svg')` to `path.resolve('static/favicon.svg')`

No other files need changes. The PWA manifest already references `favicon.svg` as a relative path, and `vite.config.ts` already lists `favicon.svg` in `includeAssets` — both will work correctly once the file is in `static/`.

## Tasks

### Task 1 - Move favicon to static directory and update references

- File `static/favicon.svg` exists and contains the same dumbbell SVG content
  - → `fs.existsSync('static/favicon.svg')` returns `true`
  - → SVG contains three `<rect>` elements with `fill="#d97706"` and `fill="#b45309"`
- File `src/lib/assets/favicon.svg` does not exist
  - → `fs.existsSync('src/lib/assets/favicon.svg')` returns `false`
- Layout SSR output renders favicon link with static path
  - → `<link rel="icon" href="/favicon.svg" />` is present in rendered HTML
  - → No Vite-processed data URI is used for the favicon href
- Design system test reads favicon from new location
  - → `path.resolve('static/favicon.svg')` is used in the test file
  - → Test passes (3 `<rect>` elements, correct fill colors)

### Task 2 - Verify HTTP accessibility of favicon

- Application running (dev or preview server)
  - → `GET /favicon.svg` returns HTTP 200
  - → Response `Content-Type` header is `image/svg+xml`
  - → Response body contains the dumbbell SVG markup (`<rect` elements with amber fills)

## Technical Context

- SvelteKit 2.64.0 — files in `static/` are served at root URL path with correct MIME types by the framework's built-in static file handler.
- `@vite-pwa/sveltekit` 1.1.0 — `includeAssets: ['favicon.svg']` copies files from `static/` into the service worker precache; this was already configured in `vite.config.ts` and will work once the file is in `static/`.
- Vite 8.0.16 — importing an SVG from `$lib/assets` inlines it as a data URI; using a string path `/favicon.svg` bypasses Vite processing entirely.
- No new dependencies.

## Notes

- The `import favicon from '$lib/assets/favicon.svg'` pattern was causing Vite to inline the SVG as a base64 data URI (e.g., `href="data:image/svg+xml;base64,..."`). This works for the browser's favicon rendering but makes the file inaccessible via HTTP.
- Using a static path string `/favicon.svg` is more efficient than the Vite import because the browser can cache the SVG separately and the file is available for other consumers (service worker, external dashboards).
- The PWA configuration was already set up to expect `favicon.svg` in `static/` — this change also fixes a latent issue where the PWA's `includeAssets` would not find the file.
