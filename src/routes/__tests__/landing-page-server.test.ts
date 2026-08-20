import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import LandingPage from '../+page.svelte';
import { load } from '../+page.server';

const { mockGetSessionUser } = vi.hoisted(() => ({
	mockGetSessionUser: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
	isValidLocale: (value: string) => ['en', 'fi'].includes(value),
	isValidTheme: (value: string) => ['light', 'dark', 'system'].includes(value)
}));

import { handle } from '../../hooks.server';

const user = { id: 1, username: 'test', locale: 'en' as const, theme: 'system' as const };

function mockLoadEvent(locals: { user: unknown; locale: string; theme: string }) {
	return { locals } as unknown as Parameters<typeof load>[0];
}

function mockEvent(pathname: string, sessionCookie?: string) {
	const locals: Record<string, unknown> = {};
	return {
		url: new URL(`http://localhost${pathname}`),
		cookies: {
			get: (name: string) => (name === 'session_id' ? sessionCookie : undefined),
			set: () => {},
			delete: () => {}
		},
		locals
	};
}

describe('Story 016 - redirect authenticated users from root to exercises', () => {
	beforeEach(() => {
		mockGetSessionUser.mockReset();
	});

	describe('root +page.server load', () => {
		it('redirects authenticated user from / to /exercises with 303', () => {
			let caught: unknown = null;
			try {
				load(mockLoadEvent({ user, locale: 'en', theme: 'system' }));
			} catch (e) {
				caught = e;
			}

			expect(caught).toBeTruthy();
			const r = caught as { status: number; location: string };
			expect(r.status).toBe(303);
			expect(r.location).toBe('/exercises');
		});

		it('does not redirect unauthenticated user from /', () => {
			const result = load(mockLoadEvent({ user: null, locale: 'en', theme: 'system' }));
			expect(result).toBeUndefined();
		});

		it('renders root page with login and register buttons for unauthenticated user', () => {
			const { body } = render(LandingPage, {
				props: {
					data: {
						locale: 'en' as const,
						theme: 'system' as const,
						user: null,
						logoLinkUrl: '',
						isAdmin: false
					}
				}
			});
			expect(body).toContain('href="/login"');
			expect(body).toContain('href="/register"');
		});
	});

	describe('full request flow via hooks.server', () => {
		it('redirects authenticated user from / to /exercises (303, location /exercises)', async () => {
			mockGetSessionUser.mockReturnValue(user);
			const event = mockEvent('/', 'valid-session-token');

			let caught: unknown = null;
			try {
				await handle({
					event: event as never,
					resolve: async (ev) => {
						await load({ locals: ev.locals } as unknown as Parameters<typeof load>[0]);
						return new Response('ok');
					}
				});
			} catch (e) {
				caught = e;
			}

			expect(mockGetSessionUser).toHaveBeenCalledWith('valid-session-token');
			expect(caught).toBeTruthy();
			const r = caught as { status: number; location: string };
			expect(r.status).toBe(303);
			expect(r.location).toBe('/exercises');
		});

		it('renders root page for unauthenticated user after logout (no redirect)', async () => {
			const event = mockEvent('/');

			const response = await handle({
				event: event as never,
				resolve: async (ev) => {
					await load({ locals: ev.locals } as unknown as Parameters<typeof load>[0]);
					return new Response('ok');
				}
			});

			expect(event.locals.user).toBeNull();
			expect(response.status).toBe(200);
		});

		it('does not redirect authenticated user from /exercises (no double redirect)', async () => {
			mockGetSessionUser.mockReturnValue(user);
			const event = mockEvent('/exercises', 'valid-session-token');

			const response = await handle({
				event: event as never,
				resolve: async () => new Response('ok')
			});

			// hook must pass through to the exercises page (200), not redirect
			expect(response.status).toBe(200);
			expect(event.locals.user).toBe(user);
		});
	});
});
