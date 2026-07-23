import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
	registerUser,
	loginUser,
	getSessionUser,
	deleteSession,
	validateUsername,
	validatePassword,
	listAllUsers,
	resetUserPassword
} from '../../auth';
import { createTestDb, destroyTestDb } from './test-utils';

const TEST_DB_PATH = 'data/test-auth.db';
let db: BetterSQLite3Database<typeof schema>;
let sqlite: Database.Database;

function cleanTables() {
	sqlite.exec('DELETE FROM session');
	sqlite.exec('DELETE FROM user');
}

beforeAll(() => {
	const testDb = createTestDb(TEST_DB_PATH);
	sqlite = testDb.sqlite;
	db = testDb.db;
});

afterAll(() => {
	destroyTestDb(sqlite, TEST_DB_PATH);
});

describe('validateUsername', () => {
	it('should accept valid usernames', () => {
		expect(validateUsername('testuser')).toBeNull();
		expect(validateUsername('abc')).toBeNull();
		expect(validateUsername('user_123')).toBeNull();
		expect(validateUsername('a_valid_username_here')).toBeNull();
	});

	it('should reject usernames shorter than 3 characters', () => {
		expect(validateUsername('ab')).not.toBeNull();
		expect(validateUsername('')).not.toBeNull();
	});

	it('should reject usernames longer than 30 characters', () => {
		expect(validateUsername('a'.repeat(31))).not.toBeNull();
	});

	it('should reject usernames with special characters', () => {
		expect(validateUsername('user name')).not.toBeNull();
		expect(validateUsername('user!name')).not.toBeNull();
		expect(validateUsername('user-name')).not.toBeNull();
	});
});

describe('validatePassword', () => {
	it('should accept passwords with 8+ characters', () => {
		expect(validatePassword('12345678')).toBeNull();
		expect(validatePassword('a'.repeat(20))).toBeNull();
	});

	it('should reject passwords shorter than 8 characters', () => {
		expect(validatePassword('1234567')).not.toBeNull();
		expect(validatePassword('')).not.toBeNull();
	});

	it('should reject passwords longer than 72 bytes (bcrypt limit)', () => {
		expect(validatePassword('a'.repeat(73))).not.toBeNull();
	});

	it('should accept passwords at exactly 72 bytes', () => {
		expect(validatePassword('a'.repeat(72))).toBeNull();
	});
});

describe('registerUser', () => {
	beforeEach(() => {
		cleanTables();
	});

	it('should create a user and session with valid credentials', () => {
		const result = registerUser({ username: 'valid_user', password: 'password123' }, db);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.user.username).toBe('valid_user');
			expect(result.user.locale).toBe('en');
			expect(result.user.theme).toBe('system');
			expect(result.sessionToken).toBeTruthy();
			expect(typeof result.sessionToken).toBe('string');

			const stored = db
				.select()
				.from(schema.user)
				.where(eq(schema.user.username, 'valid_user'))
				.get()!;
			expect(stored.password_hash).toMatch(/^\$2[aby]\$/);
			expect(bcrypt.compareSync('password123', stored.password_hash)).toBe(true);
		}
	});

	it('should reject short username', () => {
		const result = registerUser({ username: 'ab', password: 'password123' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.field).toBe('username');
		}
	});

	it('should reject short password', () => {
		const result = registerUser({ username: 'valid_user2', password: '1234567' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.field).toBe('password');
		}
	});

	it('should reject duplicate username', () => {
		const r1 = registerUser({ username: 'dupe_user', password: 'password123' }, db);
		expect(r1.ok).toBe(true);

		const usersBefore = db.select().from(schema.user).all().length;

		const r2 = registerUser({ username: 'dupe_user', password: 'password456' }, db);
		expect(r2.ok).toBe(false);
		if (!r2.ok) {
			expect(r2.field).toBe('username');
			expect(r2.error).toBe('Username already taken');
		}

		const usersAfter = db.select().from(schema.user).all().length;
		expect(usersAfter).toBe(usersBefore);
	});
});

describe('loginUser', () => {
	beforeEach(() => {
		cleanTables();
	});

	it('should login with valid credentials', () => {
		registerUser({ username: 'login_user', password: 'password123' }, db);

		const result = loginUser({ username: 'login_user', password: 'password123' }, db);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.user.username).toBe('login_user');
			expect(result.sessionToken).toBeTruthy();
		}
	});

	it('should reject invalid password', () => {
		registerUser({ username: 'login_user2', password: 'password123' }, db);

		const sessionsBefore = db.select().from(schema.session).all().length;

		const result = loginUser({ username: 'login_user2', password: 'wrongpassword' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Invalid username or password');
		}

		const sessionsAfter = db.select().from(schema.session).all().length;
		expect(sessionsAfter).toBe(sessionsBefore);
	});

	it('should reject non-existent username', () => {
		const result = loginUser({ username: 'nonexistent', password: 'password123' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Invalid username or password');
		}
	});

	it('should run bcrypt for non-existent users to prevent timing side-channel', () => {
		registerUser({ username: 'timing_user', password: 'password123' }, db);

		const startExisting = performance.now();
		loginUser({ username: 'timing_user', password: 'wrongpassword' }, db);
		const durationExisting = performance.now() - startExisting;

		const startNonExisting = performance.now();
		loginUser({ username: 'nonexistent_user', password: 'wrongpassword' }, db);
		const durationNonExisting = performance.now() - startNonExisting;

		// Both paths should take a similar amount of time (bcrypt is ~50-200ms).
		// The non-existing path should not be significantly faster.
		const ratio = durationNonExisting / durationExisting;
		expect(ratio).toBeGreaterThan(0.3);
	});
});

