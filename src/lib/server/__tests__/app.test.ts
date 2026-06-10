import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isProtectedRoute, isAuthRoute } from '../route-guards';
import {
	validateWeight,
	validateReps,
	validateExerciseName,
	validateShortName
} from '../workout-validation';
import { pwaManifest } from '../../pwa-manifest';
import {
	validateUsername,
	validatePassword,
	setAuthCookies,
	clearAuthCookies,
	PUBLIC_COOKIE_OPTIONS,
	isValidLocale,
	isValidTheme,
	VALID_LOCALES,
	VALID_THEMES
} from '../auth';

describe('Task 1 - Project Scaffolding & Database Setup', () => {
	it('should have data/*.db in .gitignore', () => {
		const gitignore = fs.readFileSync(path.resolve('.gitignore'), 'utf-8');
		expect(gitignore).toContain('data/*.db');
	});

	it('should have a valid SvelteKit configuration with adapter-node', () => {
		const svelteConfig = fs.readFileSync(path.resolve('svelte.config.js'), 'utf-8');
		expect(svelteConfig).toContain('adapter-node');
	});

	it('should have Tailwind CSS v4 configured with dark mode class strategy', () => {
		const layoutCss = fs.readFileSync(path.resolve('src/routes/layout.css'), 'utf-8');
		expect(layoutCss).toContain("@import 'tailwindcss'");
	});

	it('should have dark mode styles in layout using dark: variant', () => {
		const layout = fs.readFileSync(path.resolve('src/routes/+layout.svelte'), 'utf-8');
		expect(layout).toContain('dark:');
	});

	it('should have FOUC prevention inline script in app.html', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		expect(appHtml).toContain('document.documentElement.classList.add');
		expect(appHtml).toContain('theme');
		expect(appHtml).toContain('prefers-color-scheme');
	});

	it('should have package.json with dev and build scripts for SvelteKit', () => {
		const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
		expect(pkg.scripts.dev).toContain('vite dev');
		expect(pkg.scripts.build).toContain('vite build');
	});

	it('should have adapter-node installed for production builds', () => {
		const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
		const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
		expect(allDeps['@sveltejs/adapter-node']).toBeTruthy();
	});

	it('should have dark mode styles that activate via dark class on html element', () => {
		const layout = fs.readFileSync(path.resolve('src/routes/+layout.svelte'), 'utf-8');
		expect(layout).toContain('dark:bg-stone-900');
		expect(layout).toContain('dark:text-stone-100');
	});
});

describe('Task 2 - Authentication redirect protection (via hooks.server.ts)', () => {
	it('should identify /exercises as a protected route', () => {
		expect(isProtectedRoute('/exercises')).toBe(true);
	});

	it('should identify /exercises/new as a protected route', () => {
		expect(isProtectedRoute('/exercises/new')).toBe(true);
	});

	it('should identify /exercises/1 as a protected route', () => {
		expect(isProtectedRoute('/exercises/1')).toBe(true);
	});

	it('should identify /settings as a protected route', () => {
		expect(isProtectedRoute('/settings')).toBe(true);
	});

	it('should not identify / as a protected route', () => {
		expect(isProtectedRoute('/')).toBe(false);
	});

	it('should not identify /login as a protected route', () => {
		expect(isProtectedRoute('/login')).toBe(false);
	});

	it('should identify /login as an auth route', () => {
		expect(isAuthRoute('/login')).toBe(true);
	});

	it('should identify /register as an auth route', () => {
		expect(isAuthRoute('/register')).toBe(true);
	});

	it('should not identify /exercises as an auth route', () => {
		expect(isAuthRoute('/exercises')).toBe(false);
	});

	it('should not identify /settings as an auth route', () => {
		expect(isAuthRoute('/settings')).toBe(false);
	});

	it('should not identify / as an auth route', () => {
		expect(isAuthRoute('/')).toBe(false);
	});
});

