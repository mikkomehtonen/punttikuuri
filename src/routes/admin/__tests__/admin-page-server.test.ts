import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockIsAdminUsername, mockListAllUsers, mockResetUserPassword } = vi.hoisted(() => ({
	mockIsAdminUsername: vi.fn(),
	mockListAllUsers: vi.fn(),
	mockResetUserPassword: vi.fn()
}));

vi.mock('$lib/server/admin', () => ({
	isAdminUsername: mockIsAdminUsername
}));

vi.mock('$lib/server/auth', () => ({
	listAllUsers: mockListAllUsers,
	resetUserPassword: mockResetUserPassword
}));

import * as page from '../+page.server';

function mockEvent(
	locals: { user: unknown; locale: string; theme: string },
	urlSearchParams?: Record<string, string>
) {
	const params = new URLSearchParams(urlSearchParams ?? {});
	return {
		locals,
		url: { searchParams: params }
	} as unknown as Parameters<typeof page.load>[0];
}

describe('admin page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects to /exercises when user is null', async () => {
		try {
			await page.load(mockEvent({ user: null, locale: 'en', theme: 'system' }));
			expect.unreachable('should have thrown');
		} catch (err: unknown) {
			expect(err).toHaveProperty('status', 302);
			expect(err).toHaveProperty('location', '/exercises');
		}
	});

	it('redirects to /exercises when user is not an admin', async () => {
		mockIsAdminUsername.mockReturnValue(false);
		try {
			await page.load(
				mockEvent({
					user: { id: 1, username: 'wife', locale: 'en', theme: 'system' },
					locale: 'en',
					theme: 'system'
				})
			);
			expect.unreachable('should have thrown');
		} catch (err: unknown) {
			expect(err).toHaveProperty('status', 302);
			expect(err).toHaveProperty('location', '/exercises');
		}
	});

	it('returns users list when user is an admin', async () => {
		mockIsAdminUsername.mockReturnValue(true);
		mockListAllUsers.mockReturnValue([
			{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' },
			{ id: 2, username: 'wife', created_at: '2025-01-02T00:00:00.000Z' }
		]);

		const result = await page.load(
			mockEvent({
				user: { id: 1, username: 'admin', locale: 'en', theme: 'system' },
				locale: 'en',
				theme: 'system'
			})
		);

		expect((result as { users: unknown }).users).toEqual([
			{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' },
			{ id: 2, username: 'wife', created_at: '2025-01-02T00:00:00.000Z' }
		]);
		expect((result as { resetUsername: unknown }).resetUsername).toBeNull();
	});

	it('returns resetUsername from query param', async () => {
		mockIsAdminUsername.mockReturnValue(true);
		mockListAllUsers.mockReturnValue([
			{ id: 1, username: 'admin', created_at: '2025-01-01T00:00:00.000Z' }
		]);

		const result = await page.load(
			mockEvent(
				{
					user: { id: 1, username: 'admin', locale: 'en', theme: 'system' },
					locale: 'en',
					theme: 'system'
				},
				{ reset: 'wife' }
			)
		);

		expect((result as { resetUsername: unknown }).resetUsername).toBe('wife');
	});
});

describe('admin page action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects to /exercises when user is null', async () => {
		try {
			await page.actions.default({
				locals: { user: null },
				request: { formData: async () => new FormData() },
				cookies: { get: () => undefined }
			} as unknown as Parameters<typeof page.actions.default>[0]);
			expect.unreachable('should have thrown');
		} catch (err: unknown) {
			expect(err).toHaveProperty('status', 302);
			expect(err).toHaveProperty('location', '/exercises');
		}
	});

	it('redirects to /exercises when user is not an admin', async () => {
		mockIsAdminUsername.mockReturnValue(false);
		try {
			await page.actions.default({
				locals: {
					user: { id: 1, username: 'wife', locale: 'en', theme: 'system' }
				},
				request: { formData: async () => new FormData() },
				cookies: { get: () => undefined }
			} as unknown as Parameters<typeof page.actions.default>[0]);
			expect.unreachable('should have thrown');
		} catch (err: unknown) {
			expect(err).toHaveProperty('status', 302);
			expect(err).toHaveProperty('location', '/exercises');
		}
	});

	it('redirects to /admin?reset=<username> on success', async () => {
		mockIsAdminUsername.mockReturnValue(true);
		mockResetUserPassword.mockReturnValue({ ok: true });

		const formData = new FormData();
		formData.set('username', 'wife');
		formData.set('password', 'newpassword123');

		try {
			await page.actions.default({
				locals: {
					user: { id: 1, username: 'admin', locale: 'en', theme: 'system' }
				},
				request: { formData: async () => formData },
				cookies: { get: () => 'admin-session-token' }
			} as unknown as Parameters<typeof page.actions.default>[0]);
			expect.unreachable('should have thrown');
		} catch (err: unknown) {
			expect(err).toHaveProperty('status', 303);
			expect(err).toHaveProperty('location', '/admin?reset=wife');
		}

		expect(mockResetUserPassword).toHaveBeenCalledWith({
			username: 'wife',
			newPassword: 'newpassword123',
			preserveSessionToken: 'admin-session-token'
		});
	});

	it('returns fail(400) on password validation error', async () => {
		mockIsAdminUsername.mockReturnValue(true);
		mockResetUserPassword.mockReturnValue({
			ok: false,
			error: 'Password must be at least 8 characters',
			field: 'password'
		});

		const formData = new FormData();
		formData.set('username', 'wife');
		formData.set('password', 'short');

		const result = await page.actions.default({
			locals: {
				user: { id: 1, username: 'admin', locale: 'en', theme: 'system' }
			},
			request: { formData: async () => formData },
			cookies: { get: () => 'admin-session-token' }
		} as unknown as Parameters<typeof page.actions.default>[0]);

		expect(result).toHaveProperty('status', 400);
		expect(result).toHaveProperty('data.error', 'Password must be at least 8 characters');
		expect(result).toHaveProperty('data.field', 'password');
	});
});
