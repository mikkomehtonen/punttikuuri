import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function createDb(dbPath: string = 'data/punttikuuri.db') {
	const sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	return drizzle(sqlite, { schema });
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
	if (!_db) {
		_db = createDb();
	}
	return _db;
}

export const db = getDb();
