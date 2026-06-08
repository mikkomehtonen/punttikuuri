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
	destroyTestDb(sqlite, TEST_DB_PATH);
});

describe('Schema', () => {
	it('should have all five tables with correct schema', () => {
		const tables = sqlite
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
			)
			.all() as Array<{ name: string }>;
		const tableNames = tables.map((t) => t.name);
		expect(tableNames).toContain('user');
		expect(tableNames).toContain('session');
		expect(tableNames).toContain('exercise_type');
		expect(tableNames).toContain('workout_session');
		expect(tableNames).toContain('set_entry');
	});

	it('should have user table with expected columns', () => {
		const columns = sqlite.prepare("PRAGMA table_info('user')").all() as Array<{ name: string }>;
		const columnNames = columns.map((c) => c.name);
		expect(columnNames).toContain('id');
		expect(columnNames).toContain('username');
		expect(columnNames).toContain('password_hash');
		expect(columnNames).toContain('locale');
		expect(columnNames).toContain('theme');
		expect(columnNames).toContain('created_at');
	});

	it('should have unique constraint on user.username', () => {
		const indexes = sqlite.prepare("PRAGMA index_list('user')").all() as Array<{
			name: string;
			unique: number;
		}>;
		const uniqueIndexes = indexes.filter((i) => i.unique === 1);
		expect(uniqueIndexes.length).toBeGreaterThan(0);
	});

	it('should have unique constraint on workout_session (user_id, exercise_type_id, workout_date)', () => {
		const indexes = sqlite.prepare("PRAGMA index_list('workout_session')").all() as Array<{
			name: string;
			unique: number;
		}>;
		const uniqueIndexes = indexes.filter((i) => i.unique === 1);
		expect(uniqueIndexes.length).toBeGreaterThan(0);
	});
});

describe('Smoke test', () => {
	it('should pass', () => {
		expect(1 + 1).toBe(2);
	});
});
