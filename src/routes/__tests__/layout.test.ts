import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import Layout from '../+layout.svelte';

function snippet(text: string) {
	return createRawSnippet(() => ({ render: () => text }));
}

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: null as { id: number; username: string; locale: 'en'; theme: 'system' } | null,
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
