import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>
}));

vi.mock('$env/dynamic/public', () => ({
	get env() {
		return mockEnv;
	}
}));

import { load } from '../+layout.server';

function mockEvent(locals: { user: unknown; locale: string; theme: string }) {
	return { locals } as unknown as Parameters<typeof load>[0];
}

describe('+layout.server load', () => {
	beforeEach(() => {
		mockEnv.PUBLIC_LOGO_LINK_URL = undefined;
	});

	it.each([
		{
			envValue: 'https://example.com' as const,
			expected: 'https://example.com' as const,
			description: 'an external URL'
		},
		{
			envValue: '/some-internal-page' as const,
			expected: '/some-internal-page' as const,
			description: 'a relative URL'
		},
		{ envValue: '' as const, expected: '' as const, description: 'empty' },
		{ envValue: undefined, expected: '' as const, description: 'unset' }
	])(
		'returns logoLinkUrl $expected when PUBLIC_LOGO_LINK_URL is $description',
		async ({ envValue, expected }) => {
			if (envValue === undefined) {
				delete mockEnv.PUBLIC_LOGO_LINK_URL;
			} else {
				mockEnv.PUBLIC_LOGO_LINK_URL = envValue;
			}
			const result = await load(
				mockEvent({
					user: null,
					locale: 'en',
					theme: 'system'
				})
			);
			expect(result.logoLinkUrl).toBe(expected);
		}
	);

	it('still returns user, locale, and theme from locals', async () => {
		mockEnv.PUBLIC_LOGO_LINK_URL = 'https://example.com';
		const user = { id: 1, username: 'test', locale: 'fi' as const, theme: 'dark' as const };
		const result = await load(
			mockEvent({
				user,
				locale: 'fi',
				theme: 'dark'
			})
		);
		expect(result.user).toBe(user);
		expect(result.locale).toBe('fi');
		expect(result.theme).toBe('dark');
		expect(result.logoLinkUrl).toBe('https://example.com');
	});
});
