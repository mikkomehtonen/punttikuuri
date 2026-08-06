import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from '../schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

function loadMigrationSql(): string {
	const migrationsDir = path.resolve('drizzle');
	const migrationFiles = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	return migrationFiles
		.map((file) => {
			const raw = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
			return raw
				.split('--> statement-breakpoint')
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
				.join(';\n');
		})
		.join(';\n');
}

export function createTestDb(dbPath: string): {
	sqlite: Database.Database;
	db: BetterSQLite3Database<typeof schema>;
} {
	for (const suffix of ['', '-wal', '-shm', '-journal']) {
		const filePath = dbPath + suffix;
		try {
			fs.unlinkSync(filePath);
		} catch {
			// file may not exist, ignore
		}
	}
	const sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const migrationSql = loadMigrationSql();
	sqlite.exec(migrationSql);
	const db = drizzle(sqlite, { schema });
	return { sqlite, db };
}

export function destroyTestDb(sqlite: Database.Database, dbPath: string): void {
	sqlite.close();
	for (const suffix of ['', '-wal', '-shm', '-journal']) {
		const filePath = dbPath + suffix;
		try {
			fs.unlinkSync(filePath);
		} catch {
			// file may not exist, ignore
		}
	}
}

export function cleanAllTables(sqlite: Database.Database): void {
	sqlite.exec('DELETE FROM set_entry');
	sqlite.exec('DELETE FROM workout_session');
	sqlite.exec('DELETE FROM exercise_type');
	sqlite.exec('DELETE FROM session');
	sqlite.exec('DELETE FROM user');
}