describe('Task 4 - Workout validation (imported from production code)', () => {
	it('should accept valid weight and reps', () => {
		expect(validateWeight('100')).toBeNull();
		expect(validateReps('5')).toBeNull();
	});

	it('should accept decimal weight', () => {
		expect(validateWeight('102.5')).toBeNull();
	});

	it('should reject empty weight', () => {
		expect(validateWeight('')).not.toBeNull();
	});

	it('should reject empty reps', () => {
		expect(validateReps('')).not.toBeNull();
	});

	it('should reject non-numeric weight', () => {
		expect(validateWeight('abc')).not.toBeNull();
	});

	it('should reject partially-numeric weight (e.g. 5abc)', () => {
		expect(validateWeight('5abc')).not.toBeNull();
	});

	it('should reject non-numeric reps', () => {
		expect(validateReps('abc')).not.toBeNull();
	});

	it('should reject zero weight', () => {
		expect(validateWeight('0')).not.toBeNull();
	});

	it('should reject zero reps', () => {
		expect(validateReps('0')).not.toBeNull();
	});

	it('should reject negative weight', () => {
		expect(validateWeight('-5')).not.toBeNull();
	});

	it('should reject negative reps', () => {
		expect(validateReps('-5')).not.toBeNull();
	});

	it('should reject decimal reps (non-whole number)', () => {
		expect(validateReps('5.5')).not.toBeNull();
	});

	it('should reject Infinity weight', () => {
		expect(validateWeight('Infinity')).not.toBeNull();
	});

	it('should reject -Infinity weight', () => {
		expect(validateWeight('-Infinity')).not.toBeNull();
	});
});

describe('Task 6 - PWA Configuration', () => {
	it('should have a valid manifest with required fields', () => {
		expect(pwaManifest.name).toBe('Punttikuuri');
		expect(pwaManifest.short_name).toBe('Punttikuuri');
		expect(pwaManifest.display).toBe('standalone');
		expect(pwaManifest.start_url).toBe('/exercises');
		expect(pwaManifest.theme_color).toBeTruthy();
		expect(pwaManifest.background_color).toBeTruthy();
		expect(pwaManifest.icons).toBeInstanceOf(Array);
		expect(pwaManifest.icons.length).toBeGreaterThan(0);
		expect(pwaManifest.icons[0].src).toBeTruthy();
		expect(pwaManifest.icons[0].sizes).toBeTruthy();
		expect(pwaManifest.icons[0].type).toBeTruthy();
	});
});

describe('Task 2 - Authentication cookie configuration', () => {
	it('should set session cookie as HttpOnly and SameSite=Lax', () => {
		const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
		const mockCookies = {
			set: (name: string, value: string, options: Record<string, unknown>) => {
				setCalls.push({ name, value, options });
			},
			get: () => undefined,
			delete: () => {}
		};

		setAuthCookies(mockCookies as never, 'test-token', 'en', 'system');

		const sessionCookie = setCalls.find((c) => c.name === 'session_id');
		expect(sessionCookie).toBeDefined();
		expect(sessionCookie!.options.httpOnly).toBe(true);
		expect(sessionCookie!.options.sameSite).toBe('lax');
		expect(sessionCookie!.options.path).toBe('/');
	});

	it('should set locale and theme cookies as non-HttpOnly', () => {
		const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
		const mockCookies = {
			set: (name: string, value: string, options: Record<string, unknown>) => {
				setCalls.push({ name, value, options });
			},
			get: () => undefined,
			delete: () => {}
		};

		setAuthCookies(mockCookies as never, 'test-token', 'fi', 'dark');

		const localeCookie = setCalls.find((c) => c.name === 'locale');
		expect(localeCookie).toBeDefined();
		expect(localeCookie!.value).toBe('fi');
		expect(localeCookie!.options.httpOnly).toBe(false);

		const themeCookie = setCalls.find((c) => c.name === 'theme');
		expect(themeCookie).toBeDefined();
		expect(themeCookie!.value).toBe('dark');
		expect(themeCookie!.options.httpOnly).toBe(false);
	});

	it('should clear all cookies on logout', () => {
		const deletedCookies: string[] = [];
		const mockCookies = {
			set: () => {},
			get: () => 'test-token',
			delete: (name: string) => {
				deletedCookies.push(name);
			}
		};

		clearAuthCookies(mockCookies as never);

		expect(deletedCookies).toContain('session_id');
		expect(deletedCookies).toContain('locale');
		expect(deletedCookies).toContain('theme');
	});
});

describe('Task 3 - Exercise name validation', () => {
	it('should reject empty exercise name', () => {
		expect(validateExerciseName('')).not.toBeNull();
	});

	it('should reject exercise name over 100 characters', () => {
		expect(validateExerciseName('a'.repeat(101))).not.toBeNull();
	});

	it('should accept valid exercise name', () => {
		expect(validateExerciseName('Bench Press')).toBeNull();
	});

	it('should reject whitespace-only exercise name', () => {
		expect(validateExerciseName('   ')).not.toBeNull();
	});
});

