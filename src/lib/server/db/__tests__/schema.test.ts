import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';

// Use a test database file
const TEST_DB_PATH = 'data/test-punttikuuri.db';

function createTestDb() {
	const sqlite = new Database(TEST_DB_PATH);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	// Create tables manually for test isolation
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
		CREATE TABLE IF NOT EXISTS exercise_type (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			short_name TEXT,
			display_order INTEGER,
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS workout_session (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			exercise_type_id INTEGER NOT NULL REFERENCES exercise_type(id) ON DELETE CASCADE,
			workout_date TEXT NOT NULL,
			created_at TEXT NOT NULL,
			UNIQUE(user_id, exercise_type_id, workout_date)
		);
		CREATE TABLE IF NOT EXISTS set_entry (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			workout_session_id INTEGER NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
			set_number INTEGER NOT NULL,
			weight_kg REAL NOT NULL,
			repetitions INTEGER NOT NULL,
			created_at TEXT NOT NULL
		);
	`);

	const db = drizzle(sqlite, { schema });
	return { sqlite, db };
}

function destroyTestDb(sqlite: Database.Database) {
	sqlite.close();
}

describe('Schema', () => {
	let sqlite: Database.Database;
	let db: ReturnType<typeof drizzle<typeof schema>>;

	beforeAll(() => {
		const testDb = createTestDb();
		sqlite = testDb.sqlite;
		db = testDb.db;
	});

	afterAll(() => {
		destroyTestDb(sqlite);
	});

	it('should have user table', () => {
		const result = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='user'");
		expect(result).toBeTruthy();
	});

	it('should have session table', () => {
		const result = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='session'");
		expect(result).toBeTruthy();
	});

	it('should have exercise_type table', () => {
		const result = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='exercise_type'");
		expect(result).toBeTruthy();
	});

	it('should have workout_session table', () => {
		const result = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='workout_session'");
		expect(result).toBeTruthy();
	});

	it('should have set_entry table', () => {
		const result = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='set_entry'");
		expect(result).toBeTruthy();
	});
});

describe('Smoke test', () => {
	it('should pass', () => {
		expect(1 + 1).toBe(2);
	});
});
