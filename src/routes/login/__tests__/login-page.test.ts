import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import LoginPage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: null,
		logoLinkUrl: '',
		...overrides
	};
}

describe('Login Page', () => {
	it('renders Input components for username and password', () => {
		const { body } = render(LoginPage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('name="username"');
		expect(body).toContain('name="password"');
		expect(body).toContain('Username');
		expect(body).toContain('Password');
	});

	it('renders submit Button with primary variant', () => {
		const { body } = render(LoginPage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('Login');
		expect(body).toContain('bg-primary-600');
	});

	it('renders error Alert when form?.error is present', () => {
		const { body } = render(LoginPage, {
			props: {
				data: makeData(),
				form: { error: 'Invalid username or password' }
			}
		});
		expect(body).toContain('Invalid username or password');
		expect(body).toContain('border-red-400');
	});
});
