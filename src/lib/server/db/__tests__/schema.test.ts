import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, destroyTestDb } from './test-utils';

const TEST_DB_PATH = 'data/test-punttikuuri.db';
let sqlite: Database.Database;

beforeAll(() => {
	const testDb = createTestDb(TEST_DB_PATH);
	sqlite = testDb.sqlite;
});

afterAll(() => {
	destroyTestDb(sqlite);
});

describe('Schema', () => {
	it('should have user table', () => {
		const result = sqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='user'");
		expect(result).toBeTruthy();
	});

	it('should have session table', () => {
		const result = sqlite.exec(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='session'"
		);
		expect(result).toBeTruthy();
	});

	it('should have exercise_type table', () => {
		const result = sqlite.exec(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='exercise_type'"
		);
		expect(result).toBeTruthy();
	});

	it('should have workout_session table', () => {
		const result = sqlite.exec(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='workout_session'"
		);
		expect(result).toBeTruthy();
	});

	it('should have set_entry table', () => {
		const result = sqlite.exec(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='set_entry'"
		);
		expect(result).toBeTruthy();
	});
});

describe('Smoke test', () => {
	it('should pass', () => {
		expect(1 + 1).toBe(2);
	});
});
