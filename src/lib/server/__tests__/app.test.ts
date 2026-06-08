import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedRoute, isAuthRoute } from '../../../hooks.server';
import { validateWeight, validateReps } from '../workout-validation';

describe('Task 1 - Project Scaffolding & Database Setup', () => {
	it('should have data/*.db in .gitignore', () => {
		const gitignore = fs.readFileSync(path.resolve('.gitignore'), 'utf-8');
		expect(gitignore).toContain('data/*.db');
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
	it('should have manifest configuration in vite config', () => {
		const viteConfigContent = fs.readFileSync(path.resolve('vite.config.ts'), 'utf-8');
		expect(viteConfigContent).toContain("display: 'standalone'");
		expect(viteConfigContent).toContain('name:');
		expect(viteConfigContent).toContain('short_name:');
		expect(viteConfigContent).toContain('theme_color:');
		expect(viteConfigContent).toContain('background_color:');
		expect(viteConfigContent).toContain('start_url:');
		expect(viteConfigContent).toContain('icons:');
	});
});
