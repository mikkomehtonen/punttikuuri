import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Layout from '../+layout.svelte';

function snippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
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

type ChangeListener = (e: MediaQueryListEvent) => void;

function createMatchMediaMock(prefersDark: boolean) {
	const listeners: ChangeListener[] = [];
	return {
		matches: prefersDark,
		addEventListener: vi.fn((_: string, fn: ChangeListener) => {
			listeners.push(fn);
		}),
		removeEventListener: vi.fn((_: string, fn: ChangeListener) => {
			const idx = listeners.indexOf(fn);
			if (idx >= 0) listeners.splice(idx, 1);
		}),
		fireChange(newMatches: boolean) {
			this.matches = newMatches;
			for (const fn of listeners) {
				fn({ matches: newMatches } as MediaQueryListEvent);
			}
		}
	};
}

describe('Layout theme $effect', () => {
	let matchMediaMock: ReturnType<typeof createMatchMediaMock>;

	beforeEach(() => {
		document.documentElement.classList.remove('dark');
		matchMediaMock = createMatchMediaMock(false);
		window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.documentElement.classList.remove('dark');
	});

	it('adds dark class when theme is dark', async () => {
		render(Layout, {
			props: { data: makeData({ theme: 'dark' }), children: snippet('content') }
		});
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('removes dark class when theme is light', async () => {
		document.documentElement.classList.add('dark');
		render(Layout, {
			props: { data: makeData({ theme: 'light' }), children: snippet('content') }
		});
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('adds dark class when theme is system and OS prefers dark', async () => {
		matchMediaMock = createMatchMediaMock(true);
		window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);

		render(Layout, {
			props: { data: makeData({ theme: 'system' }), children: snippet('content') }
		});
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('removes dark class when theme is system and OS prefers light', async () => {
		document.documentElement.classList.add('dark');
		matchMediaMock = createMatchMediaMock(false);
		window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);

		render(Layout, {
			props: { data: makeData({ theme: 'system' }), children: snippet('content') }
		});
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('updates dark class when OS preference changes while theme is system', async () => {
		matchMediaMock = createMatchMediaMock(false);
		window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);

		render(Layout, {
			props: { data: makeData({ theme: 'system' }), children: snippet('content') }
		});
		expect(document.documentElement.classList.contains('dark')).toBe(false);

		matchMediaMock.fireChange(true);
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('removes dark class when theme changes from dark to light', async () => {
		const { rerender } = render(Layout, {
			props: { data: makeData({ theme: 'dark' }), children: snippet('content') }
		});
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		await rerender({ data: makeData({ theme: 'light' }), children: snippet('content') });
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('cleans up matchMedia listener when theme changes away from system', async () => {
		matchMediaMock = createMatchMediaMock(false);
		window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);

		const { rerender } = render(Layout, {
			props: { data: makeData({ theme: 'system' }), children: snippet('content') }
		});
		expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

		await rerender({ data: makeData({ theme: 'light' }), children: snippet('content') });
		expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
	});
});
