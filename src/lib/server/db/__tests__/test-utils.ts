import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

const CREATE_TABLES_SQL = `
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
`;

export function createTestDb(dbPath: string): {
	sqlite: Database.Database;
	db: BetterSQLite3Database<typeof schema>;
} {
	const sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.exec(CREATE_TABLES_SQL);
	const db = drizzle(sqlite, { schema });
	return { sqlite, db };
}

export function destroyTestDb(sqlite: Database.Database): void {
	sqlite.close();
}

export function cleanAllTables(sqlite: Database.Database): void {
	sqlite.exec('DELETE FROM set_entry');
	sqlite.exec('DELETE FROM workout_session');
	sqlite.exec('DELETE FROM exercise_type');
	sqlite.exec('DELETE FROM session');
	sqlite.exec('DELETE FROM user');
}
