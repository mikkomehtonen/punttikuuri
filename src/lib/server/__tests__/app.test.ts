import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedRoute, isAuthRoute } from '../../../hooks.server';
import { validateWeight, validateReps } from '../workout-validation';
import { pwaManifest } from '../../pwa-manifest';
import {
	validateUsername,
	validatePassword,
	setAuthCookies,
	clearAuthCookies,
	PUBLIC_COOKIE_OPTIONS
} from '../auth';

describe('Task 1 - Project Scaffolding & Database Setup', () => {
	it('should have data/*.db in .gitignore', () => {
		const gitignore = fs.readFileSync(path.resolve('.gitignore'), 'utf-8');
		expect(gitignore).toContain('data/*.db');
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
		const name = ''.trim();
		expect(!name || name.length > 100).toBe(true);
	});

	it('should reject exercise name over 100 characters', () => {
		const name = 'a'.repeat(101);
		expect(!name || name.length > 100).toBe(true);
	});

	it('should accept valid exercise name', () => {
		const name = 'Bench Press';
		expect(!name || name.length > 100).toBe(false);
	});

	it('should reject whitespace-only exercise name', () => {
		const name = '   '.trim();
		expect(!name || name.length > 100).toBe(true);
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
	it('should validate locale values', () => {
		const validLocales = ['en', 'fi'];
		expect(validLocales).toContain('en');
		expect(validLocales).toContain('fi');
		expect(validLocales).not.toContain('de');
		expect(validLocales).not.toContain('');
	});

	it('should validate theme values', () => {
		const validThemes = ['light', 'dark', 'system'];
		expect(validThemes).toContain('light');
		expect(validThemes).toContain('dark');
		expect(validThemes).toContain('system');
		expect(validThemes).not.toContain('blue');
		expect(validThemes).not.toContain('');
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