describe('getSessionUser', () => {
	beforeEach(() => {
		cleanTables();
	});

	it('should return user for valid session', () => {
		const regResult = registerUser({ username: 'session_user', password: 'password123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		const user = getSessionUser(regResult.sessionToken, db);
		expect(user).not.toBeNull();
		expect(user?.username).toBe('session_user');
	});

	it('should return null for invalid session', () => {
		const user = getSessionUser('nonexistent-session-id', db);
		expect(user).toBeNull();
	});
});

describe('deleteSession', () => {
	beforeEach(() => {
		cleanTables();
	});

	it('should delete session', () => {
		const regResult = registerUser({ username: 'delete_session', password: 'password123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		deleteSession(regResult.sessionToken, db);
		const user = getSessionUser(regResult.sessionToken, db);
		expect(user).toBeNull();
	});
});

describe('listAllUsers', () => {
	beforeEach(() => {
		cleanTables();
	});

	it('returns all users with id, username, and created_at', () => {
		registerUser({ username: 'user_one', password: 'password123' }, db);
		registerUser({ username: 'user_two', password: 'password456' }, db);

		const users = listAllUsers(db);

		expect(users).toHaveLength(2);
		expect(users.map((u) => u.username)).toContain('user_one');
		expect(users.map((u) => u.username)).toContain('user_two');
		for (const u of users) {
			expect(typeof u.id).toBe('number');
			expect(typeof u.username).toBe('string');
			expect(typeof u.created_at).toBe('string');
		}
	});

	it('does not return password_hash, locale, or theme', () => {
		registerUser({ username: 'secret_user', password: 'password123' }, db);

		const users = listAllUsers(db);
		expect(users).toHaveLength(1);
		const entry = users[0];
		expect(entry).not.toHaveProperty('password_hash');
		expect(entry).not.toHaveProperty('locale');
		expect(entry).not.toHaveProperty('theme');
	});

	it('returns empty array when no users exist', () => {
		const users = listAllUsers(db);
		expect(users).toHaveLength(0);
	});
});

describe('resetUserPassword', () => {
	beforeEach(() => {
		cleanTables();
	});

	it('returns ok true and user can login with new password', () => {
		registerUser({ username: 'reset_user', password: 'oldpassword123' }, db);

		const result = resetUserPassword({ username: 'reset_user', newPassword: 'newpassword123' }, db);
		expect(result.ok).toBe(true);

		const loginResult = loginUser({ username: 'reset_user', password: 'newpassword123' }, db);
		expect(loginResult.ok).toBe(true);
	});

	it('old password fails after reset', () => {
		registerUser({ username: 'old_pw_user', password: 'oldpassword123' }, db);

		const result = resetUserPassword(
			{ username: 'old_pw_user', newPassword: 'newpassword123' },
			db
		);
		expect(result.ok).toBe(true);

		const loginResult = loginUser({ username: 'old_pw_user', password: 'oldpassword123' }, db);
		expect(loginResult.ok).toBe(false);
	});

	it('invalidates all sessions for target user when no preserveSessionToken', () => {
		const regResult = registerUser({ username: 'session_reset', password: 'oldpassword123' }, db);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		const oldToken = regResult.sessionToken;

		resetUserPassword({ username: 'session_reset', newPassword: 'newpassword123' }, db);

		const user = getSessionUser(oldToken, db);
		expect(user).toBeNull();
	});

	it('preserves the specified session when preserveSessionToken is provided', () => {
		const regResult = registerUser(
			{ username: 'preserve_session', password: 'oldpassword123' },
			db
		);
		expect(regResult.ok).toBe(true);
		if (!regResult.ok) return;

		const oldToken = regResult.sessionToken;

		resetUserPassword(
			{
				username: 'preserve_session',
				newPassword: 'newpassword123',
				preserveSessionToken: oldToken
			},
			db
		);

		const user = getSessionUser(oldToken, db);
		expect(user).not.toBeNull();
		expect(user?.username).toBe('preserve_session');
	});

	it('preserves admin session when resetting another user', () => {
		const adminResult = registerUser({ username: 'admin', password: 'adminpassword123' }, db);
		expect(adminResult.ok).toBe(true);
		if (!adminResult.ok) return;

		const userResult = registerUser({ username: 'regular', password: 'userpassword123' }, db);
		expect(userResult.ok).toBe(true);
		if (!userResult.ok) return;

		const adminToken = adminResult.sessionToken;
		const userToken = userResult.sessionToken;

		resetUserPassword(
			{ username: 'regular', newPassword: 'newpassword123', preserveSessionToken: adminToken },
			db
		);

		// Admin session should still be valid
		const adminUser = getSessionUser(adminToken, db);
		expect(adminUser).not.toBeNull();
		expect(adminUser?.username).toBe('admin');

		// Regular user session should be invalidated
		const regularUser = getSessionUser(userToken, db);
		expect(regularUser).toBeNull();
	});

	it('returns error for short password', () => {
		const result = resetUserPassword({ username: 'anyuser', newPassword: '1234567' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Password must be at least 8 characters');
			expect(result.field).toBe('password');
		}
	});

	it('returns error for password too long', () => {
		const result = resetUserPassword({ username: 'anyuser', newPassword: 'a'.repeat(73) }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.field).toBe('password');
		}
	});

	it('returns error for nonexistent username', () => {
		const result = resetUserPassword({ username: 'nonexistent', newPassword: 'validpassword' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('User not found');
			expect(result.field).toBe('username');
		}
	});
});

// Keep a smoke test for CI verification
it('vitest smoke test should pass', () => {
	expect(1 + 1).toBe(2);
});
