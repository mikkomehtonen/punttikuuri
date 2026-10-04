import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { createTestDb, destroyTestDb, cleanAllTables } from './test-utils';
import { user, exerciseType, workoutSession, cardioEntry } from '../schema';

const TEST_DB_PATH = 'data/test-cardio-schema.db';
let sqlite: Database.Database;
let db: ReturnType<typeof createTestDb>['db'];

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
});

function insertUser(): number {
	return db
		.insert(user)
		.values({
			username: 'cardio_schema_user',
			password_hash: 'hash',
			created_at: new Date().toISOString()
		})
		.returning()
		.get().id;
}

describe('cardio schema', () => {
	it('exercise_type has a kind column that is NOT NULL with default strength', () => {
		const columns = sqlite.prepare("PRAGMA table_info('exercise_type')").all() as Array<{
			name: string;
			notnull: number;
			dflt_value: string | null;
		}>;
		const kind = columns.find((c) => c.name === 'kind');
		expect(kind).toBeDefined();
		expect(kind!.notnull).toBe(1);
		expect(kind!.dflt_value).toBe("'strength'");
	});

	it('cardio_entry exists with the expected columns', () => {
		const columns = sqlite.prepare("PRAGMA table_info('cardio_entry')").all() as Array<{
			name: string;
		}>;
		const columnNames = columns.map((c) => c.name);
		expect(columnNames).toEqual(
			expect.arrayContaining([
				'id',
				'workout_session_id',
				'duration_seconds',
				'distance_m',
				'description',
				'created_at'
			])
		);
	});

	it('stores kind as strength when an exercise is inserted without kind', () => {
		const userId = insertUser();
		const inserted = db
			.insert(exerciseType)
			.values({ user_id: userId, name: 'Ski Erg', created_at: new Date().toISOString() })
			.returning()
			.get();

		const row = db.select().from(exerciseType).where(eq(exerciseType.id, inserted.id)).get();
		expect(row!.kind).toBe('strength');
	});

	it('rejects unknown kind values at the database level (kind_chk CHECK)', () => {
		const userId = insertUser();
		expect(() =>
			sqlite
				.prepare(
					"INSERT INTO exercise_type (user_id, name, kind, created_at) VALUES (?, 'Bogus', 'Cardio', ?)"
				)
				.run(userId, new Date().toISOString())
		).toThrow(/kind_chk/);
	});

	it('round-trips a cardio entry with duration only (null distance and description)', () => {
		const userId = insertUser();
		const exercise = db
			.insert(exerciseType)
			.values({
				user_id: userId,
				name: 'Running',
				kind: 'cardio',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();
		expect(exercise.kind).toBe('cardio');

		const session = db
			.insert(workoutSession)
			.values({
				user_id: userId,
				exercise_type_id: exercise.id,
				workout_date: '2026-08-19',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		const entry = db
			.insert(cardioEntry)
			.values({
				workout_session_id: session.id,
				duration_seconds: 1530,
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		const stored = db.select().from(cardioEntry).where(eq(cardioEntry.id, entry.id)).get();
		expect(stored!.duration_seconds).toBe(1530);
		expect(stored!.distance_m).toBeNull();
		expect(stored!.description).toBeNull();
	});

	it('cascade-deletes cardio entries when the parent workout session is deleted', () => {
		const userId = insertUser();
		const exercise = db
			.insert(exerciseType)
			.values({
				user_id: userId,
				name: 'Running',
				kind: 'cardio',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		const session = db
			.insert(workoutSession)
			.values({
				user_id: userId,
				exercise_type_id: exercise.id,
				workout_date: '2026-08-19',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		const entry = db
			.insert(cardioEntry)
			.values({
				workout_session_id: session.id,
				duration_seconds: 600,
				distance_m: 5000,
				description: 'Easy jog',
				created_at: new Date().toISOString()
			})
			.returning()
			.get();

		sqlite.prepare('DELETE FROM workout_session WHERE id = ?').run(session.id);

		const remaining = db.select().from(cardioEntry).where(eq(cardioEntry.id, entry.id)).get();
		expect(remaining).toBeUndefined();
	});
});