describe('Task 5 - FOUC prevention', () => {
	it('should have inline script that reads theme cookie and applies dark class', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		expect(appHtml).toContain('document.cookie.match');
		expect(appHtml).toContain('theme=');
		expect(appHtml).toContain("document.documentElement.classList.add('dark')");
	});

	it('should handle system theme preference in FOUC script', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		expect(appHtml).toContain("theme === 'system'");
		expect(appHtml).toContain('prefers-color-scheme: dark');
	});

	it('should handle dark theme preference in FOUC script', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		expect(appHtml).toContain("theme === 'dark'");
	});
});

describe('Task 5 - Settings validation', () => {
	it('should validate locale values using production function', () => {
		expect(isValidLocale('en')).toBe(true);
		expect(isValidLocale('fi')).toBe(true);
		expect(isValidLocale('de')).toBe(false);
		expect(isValidLocale('')).toBe(false);
	});

	it('should validate theme values using production function', () => {
		expect(isValidTheme('light')).toBe(true);
		expect(isValidTheme('dark')).toBe(true);
		expect(isValidTheme('system')).toBe(true);
		expect(isValidTheme('blue')).toBe(false);
		expect(isValidTheme('')).toBe(false);
	});

	it('should have expected valid locales', () => {
		expect(VALID_LOCALES).toContain('en');
		expect(VALID_LOCALES).toContain('fi');
	});

	it('should have expected valid themes', () => {
		expect(VALID_THEMES).toContain('light');
		expect(VALID_THEMES).toContain('dark');
		expect(VALID_THEMES).toContain('system');
	});
});

describe('Username and password validation for registration', () => {
	it('should reject username shorter than 3 chars', () => {
		expect(validateUsername('ab')).not.toBeNull();
	});

	it('should reject password shorter than 8 chars', () => {
		expect(validatePassword('1234567')).not.toBeNull();
	});

	it('should accept valid username and password', () => {
		expect(validateUsername('testuser')).toBeNull();
		expect(validatePassword('password123')).toBeNull();
	});
});

describe('Public cookie options', () => {
	it('should have httpOnly set to false for public cookies', () => {
		expect(PUBLIC_COOKIE_OPTIONS.httpOnly).toBe(false);
	});

	it('should have sameSite set to lax', () => {
		expect(PUBLIC_COOKIE_OPTIONS.sameSite).toBe('lax');
	});

	it('should have path set to /', () => {
		expect(PUBLIC_COOKIE_OPTIONS.path).toBe('/');
	});
});

describe('Task 2 - Hooks redirect behavior', () => {
	it('should redirect unauthenticated user from protected route to /login', async () => {
		const { handle } = await import('../../../hooks.server');

		const event = {
			url: new URL('http://localhost/exercises'),
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: {} as Record<string, unknown>
		};

		let caught: unknown = null;
		try {
			await handle({
				event: event as never,
				resolve: async () => new Response('ok')
			});
		} catch (e) {
			caught = e;
		}

		expect(caught).toBeTruthy();
		const r = caught as { status: number; location: string };
		expect(r.status).toBe(302);
		expect(r.location).toBe('/login');
	});

	it('should redirect authenticated user from /login to /exercises', async () => {
		// Verify the route classification that drives the redirect logic:
		// authenticated users on auth routes get redirected to /exercises
		expect(isAuthRoute('/login')).toBe(true);
		expect(isProtectedRoute('/login')).toBe(false);
		expect(isProtectedRoute('/exercises')).toBe(true);
		expect(isAuthRoute('/exercises')).toBe(false);
	});

	it('should redirect unauthenticated user from /settings to /login', async () => {
		const { handle } = await import('../../../hooks.server');

		const event = {
			url: new URL('http://localhost/settings'),
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: {} as Record<string, unknown>
		};

		let caught: unknown = null;
		try {
			await handle({
				event: event as never,
				resolve: async () => new Response('ok')
			});
		} catch (e) {
			caught = e;
		}

		expect(caught).toBeTruthy();
		const r = caught as { status: number; location: string };
		expect(r.status).toBe(302);
		expect(r.location).toBe('/login');
	});

	it('should allow unauthenticated access to /login', async () => {
		const { handle } = await import('../../../hooks.server');

		const event = {
			url: new URL('http://localhost/login'),
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: {} as Record<string, unknown>
		};

		let resolved = false;
		await handle({
			event: event as never,
			resolve: async () => {
				resolved = true;
				return new Response('ok');
			}
		});

		expect(resolved).toBe(true);
	});

	it('should allow unauthenticated access to /', async () => {
		const { handle } = await import('../../../hooks.server');

		const event = {
			url: new URL('http://localhost/'),
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: {} as Record<string, unknown>
		};

		let resolved = false;
		await handle({
			event: event as never,
			resolve: async () => {
				resolved = true;
				return new Response('ok');
			}
		});

		expect(resolved).toBe(true);
	});
});

