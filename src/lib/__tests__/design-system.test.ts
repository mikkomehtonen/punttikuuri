import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Design System Foundation', () => {
	describe('layout.css @theme tokens', () => {
		const css = fs.readFileSync(path.resolve('src/routes/layout.css'), 'utf-8');

		it('contains @theme block with --color-primary-50 through --color-primary-950', () => {
			expect(css).toContain('@theme');
			expect(css).toContain('--color-primary-50: #fffbeb');
			expect(css).toContain('--color-primary-100: #fef3c7');
			expect(css).toContain('--color-primary-200: #fde68a');
			expect(css).toContain('--color-primary-300: #fcd34d');
			expect(css).toContain('--color-primary-400: #fbbf24');
			expect(css).toContain('--color-primary-500: #f59e0b');
			expect(css).toContain('--color-primary-600: #d97706');
			expect(css).toContain('--color-primary-700: #b45309');
			expect(css).toContain('--color-primary-800: #92400e');
			expect(css).toContain('--color-primary-900: #78350f');
			expect(css).toContain('--color-primary-950: #451a03');
		});

		it('contains --font-sans override with Inter as the first font', () => {
			expect(css).toContain('--font-sans');
			expect(css).toContain("'Inter'");
		});
	});

	describe('app.html font loading', () => {
		const html = fs.readFileSync(path.resolve('src/app.html'), 'utf-8');

		it('contains a <link> tag loading Inter from fonts.googleapis.com with display=swap', () => {
			expect(html).toContain('fonts.googleapis.com');
			expect(html).toContain('Inter');
			expect(html).toContain('display=swap');
			expect(html).toContain('wght@400;500;600;700');
		});
	});

	describe('pwa-manifest.ts colors', () => {
		it('theme_color is #d97706', async () => {
			const { pwaManifest } = await import('$lib/pwa-manifest');
			expect(pwaManifest.theme_color).toBe('#d97706');
		});

		it('background_color is #fafaf9', async () => {
			const { pwaManifest } = await import('$lib/pwa-manifest');
			expect(pwaManifest.background_color).toBe('#fafaf9');
		});
	});

	describe('favicon.svg dumbbell icon', () => {
		const svg = fs.readFileSync(path.resolve('src/lib/assets/favicon.svg'), 'utf-8');

		it('contains three <rect> elements forming a dumbbell shape', () => {
			const rectMatches = svg.match(/<rect /g);
			expect(rectMatches).not.toBeNull();
			expect(rectMatches!.length).toBe(3);
		});

		it('uses fill="#d97706" or fill="#b45309"', () => {
			expect(svg).toContain('fill="#d97706"');
			expect(svg).toContain('fill="#b45309"');
		});
	});
});
