import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTestDb, destroyTestDb, cleanAllTables } from './test-utils';
import { user, exerciseType } from '../schema';

const MIGRATIONS_DIR = path.resolve('drizzle');
const TEST_DB_PATH = 'data/test-exercise-icon-column.db';

function migrationFiles(dir = MIGRATIONS_DIR): string[] {
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.sql'))
		.sort();
}

describe('exercise_type.icon column', () => {
	let sqlite: Database.Database;
	let db: ReturnType<typeof createTestDb>['db'];
	let userId: number;

	beforeAll(() => {
		const testDb = createTestDb(TEST_DB_PATH);
		sqlite = testDb.sqlite;
		db = testDb.db;
	});

	afterAll(() => {
		destroyTestDb(sqlite, TEST_DB_PATH);
	});

	beforeEach(() => {
		cleanAllTables(sqlite);
		userId = db
			.insert(user)
			.values({
				username: 'icon_col_test',
				password_hash: 'hash',
				created_at: new Date().toISOString()
			})
			.returning()
			.get().id;
	});

	function insertExercise(name: string, values: Record<string, unknown>) {
		db.insert(exerciseType)
			.values({
				user_id: userId,
				name,
				kind: 'strength',
				created_at: '2026-01-01T00:00:00.000Z',
				...values
			})
			.run();
	}

	function getExercise(name: string) {
		return db.select().from(exerciseType).where(eq(exerciseType.name, name)).get();
	}

	it('persists NULL when an exercise is inserted without an icon', () => {
		insertExercise('No Icon', {});
		expect(getExercise('No Icon')?.icon).toBeNull();
	});

	it('persists the icon when an exercise is inserted with one', () => {
		insertExercise('Iconic', { icon: 'bike' });
		expect(getExercise('Iconic')?.icon).toBe('bike');
	});

	it('accepts a cross-kind icon with no kind/icon constraint', () => {
		insertExercise('Cardio Dumbbell', { icon: 'dumbbell', kind: 'cardio' });
		const row = getExercise('Cardio Dumbbell');
		expect(row?.kind).toBe('cardio');
		expect(row?.icon).toBe('dumbbell');
	});
});

describe('icon migration SQL', () => {
	// AC: the generated migration file on disk adds a bare nullable column.
	// drizzle-kit emits backticks; accept either quoting style.
	it('adds a bare nullable icon column with no NOT NULL, DEFAULT, or CHECK', () => {
		const iconFile = migrationFiles().find((f) =>
			/ADD [`"]icon[`"]/i.test(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8'))
		);
		expect(iconFile, 'a migration adding the icon column must exist').toBeDefined();

		const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, iconFile!), 'utf-8');
		const match = sql.match(/ALTER TABLE [`"]exercise_type[`"] ADD [`"]icon[`"][^;]*;/i);
		expect(match, 'the icon migration must ALTER exercise_type ADD icon').not.toBeNull();
		expect(match![0]).not.toMatch(/NOT NULL|DEFAULT|CHECK/i);
	});

	// AC: PRAGMA check against a DB migrated through the full ./drizzle journal
	// with the same drizzle-kit migrator that migrate.js uses.
	it('PRAGMA table_info shows icon nullable with no default after the full journal', () => {
		const sqlite = new Database(':memory:');
		const db = drizzle(sqlite);
		migrate(db, { migrationsFolder: MIGRATIONS_DIR });

		const columns = sqlite.pragma('table_info(exercise_type)') as Array<{
			name: string;
			notnull: number;
			dflt_value: string | null;
		}>;
		const icon = columns.find((c) => c.name === 'icon');
		expect(icon).toBeDefined();
		expect(icon!.notnull).toBe(0);
		expect(icon!.dflt_value).toBeNull();
		sqlite.close();
	});

	it('backfills existing rows to NULL when migrations are applied over a pre-migration schema', () => {
		// Stage a migrations folder without the icon migration, migrate through it,
		// insert a row, then apply the full journal — same migrator as migrate.js.
		const iconFile = migrationFiles().find((f) =>
			/ADD [`"]icon[`"]/i.test(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8'))
		);
		expect(iconFile).toBeDefined();
		const iconTag = iconFile!.replace(/\.sql$/, '');

		const stagedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-pre-icon-'));
		try {
			for (const file of migrationFiles()) {
				if (file !== iconFile) {
					fs.copyFileSync(path.join(MIGRATIONS_DIR, file), path.join(stagedDir, file));
				}
			}
			fs.mkdirSync(path.join(stagedDir, 'meta'));
			const journal = JSON.parse(
				fs.readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf-8')
			);
			journal.entries = journal.entries.filter((entry: { tag: string }) => entry.tag !== iconTag);
			fs.writeFileSync(
				path.join(stagedDir, 'meta', '_journal.json'),
				JSON.stringify(journal, null, '\t')
			);

			const sqlite = new Database(':memory:');
			const db = drizzle(sqlite);
			migrate(db, { migrationsFolder: stagedDir });

			sqlite
				.prepare(
					`INSERT INTO user (id, username, password_hash, locale, theme, created_at)
					 VALUES (1, 'legacy_user', 'x', 'en', 'system', '2025-01-01T00:00:00.000Z')`
				)
				.run();

			// Row created through the pre-migration schema (no icon column at all).
			sqlite
				.prepare(
					`INSERT INTO exercise_type (user_id, name, kind, created_at) VALUES (1, 'Legacy Row', 'strength', '2025-01-01T00:00:00.000Z')`
				)
				.run();

			migrate(db, { migrationsFolder: MIGRATIONS_DIR });

			const row = sqlite
				.prepare('SELECT icon FROM exercise_type WHERE name = ?')
				.get('Legacy Row') as { icon: string | null } | undefined;
			expect(row).toBeDefined();
			expect(row!.icon).toBeNull();
			sqlite.close();
		} finally {
			fs.rmSync(stagedDir, { recursive: true, force: true });
		}
	});
});
