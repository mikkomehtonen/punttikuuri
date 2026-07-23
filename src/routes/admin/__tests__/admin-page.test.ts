import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import AdminPage from '../+page.svelte';

function makeData(overrides: Record<string, unknown> = {}) {
	return {
		users: [] as Array<{ id: number; username: string; created_at: string }>,
		resetUsername: null as string | null,
		locale: 'en' as const,
		theme: 'system' as const,
		user: { id: 1, username: 'admin', locale: 'en' as const, theme: 'system' as const },
		logoLinkUrl: '',
		isAdmin: true,
		...overrides
	};
}

describe('Admin Page', () => {
	it('renders user list and form', () => {
		const { body } = render(AdminPage, {
			props: {
				data: makeData({
					users: [
						{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' },
						{ id: 2, username: 'wife', created_at: '2025-01-02T00:00:00.000Z' }
					]
				}),
				form: null
			}
		});

		expect(body).toContain('admin');
		expect(body).toContain('wife');
		expect(body).toContain('name="username"');
		expect(body).toContain('<option value="admin"');
		expect(body).toContain('<option value="wife"');
		expect(body).not.toContain('border-green-400');
		expect(body).not.toContain('border-red-400');
	});

	it('renders success alert when resetUsername is set', () => {
		const { body } = render(AdminPage, {
			props: {
				data: makeData({
					users: [{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' }],
					resetUsername: 'wife'
				}),
				form: null
			}
		});

		expect(body).toContain('border-green-400');
		expect(body).toContain('wife');
	});

	it('renders error alert for non-password errors', () => {
		const { body } = render(AdminPage, {
			props: {
				data: makeData({
					users: [{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' }],
					resetUsername: null
				}),
				form: { error: 'User not found', field: 'username' }
			}
		});

		expect(body).toContain('border-red-400');
		expect(body).toContain('User not found');
	});

	it('renders field-level error for password validation', () => {
		const { body } = render(AdminPage, {
			props: {
				data: makeData({
					users: [{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' }],
					resetUsername: null
				}),
				form: { error: 'Password must be at least 8 characters', field: 'password' }
			}
		});

		expect(body).toContain('Password must be at least 8 characters');
		expect(body).toContain('text-red-600');
	});

	it('renders Finnish translations when locale is fi', () => {
		const { body } = render(AdminPage, {
			props: {
				data: makeData({
					locale: 'fi',
					users: [{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' }]
				}),
				form: null
			}
		});

		expect(body).toContain('Ylläpito');
		expect(body).toContain('Käyttäjät');
		expect(body).toContain('Uusi salasana');
		expect(body).toContain('Nollaa salasana');
	});

	it('renders submit button with primary variant', () => {
		const { body } = render(AdminPage, {
			props: {
				data: makeData({
					users: [{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' }]
				}),
				form: null
			}
		});

		expect(body).toContain('bg-primary-600');
		expect(body).toContain('Reset password');
	});
});