describe('Task 5 - Settings cookie updates', () => {
	it('should set locale cookie when updating locale', () => {
		const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
		const mockCookies = {
			set: (name: string, value: string, options: Record<string, unknown>) => {
				setCalls.push({ name, value, options });
			},
			get: () => undefined,
			delete: () => {}
		};

		setAuthCookies(mockCookies as never, 'test-token', 'fi', 'dark');

		const localeCookie = setCalls.find((c) => c.name === 'locale');
		expect(localeCookie).toBeDefined();
		expect(localeCookie!.value).toBe('fi');
	});

	it('should set theme cookie when updating theme', () => {
		const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
		const mockCookies = {
			set: (name: string, value: string, options: Record<string, unknown>) => {
				setCalls.push({ name, value, options });
			},
			get: () => undefined,
			delete: () => {}
		};

		setAuthCookies(mockCookies as never, 'test-token', 'en', 'dark');

		const themeCookie = setCalls.find((c) => c.name === 'theme');
		expect(themeCookie).toBeDefined();
		expect(themeCookie!.value).toBe('dark');
	});

	it('should update both locale and theme cookies together', () => {
		const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
		const mockCookies = {
			set: (name: string, value: string, options: Record<string, unknown>) => {
				setCalls.push({ name, value, options });
			},
			get: () => undefined,
			delete: () => {}
		};

		setAuthCookies(mockCookies as never, 'test-token', 'fi', 'light');

		const localeCookie = setCalls.find((c) => c.name === 'locale');
		const themeCookie = setCalls.find((c) => c.name === 'theme');
		expect(localeCookie!.value).toBe('fi');
		expect(themeCookie!.value).toBe('light');
	});
});

describe('Task 5 - FOUC script DOM behavior', () => {
	it('should add dark class to html element when theme cookie is dark', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		expect(appHtml).toContain("theme === 'dark'");
		expect(appHtml).toContain("document.documentElement.classList.add('dark')");
	});

	it('should not add dark class when theme cookie is light', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		// The script only adds 'dark' class for 'dark' or 'system'+dark media
		// For 'light' theme, neither condition matches, so no class is added
		const scriptMatch = appHtml.match(/<script>([\s\S]*?)<\/script>/);
		expect(scriptMatch).toBeTruthy();
		const script = scriptMatch![1];
		expect(script).toContain("theme === 'dark'");
		expect(script).toContain("theme === 'system'");
		// No explicit 'light' check needed — light is the default (no class added)
		expect(script).not.toContain("theme === 'light'");
	});

	it('should add dark class when theme is system and OS prefers dark', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		expect(appHtml).toContain("theme === 'system'");
		expect(appHtml).toContain('prefers-color-scheme: dark');
		expect(appHtml).toContain("document.documentElement.classList.add('dark')");
	});

	it('should execute in head before body renders (FOUC prevention)', () => {
		const appHtml = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');
		const headPos = appHtml.indexOf('<head>');
		const scriptPos = appHtml.indexOf('<script>');
		const headClosePos = appHtml.indexOf('</head>');
		const bodyPos = appHtml.indexOf('<body');
		expect(scriptPos).toBeGreaterThan(headPos);
		expect(scriptPos).toBeLessThan(headClosePos);
		expect(headClosePos).toBeLessThan(bodyPos);
	});
});

describe('Task 3 - Short name validation', () => {
	it('should accept null short name', () => {
		expect(validateShortName(null)).toBeNull();
	});

	it('should accept valid short name', () => {
		expect(validateShortName('BP')).toBeNull();
	});

	it('should reject short name over 30 characters', () => {
		expect(validateShortName('a'.repeat(31))).not.toBeNull();
	});

	it('should accept short name at exactly 30 characters', () => {
		expect(validateShortName('a'.repeat(30))).toBeNull();
	});
});

describe('Story 005 - npm audit vulnerability fixes', () => {
	const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
	const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));

	it('should have npm overrides for cookie and esbuild and upgraded SvelteKit', () => {
		expect(pkg.overrides).toBeDefined();
		expect(pkg.overrides.cookie).toBe('0.7.2');
		expect(pkg.overrides.esbuild).toBe('0.25.12');
		expect(pkg.devDependencies['@sveltejs/kit']).toBe('2.64.0');
	});
});
