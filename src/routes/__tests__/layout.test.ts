import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Layout from '../+layout.svelte';

function snippet(text: string) {
	return createRawSnippet(() => ({ render: () => text }));
}

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: null as { id: number; username: string; locale: 'en'; theme: 'system' } | null,
		logoLinkUrl: '',
		...overrides
	};
}

describe('Layout', () => {
	it('renders with bg-stone-50 class on the outer div', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('bg-stone-50');
	});

	it('renders with dark:bg-stone-900 class on the outer div', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('dark:bg-stone-900');
	});

	it('renders with font-sans class on the outer div', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('font-sans');
	});

	it('header renders with shadow-sm class', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('shadow-sm');
	});

	it('app name renders with text-primary-600 class', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('text-primary-600');
	});

	it('nav links render with text-stone-600 class when user is logged in', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({
					user: { id: 1, username: 'test', locale: 'en', theme: 'system' }
				}),
				children: snippet('content')
			}
		});
		expect(body).toContain('text-stone-600');
	});

	it('logout button renders as a Button with ghost variant', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({
					user: { id: 1, username: 'test', locale: 'en', theme: 'system' }
				}),
				children: snippet('content')
			}
		});
		expect(body).toContain('Logout');
		expect(body).toContain('text-stone-600');
	});
});

describe('Header responsive layout', () => {
	const responsiveClasses = [
		'flex-col',
		'items-center',
		'gap-2',
		'sm:flex-row',
		'sm:justify-between',
		'sm:gap-0'
	];

	it.each(responsiveClasses)('applies responsive class %s on the header div', (cls) => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain(cls);
	});

	it('renders all responsive classes when user is logged in', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({
					user: { id: 1, username: 'test', locale: 'en', theme: 'system' }
				}),
				children: snippet('content')
			}
		});
		for (const cls of responsiveClasses) {
			expect(body).toContain(cls);
		}
	});

	it('renders all responsive classes with Finnish locale', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ locale: 'fi' }),
				children: snippet('content')
			}
		});
		for (const cls of responsiveClasses) {
			expect(body).toContain(cls);
		}
	});
});

describe('Header logo', () => {
	function appNameLink(body: string) {
		const match = body.match(/<a[^>]*href="\/exercises"[^>]*>[\s\S]*?<\/a>/);
		expect(match).toBeTruthy();
		return match![0];
	}

	function logoLink(body: string, href: string) {
		const match = body.match(
			new RegExp(
				`<a[^>]*href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>[\\s\\S]*?<\\/a>`
			)
		);
		expect(match).toBeTruthy();
		return match![0];
	}

	it('wraps the favicon logo in a link when logoLinkUrl is set', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ logoLinkUrl: 'https://example.com' }),
				children: snippet('content')
			}
		});
		expect(logoLink(body, 'https://example.com')).toContain('<img src="/favicon.svg"');
	});

	it('wraps the favicon logo in a link for a relative logoLinkUrl', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ logoLinkUrl: '/some-page' }),
				children: snippet('content')
			}
		});
		expect(logoLink(body, '/some-page')).toContain('<img src="/favicon.svg"');
	});

	it('does not include the app name text inside the logo link', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ logoLinkUrl: 'https://example.com' }),
				children: snippet('content')
			}
		});
		expect(logoLink(body, 'https://example.com')).not.toContain('Punttikuuri');
	});

	it('renders the app name text in a separate link without the logo', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ logoLinkUrl: 'https://example.com' }),
				children: snippet('content')
			}
		});
		const linkHtml = appNameLink(body);
		expect(linkHtml).toContain('Punttikuuri');
		expect(linkHtml).not.toContain('<img');
	});

	it('does not add a target attribute to the logo link', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ logoLinkUrl: 'https://example.com' }),
				children: snippet('content')
			}
		});
		expect(logoLink(body, 'https://example.com')).not.toContain('target=');
	});

	it('renders the logo as a plain img when logoLinkUrl is empty', () => {
		const { body } = render(Layout, {
			props: { data: makeData({ logoLinkUrl: '' }), children: snippet('content') }
		});
		expect(body).toContain('<img src="/favicon.svg"');
		expect(body).not.toMatch(/<a[^>]*href="[^"]*"[^>]*>\s*<img src="\/favicon\.svg"/);
	});

	it('renders the logo as a plain img when logoLinkUrl is omitted', () => {
		const { body } = render(Layout, {
			props: { data: makeData({ logoLinkUrl: undefined }), children: snippet('content') }
		});
		expect(body).toContain('<img src="/favicon.svg"');
		expect(body).not.toMatch(/<a[^>]*href="[^"]*"[^>]*>\s*<img src="\/favicon\.svg"/);
	});

	it.each(['en', 'fi'] as const)(
		'still renders the app name text "Punttikuuri" with %s locale',
		(locale) => {
			const { body } = render(Layout, {
				props: { data: makeData({ locale }), children: snippet('content') }
			});
			expect(body).toContain('Punttikuuri');
		}
	);

	it('marks the logo image as decorative with an empty alt', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('<img src="/favicon.svg" alt="" class="h-7 w-7"');
	});

	it('preserves logo image attributes when wrapped in a link', () => {
		const { body } = render(Layout, {
			props: {
				data: makeData({ logoLinkUrl: 'https://example.com' }),
				children: snippet('content')
			}
		});
		expect(logoLink(body, 'https://example.com')).toContain(
			'<img src="/favicon.svg" alt="" class="h-7 w-7"'
		);
	});

	it('lays out the logo and title in a row inside the wrapper', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		const wrapperMatch = body.match(/<div[^>]*class="[^"]*inline-flex[^"]*"[^>]*>[\s\S]*?<\/div>/);
		expect(wrapperMatch).toBeTruthy();
		const wrapperHtml = wrapperMatch![0];
		expect(wrapperHtml).toContain('inline-flex');
		expect(wrapperHtml).toContain('items-center');
		expect(wrapperHtml).toContain('gap-2');
		expect(wrapperHtml).toContain('<img src="/favicon.svg"');
		expect(wrapperHtml).toContain('Punttikuuri');
	});

	it('sizes the logo image to match the title line height', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		expect(body).toContain('h-7');
		expect(body).toContain('w-7');
	});

	it('preserves the app name link styling and target', () => {
		const { body } = render(Layout, {
			props: { data: makeData(), children: snippet('content') }
		});
		const linkHtml = appNameLink(body);
		expect(linkHtml).toContain('text-xl');
		expect(linkHtml).toContain('font-bold');
		expect(linkHtml).toContain('text-primary-600');
		expect(linkHtml).toContain('dark:text-primary-400');
		expect(linkHtml).toContain('href="/exercises"');
	});
});

describe('layout.css', () => {
	it('configures Tailwind v4 class-based dark mode with @custom-variant', () => {
		const css = readFileSync(resolve(__dirname, '../layout.css'), 'utf-8');
		expect(css).toContain('@custom-variant dark (&:where(.dark, .dark *));');
	});

	it('places @custom-variant after @import and before @theme', () => {
		const css = readFileSync(resolve(__dirname, '../layout.css'), 'utf-8');
		const importIndex = css.indexOf("@import 'tailwindcss'");
		const variantIndex = css.indexOf('@custom-variant dark');
		const themeIndex = css.indexOf('@theme');
		expect(importIndex).toBeGreaterThanOrEqual(0);
		expect(variantIndex).toBeGreaterThan(importIndex);
		expect(themeIndex).toBeGreaterThan(variantIndex);
	});
});
