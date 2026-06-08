import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';
import {
	registerUser,
	loginUser,
	getSessionUser,
	deleteSession,
	validateUsername,
	validatePassword
} from '../../auth';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

const TEST_DB_PATH = 'data/test-auth.db';
let db: BetterSQLite3Database<typeof schema>;
let sqlite: Database.Database;

function setupTables() {
	sqlite = new Database(TEST_DB_PATH);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS user (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			locale TEXT NOT NULL DEFAULT 'en',
			theme TEXT NOT NULL DEFAULT 'system',
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
	`);

	db = drizzle(sqlite, { schema });
}

function cleanTables() {
	sqlite.exec('DELETE FROM session');
	sqlite.exec('DELETE FROM user');
}

beforeAll(() => {
	setupTables();
});

afterAll(() => {
	sqlite.close();
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

		const r2 = registerUser({ username: 'dupe_user', password: 'password456' }, db);
		expect(r2.ok).toBe(false);
		if (!r2.ok) {
			expect(r2.field).toBe('username');
		}
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

		const result = loginUser({ username: 'login_user2', password: 'wrongpassword' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Invalid username or password');
		}
	});

	it('should reject non-existent username', () => {
		const result = loginUser({ username: 'nonexistent', password: 'password123' }, db);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Invalid username or password');
		}
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

// Keep a smoke test for CI verification
it('vitest smoke test should pass', () => {
	expect(1 + 1).toBe(2);
});
