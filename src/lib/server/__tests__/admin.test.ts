import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>
}));

vi.mock('$env/dynamic/private', () => ({
	get env() {
		return mockEnv;
	}
}));

import { getAdminUsernames, isAdminUsername } from '$lib/server/admin';

describe('getAdminUsernames', () => {
	beforeEach(() => {
		mockEnv.ADMIN_USERNAMES = undefined;
	});

	it('returns empty array when ADMIN_USERNAMES is unset', () => {
		expect(getAdminUsernames()).toEqual([]);
	});

	it('returns empty array when ADMIN_USERNAMES is empty string', () => {
		mockEnv.ADMIN_USERNAMES = '';
		expect(getAdminUsernames()).toEqual([]);
	});

	it('returns trimmed usernames', () => {
		mockEnv.ADMIN_USERNAMES = ' admin , bob ';
		expect(getAdminUsernames()).toEqual(['admin', 'bob']);
	});

	it('filters empty strings from consecutive commas', () => {
		mockEnv.ADMIN_USERNAMES = 'admin,,bob,';
		expect(getAdminUsernames()).toEqual(['admin', 'bob']);
	});

	it('returns single admin', () => {
		mockEnv.ADMIN_USERNAMES = 'admin';
		expect(getAdminUsernames()).toEqual(['admin']);
	});
});

describe('isAdminUsername', () => {
	beforeEach(() => {
		mockEnv.ADMIN_USERNAMES = undefined;
	});

	it('returns true when username is in ADMIN_USERNAMES', () => {
		mockEnv.ADMIN_USERNAMES = 'admin';
		expect(isAdminUsername('admin')).toBe(true);
	});

	it('returns true for second user in multi-value ADMIN_USERNAMES', () => {
		mockEnv.ADMIN_USERNAMES = 'admin,bob';
		expect(isAdminUsername('bob')).toBe(true);
	});

	it('returns false when username is not in ADMIN_USERNAMES', () => {
		mockEnv.ADMIN_USERNAMES = 'admin';
		expect(isAdminUsername('wife')).toBe(false);
	});

	it('returns false when ADMIN_USERNAMES is unset', () => {
		expect(isAdminUsername('admin')).toBe(false);
	});

	it('returns false when ADMIN_USERNAMES is empty string', () => {
		mockEnv.ADMIN_USERNAMES = '';
		expect(isAdminUsername('admin')).toBe(false);
	});

	it('is case-sensitive', () => {
		mockEnv.ADMIN_USERNAMES = 'admin';
		expect(isAdminUsername('Admin')).toBe(false);
	});
});
