import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import RegisterPage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		locale: 'en' as const,
		theme: 'system' as const,
		user: null,
		...overrides
	};
}

describe('Register Page', () => {
	it('renders Input components for username and password', () => {
		const { body } = render(RegisterPage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('name="username"');
		expect(body).toContain('name="password"');
		expect(body).toContain('Username');
		expect(body).toContain('Password');
	});

	it('renders field-level error text when form?.field is username and form?.error is present', () => {
		const { body } = render(RegisterPage, {
			props: {
				data: makeData(),
				form: { error: 'Username already taken', field: 'username' }
			}
		});
		expect(body).toContain('Username already taken');
		expect(body).toContain('text-red-600');
	});

	it('renders submit Button with primary variant', () => {
		const { body } = render(RegisterPage, {
			props: { data: makeData(), form: null }
		});
		expect(body).toContain('Register');
		expect(body).toContain('bg-primary-600');
	});
});
